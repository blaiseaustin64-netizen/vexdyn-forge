/**
 * Lightweight client-side diagnostics.
 * Can be extended with real linters / language servers later.
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

    // Unmatched braces (very rough)
    let brace = 0
    lines.forEach((line, i) => {
      for (const ch of line) {
        if (ch === '{') brace++
        if (ch === '}') brace--
      }
      if (brace < 0) {
        diags.push({
          id: `${f.id}-brace-${i}`,
          fileId: f.id,
          path: f.path,
          message: 'Possible unmatched closing brace',
          severity: 'warning',
          line: i + 1,
          source: 'forge',
        })
        brace = 0
      }
    })

    // Empty script/style tags hint
    if (f.path.endsWith('.html') && /<script[^>]*>\s*<\/script>/.test(f.content)) {
      diags.push({
        id: `${f.id}-empty-script`,
        fileId: f.id,
        path: f.path,
        message: 'Empty script tag found',
        severity: 'info',
        source: 'forge',
      })
    }
  }
  store.set(projectId, diags)
  return diags
}
