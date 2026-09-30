/**
 * Language extensions for CodeMirror 6.
 * Supports major web languages; architecture ready for more.
 */

import { html } from '@codemirror/lang-html'
import { css } from '@codemirror/lang-css'
import { javascript } from '@codemirror/lang-javascript'
import { json } from '@codemirror/lang-json'
import { markdown } from '@codemirror/lang-markdown'
import { python } from '@codemirror/lang-python'
import { sql } from '@codemirror/lang-sql'
import type { Extension } from '@codemirror/state'
import { languageFromFilename, type EditorLanguage } from '../../types/project'

export function languageExtension(filename: string): {
  lang: EditorLanguage
  ext: Extension
} {
  const lang = languageFromFilename(filename)

  switch (lang) {
    case 'html':
    case 'svg':
      return { lang, ext: html({ selfClosingTags: true }) }
    case 'css':
      return { lang, ext: css() }
    case 'javascript':
      return { lang, ext: javascript({ jsx: false, typescript: false }) }
    case 'jsx':
      return { lang, ext: javascript({ jsx: true, typescript: false }) }
    case 'typescript':
      return { lang, ext: javascript({ jsx: false, typescript: true }) }
    case 'tsx':
      return { lang, ext: javascript({ jsx: true, typescript: true }) }
    case 'json':
      return { lang, ext: json() }
    case 'markdown':
      return { lang, ext: markdown() }
    case 'python':
      return { lang, ext: python() }
    case 'sql':
      return { lang, ext: sql() }
    case 'yaml':
    case 'bash':
    case 'text':
    default:
      return { lang, ext: [] }
  }
}
