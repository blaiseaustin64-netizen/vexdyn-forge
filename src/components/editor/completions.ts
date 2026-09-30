/**
 * Real CodeMirror completions + snippets for Forge languages.
 * No fake AI — structured completions that can later connect to Nyven.
 */

import {
  autocompletion,
  completionKeymap,
  type Completion,
  type CompletionContext,
  type CompletionSource,
} from '@codemirror/autocomplete'
import type { Extension } from '@codemirror/state'
import type { EditorLanguage } from '../../types/project'

function snip(label: string, apply: string, detail?: string, type = 'keyword'): Completion {
  return { label, apply, detail, type }
}

const htmlCompletions: Completion[] = [
  snip('div', '<div></div>', 'container'),
  snip('div.container', '<div class="container"></div>', 'snippet'),
  snip('section', '<section></section>'),
  snip('section.hero', '<section class="hero"></section>', 'snippet'),
  snip('article', '<article></article>'),
  snip('header', '<header></header>'),
  snip('footer', '<footer></footer>'),
  snip('main', '<main></main>'),
  snip('nav', '<nav></nav>'),
  snip('button', '<button type="button"></button>'),
  snip('button.btn', '<button type="button" class="btn"></button>', 'snippet'),
  snip('a', '<a href=""></a>'),
  snip('img', '<img src="" alt="" />', 'self-closing'),
  snip('input', '<input type="text" name="" />', 'self-closing'),
  snip('form', '<form action="" method="post"></form>'),
  snip('label', '<label for=""></label>'),
  snip('ul', '<ul>\n  <li></li>\n</ul>', 'snippet'),
  snip('ol', '<ol>\n  <li></li>\n</ol>', 'snippet'),
  snip('li', '<li></li>'),
  snip('h1', '<h1></h1>'),
  snip('h2', '<h2></h2>'),
  snip('h3', '<h3></h3>'),
  snip('p', '<p></p>'),
  snip('span', '<span></span>'),
  snip('html5', '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8" />\n  <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n  <title>Document</title>\n</head>\n<body>\n  \n</body>\n</html>\n', 'boilerplate'),
  snip('link:css', '<link rel="stylesheet" href="style.css" />', 'snippet'),
  snip('script:src', '<script src="script.js"></script>', 'snippet'),
  // attributes
  snip('class', 'class=""', 'attribute', 'property'),
  snip('id', 'id=""', 'attribute', 'property'),
  snip('href', 'href=""', 'attribute', 'property'),
  snip('src', 'src=""', 'attribute', 'property'),
  snip('alt', 'alt=""', 'attribute', 'property'),
  snip('type', 'type=""', 'attribute', 'property'),
  snip('placeholder', 'placeholder=""', 'attribute', 'property'),
]

const cssCompletions: Completion[] = [
  snip('display', 'display: ;', 'property', 'property'),
  snip('display:flex', 'display: flex;', 'snippet', 'property'),
  snip('display:grid', 'display: grid;', 'snippet', 'property'),
  snip('display:none', 'display: none;', 'snippet', 'property'),
  snip('position', 'position: ;', 'property', 'property'),
  snip('position:relative', 'position: relative;', 'snippet', 'property'),
  snip('position:absolute', 'position: absolute;', 'snippet', 'property'),
  snip('flex', 'display: flex;\nalign-items: center;\njustify-content: center;', 'snippet'),
  snip('grid', 'display: grid;\ngrid-template-columns: repeat(auto-fit, minmax(200px, 1fr));\ngap: 1rem;', 'snippet'),
  snip('margin', 'margin: ;', 'property', 'property'),
  snip('padding', 'padding: ;', 'property', 'property'),
  snip('width', 'width: ;', 'property', 'property'),
  snip('height', 'height: ;', 'property', 'property'),
  snip('color', 'color: ;', 'property', 'property'),
  snip('background', 'background: ;', 'property', 'property'),
  snip('background-color', 'background-color: ;', 'property', 'property'),
  snip('border', 'border: 1px solid ;', 'property', 'property'),
  snip('border-radius', 'border-radius: ;', 'property', 'property'),
  snip('font-size', 'font-size: ;', 'property', 'property'),
  snip('font-family', 'font-family: system-ui, sans-serif;', 'property', 'property'),
  snip('font-weight', 'font-weight: ;', 'property', 'property'),
  snip('line-height', 'line-height: ;', 'property', 'property'),
  snip('text-align', 'text-align: ;', 'property', 'property'),
  snip('gap', 'gap: ;', 'property', 'property'),
  snip('align-items', 'align-items: ;', 'property', 'property'),
  snip('justify-content', 'justify-content: ;', 'property', 'property'),
  snip('overflow', 'overflow: ;', 'property', 'property'),
  snip('opacity', 'opacity: ;', 'property', 'property'),
  snip('z-index', 'z-index: ;', 'property', 'property'),
  snip('box-shadow', 'box-shadow: 0 4px 12px rgba(0,0,0,0.15);', 'property', 'property'),
  snip('transition', 'transition: all 0.2s ease;', 'property', 'property'),
  snip('media', '@media (max-width: 768px) {\n  \n}', 'snippet'),
  snip('reset', '*,\n*::before,\n*::after {\n  box-sizing: border-box;\n}\n\nbody {\n  margin: 0;\n}', 'snippet'),
]

const jsCompletions: Completion[] = [
  snip('const', 'const ', 'keyword'),
  snip('let', 'let ', 'keyword'),
  snip('function', 'function name() {\n  \n}', 'snippet'),
  snip('arrow', 'const name = () => {\n  \n}', 'snippet'),
  snip('async', 'async function name() {\n  \n}', 'snippet'),
  snip('await', 'await ', 'keyword'),
  snip('import', "import { } from '';", 'snippet'),
  snip('export', 'export ', 'keyword'),
  snip('export default', 'export default ', 'keyword'),
  snip('if', 'if () {\n  \n}', 'snippet'),
  snip('for', 'for (let i = 0; i < ; i++) {\n  \n}', 'snippet'),
  snip('forof', 'for (const item of items) {\n  \n}', 'snippet'),
  snip('try', 'try {\n  \n} catch (err) {\n  \n}', 'snippet'),
  snip('cl', 'console.log()', 'snippet'),
  snip('ce', 'console.error()', 'snippet'),
  snip('qs', "document.querySelector('')", 'snippet'),
  snip('qsa', "document.querySelectorAll('')", 'snippet'),
  snip('addEventListener', "addEventListener('click', () => {\n  \n})", 'snippet'),
  snip('fetch', "const res = await fetch('');\nconst data = await res.json();", 'snippet'),
  snip('useState', 'const [state, setState] = useState()', 'React'),
  snip('useEffect', 'useEffect(() => {\n  \n}, [])', 'React'),
  snip('interface', 'interface Name {\n  \n}', 'TypeScript'),
  snip('type', 'type Name = ', 'TypeScript'),
  snip('return', 'return ', 'keyword'),
]

const jsonCompletions: Completion[] = [
  snip('true', 'true', 'boolean'),
  snip('false', 'false', 'boolean'),
  snip('null', 'null', 'null'),
]

const sqlCompletions: Completion[] = [
  snip('SELECT', 'SELECT * FROM ', 'keyword'),
  snip('INSERT', 'INSERT INTO  () VALUES ()', 'keyword'),
  snip('UPDATE', 'UPDATE  SET  WHERE ', 'keyword'),
  snip('DELETE', 'DELETE FROM  WHERE ', 'keyword'),
  snip('CREATE TABLE', 'CREATE TABLE  (\n  id SERIAL PRIMARY KEY\n)', 'snippet'),
  snip('WHERE', 'WHERE ', 'keyword'),
  snip('JOIN', 'JOIN  ON ', 'keyword'),
  snip('ORDER BY', 'ORDER BY ', 'keyword'),
  snip('GROUP BY', 'GROUP BY ', 'keyword'),
  snip('LIMIT', 'LIMIT ', 'keyword'),
]

function makeSource(list: Completion[]): CompletionSource {
  return (context: CompletionContext) => {
    const word = context.matchBefore(/[\w.:!-]*/)
    if (!word || (word.from === word.to && !context.explicit)) return null
    return {
      from: word.from,
      options: list,
      validFor: /^[\w.:!-]*$/,
    }
  }
}

export function forgeCompletions(lang: EditorLanguage): Extension {
  let extra: CompletionSource | undefined
  switch (lang) {
    case 'html':
    case 'svg':
      extra = makeSource(htmlCompletions)
      break
    case 'css':
      extra = makeSource(cssCompletions)
      break
    case 'javascript':
    case 'typescript':
    case 'jsx':
    case 'tsx':
      extra = makeSource(jsCompletions)
      break
    case 'json':
      extra = makeSource(jsonCompletions)
      break
    case 'sql':
      extra = makeSource(sqlCompletions)
      break
    default:
      extra = undefined
  }

  return autocompletion({
    override: extra ? [extra] : undefined,
    closeOnBlur: true,
    defaultKeymap: true,
    activateOnTyping: true,
  })
}

export { completionKeymap }
