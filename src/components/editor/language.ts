import { html } from '@codemirror/lang-html'
import { css } from '@codemirror/lang-css'
import { javascript } from '@codemirror/lang-javascript'
import type { Extension } from '@codemirror/state'
import { languageFromFilename } from '../../types/project'

export function languageExtension(filename: string): {
  lang: ReturnType<typeof languageFromFilename>
  ext: Extension
} {
  const lang = languageFromFilename(filename)
  if (lang === 'html') return { lang, ext: html() }
  if (lang === 'css') return { lang, ext: css() }
  if (lang === 'javascript') return { lang, ext: javascript() }
  return { lang, ext: [] }
}
