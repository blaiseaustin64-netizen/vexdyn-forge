/**
 * Document formatting via Prettier (real format only).
 * Uses prettier/standalone + bundled plugins from the prettier package.
 */

import type { EditorLanguage } from '../../types/project'

export type FormatResult =
  | { ok: true; code: string }
  | { ok: false; reason: string }

const PARSER: Partial<Record<EditorLanguage, string>> = {
  html: 'html',
  svg: 'html',
  css: 'css',
  javascript: 'babel',
  jsx: 'babel',
  typescript: 'typescript',
  tsx: 'typescript',
  json: 'json',
  markdown: 'markdown',
}

const DEFAULTS = {
  printWidth: 100,
  tabWidth: 2,
  semi: true,
  singleQuote: true,
  trailingComma: 'es5' as const,
  bracketSpacing: true,
  arrowParens: 'always' as const,
  endOfLine: 'lf' as const,
  htmlWhitespaceSensitivity: 'css' as const,
}

export async function formatCode(
  code: string,
  lang: EditorLanguage
): Promise<FormatResult> {
  const parser = PARSER[lang]
  if (!parser) {
    return {
      ok: false,
      reason: `No formatter for ${lang}. Supported: HTML, CSS, JS, TS, JSX, TSX, JSON, Markdown.`,
    }
  }

  try {
    const prettier = await import('prettier/standalone')
    const plugins: unknown[] = []

    // Prettier 3 ships plugins under prettier/plugins/*
    if (parser === 'html') {
      plugins.push(await import('prettier/plugins/html'))
    }
    if (parser === 'css') {
      plugins.push(await import('prettier/plugins/postcss'))
    }
    if (parser === 'babel' || parser === 'json') {
      plugins.push(await import('prettier/plugins/babel'))
      plugins.push(await import('prettier/plugins/estree'))
    }
    if (parser === 'typescript') {
      plugins.push(await import('prettier/plugins/typescript'))
      plugins.push(await import('prettier/plugins/estree'))
      plugins.push(await import('prettier/plugins/babel'))
    }
    if (parser === 'markdown') {
      plugins.push(await import('prettier/plugins/markdown'))
    }

    const formatted = await prettier.format(code, {
      parser,
      plugins: plugins as never[],
      ...DEFAULTS,
    })

    // Only report success if content actually changed OR was already formatted
    if (typeof formatted !== 'string') {
      return { ok: false, reason: 'Formatter returned an unexpected result' }
    }
    return { ok: true, code: formatted }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    // Common: syntax error — be honest
    if (/syntax|parse|unexpected/i.test(msg)) {
      return {
        ok: false,
        reason: `Cannot format: syntax error — ${msg.slice(0, 160)}`,
      }
    }
    return {
      ok: false,
      reason: `Formatter failed: ${msg.slice(0, 160)}`,
    }
  }
}
