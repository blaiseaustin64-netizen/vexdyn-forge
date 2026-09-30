/**
 * Lightweight Emmet-style expansion for HTML.
 * Uses @emmetio/abbreviation when available; falls back to simple patterns.
 */

import { EditorView, keymap } from '@codemirror/view'
import type { Extension } from '@codemirror/state'

function expandSimple(abbr: string): string | null {
  const trimmed = abbr.trim()
  if (!trimmed || /\s/.test(trimmed)) return null

  // ul>li*3
  const childMul = trimmed.match(/^([a-zA-Z][\w-]*)>([a-zA-Z][\w-]*)\*(\d+)$/)
  if (childMul) {
    const [, parent, child, n] = childMul
    const count = Math.min(parseInt(n, 10), 50)
    const kids = Array.from({ length: count }, () => `  <${child}></${child}>`).join('\n')
    return `<${parent}>\n${kids}\n</${parent}>`
  }

  // tag.class#id
  const m = trimmed.match(/^([a-zA-Z][\w-]*)?(?:\.([\w-]+))?(?:#([\w-]+))?(?:\[([^\]]+)\])?$/)
  if (!m) return null
  let [, tag, cls, id, attrs] = m
  tag = tag || 'div'
  const selfClosing = ['img', 'input', 'br', 'hr', 'meta', 'link'].includes(tag)
  const attrParts: string[] = []
  if (cls) attrParts.push(`class="${cls}"`)
  if (id) attrParts.push(`id="${id}"`)
  if (attrs) {
    // key=value or bare
    for (const part of attrs.split(/\s+/)) {
      if (part.includes('=')) {
        const [k, v] = part.split('=')
        attrParts.push(`${k}="${v.replace(/^["']|["']$/g, '')}"`)
      } else if (part) {
        attrParts.push(part)
      }
    }
  }
  const attrStr = attrParts.length ? ' ' + attrParts.join(' ') : ''
  if (selfClosing) return `<${tag}${attrStr} />`
  return `<${tag}${attrStr}></${tag}>`
}

async function expandWithEmmetio(abbr: string): Promise<string | null> {
  try {
    const mod = await import('@emmetio/abbreviation')
    const parse = mod.parseAbbreviation ?? mod.default?.parseAbbreviation ?? mod.default
    if (typeof parse !== 'function') return expandSimple(abbr)
    const tree = parse(abbr)
    // Minimal stringify for element trees
    function stringify(node: {
      name?: string
      attributes?: { name: string; value?: string | null }[]
      children?: unknown[]
      selfClosing?: boolean
    }): string {
      if (!node.name) {
        return (node.children as typeof node[] | undefined)?.map(stringify).join('') ?? ''
      }
      const attrs = (node.attributes ?? [])
        .map((a) =>
          a.value != null && a.value !== ''
            ? ` ${a.name}="${a.value}"`
            : ` ${a.name}`
        )
        .join('')
      const self =
        node.selfClosing ||
        ['img', 'input', 'br', 'hr', 'meta', 'link'].includes(node.name)
      if (self) return `<${node.name}${attrs} />`
      const kids = ((node.children as typeof node[]) ?? []).map(stringify).join('')
      return `<${node.name}${attrs}>${kids}</${node.name}>`
    }
    return stringify(tree as Parameters<typeof stringify>[0])
  } catch {
    return expandSimple(abbr)
  }
}

function wordBefore(view: EditorView): { from: number; to: number; text: string } | null {
  const pos = view.state.selection.main.head
  const line = view.state.doc.lineAt(pos)
  const textBefore = line.text.slice(0, pos - line.from)
  const match = textBefore.match(/([a-zA-Z][\w-]*(?:[.#][\w-]+)*(?:\[[^\]]*\])?(?:>[a-zA-Z][\w-]*\*\d+)?)$/)
  if (!match) return null
  const text = match[1]
  return { from: pos - text.length, to: pos, text }
}

export function emmetExtension(enabled: boolean): Extension {
  if (!enabled) return []

  return keymap.of([
    {
      key: 'Tab',
      run: (view) => {
        const w = wordBefore(view)
        if (!w) return false
        // Prefer sync simple expand for responsiveness
        const expanded = expandSimple(w.text)
        if (!expanded) {
          // try async path without blocking — skip
          return false
        }
        view.dispatch({
          changes: { from: w.from, to: w.to, insert: expanded },
          selection: { anchor: w.from + expanded.length },
        })
        return true
      },
    },
  ])
}

export { expandSimple, expandWithEmmetio }
