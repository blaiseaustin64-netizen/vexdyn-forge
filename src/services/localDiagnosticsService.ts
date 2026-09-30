/**
 * Lightweight client-side diagnostics.
 * Architecture ready for ESLint/TS/build diagnostics later.
 */

import type { Diagnostic, DiagnosticsService } from './types'

const store = new Map<string, Diagnostic[]>()

export const localDiagnosticsService: DiagnosticsService = {
  getForProject(projectId) {
    return store.get(projectId) ?? []
  },

  getForFile(projectId, fileId) {
    return (store.get(projectId) ?? []).filter((d) => d.fileId === fileId)
  },

  clear(projectId) {
    store.delete(projectId)
  },
}

/** Simple heuristic checks — not a full linter */
export function runBasicDiagnostics(
  projectId: string,
  files: { id: string; path: string; content?: string; kind: string }[]
): Diagnostic[] {
  const diags: Diagnostic[] = []
  for (const f of files) {
    if (f.kind !== 'file' || f.content == null) continue
    const lines = f.content.split('\n')

    let brace = 0
    lines.forEach((line, i) => {
      for (let c = 0; c < line.length; c++) {
        const ch = line[c]
        if (ch === '{') brace++
        if (ch === '}') {
          brace--
          if (brace < 0) {
            diags.push({
              id: `${f.id}-brace-${i}-${c}`,
              fileId: f.id,
              path: f.path,
              message: 'Possible unmatched closing brace',
              severity: 'warning',
              line: i + 1,
              column: c + 1,
              source: 'forge',
            })
            brace = 0
          }
        }
      }
    })

    if (f.path.endsWith('.html') && /<script[^>]*>\s*<\/script>/.test(f.content)) {
      const idx = f.content.search(/<script[^>]*>\s*<\/script>/)
      const line = f.content.slice(0, idx).split('\n').length
      diags.push({
        id: `${f.id}-empty-script`,
        fileId: f.id,
        path: f.path,
        message: 'Empty script tag found',
        severity: 'info',
        line,
        column: 1,
        source: 'forge',
      })
    }

    // Unclosed HTML tags (very light heuristic for common tags)
    if (f.path.endsWith('.html') || f.path.endsWith('.htm')) {
      for (const tag of ['div', 'section', 'main', 'header', 'footer', 'nav', 'form']) {
        const open = (f.content.match(new RegExp(`<${tag}(?:\\s|>)`, 'gi')) || []).length
        const close = (f.content.match(new RegExp(`</${tag}>`, 'gi')) || []).length
        if (open > close) {
          diags.push({
            id: `${f.id}-unclosed-${tag}`,
            fileId: f.id,
            path: f.path,
            message: `Possible unclosed <${tag}> tag (${open} open, ${close} close)`,
            severity: 'warning',
            source: 'forge',
          })
        }
      }
    }

    // JSON parse check
    if (f.path.endsWith('.json') && f.content.trim()) {
      try {
        JSON.parse(f.content)
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Invalid JSON'
        const lineMatch = msg.match(/line (\d+)/i)
        diags.push({
          id: `${f.id}-json`,
          fileId: f.id,
          path: f.path,
          message: msg,
          severity: 'error',
          line: lineMatch ? parseInt(lineMatch[1], 10) : 1,
          column: 1,
          source: 'forge',
        })
      }
    }
  }
  store.set(projectId, diags)
  return diags
}
