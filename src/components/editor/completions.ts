import {
  autocompletion,
  CompletionContext,
  Completion,
} from '@codemirror/autocomplete'

const htmlTags: Completion[] = [
  'div', 'span', 'section', 'article', 'header', 'footer', 'main', 'nav',
  'button', 'a', 'img', 'input', 'form', 'label', 'ul', 'ol', 'li',
  'h1', 'h2', 'h3', 'p', 'html', 'head', 'body', 'script', 'link', 'meta',
].map((label) => ({
  label,
  type: 'keyword',
  apply: label === 'img' ? '<img src="" alt="" />' : `<${label}></${label}>`,
}))

const cssProps: Completion[] = [
  'display', 'position', 'color', 'background', 'background-color',
  'margin', 'padding', 'width', 'height', 'border', 'border-radius',
  'font-size', 'font-family', 'flex', 'grid', 'gap', 'align-items',
  'justify-content', 'top', 'left', 'right', 'bottom', 'overflow',
  'opacity', 'z-index', 'box-shadow', 'text-align', 'line-height',
].map((label) => ({ label, type: 'property' }))

const jsKeywords: Completion[] = [
  'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for',
  'while', 'switch', 'case', 'break', 'continue', 'class', 'new',
  'async', 'await', 'try', 'catch', 'throw', 'import', 'export',
  'document', 'window', 'console', 'addEventListener', 'querySelector',
].map((label) => ({ label, type: 'keyword' }))

function source(list: Completion[]) {
  return (context: CompletionContext) => {
    const word = context.matchBefore(/[\w-]*/)
    if (!word || (word.from === word.to && !context.explicit)) return null
    return { from: word.from, options: list }
  }
}

export function forgeCompletions(lang: 'html' | 'css' | 'javascript' | 'text') {
  const extra =
    lang === 'html'
      ? source(htmlTags)
      : lang === 'css'
        ? source(cssProps)
        : lang === 'javascript'
          ? source(jsKeywords)
          : undefined

  return autocompletion({
    override: extra ? [extra] : undefined,
    closeOnBlur: true,
  })
}
