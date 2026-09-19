/**
 * Build sandboxed preview HTML from project files.
 * User code runs only inside the iframe — never in the Forge app.
 */

import type { ProjectFile } from '../types/project'

function findFile(files: ProjectFile[], path: string): ProjectFile | undefined {
  return files.find(
    (f) => f.kind === 'file' && f.path.toLowerCase() === path.toLowerCase()
  )
}

/**
 * Resolve relative asset URLs by inlining text assets (css/js/svg)
 * and leaving binary references as-is (they won't load without a host).
 */
export function buildPreviewDocument(files: ProjectFile[]): string {
  const index =
    findFile(files, 'index.html') ||
    files.find((f) => f.kind === 'file' && f.name.endsWith('.html'))

  if (!index?.content) {
    return `<!DOCTYPE html><html><body style="font-family:system-ui;background:#0f1115;color:#a7afbd;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0">
      <p>No HTML entry file found. Create an <code>index.html</code>.</p>
    </body></html>`
  }

  let html = index.content

  // Inline linked stylesheets that exist in the project
  html = html.replace(
    /<link[^>]+href=["']([^"']+)["'][^>]*>/gi,
    (match, href: string) => {
      if (href.startsWith('http') || href.startsWith('//') || href.startsWith('data:')) {
        return match
      }
      const path = href.replace(/^\.\//, '')
      const cssFile = findFile(files, path)
      if (cssFile?.content != null) {
        return `<style data-forge-src="${path}">\n${cssFile.content}\n</style>`
      }
      return match
    }
  )

  // Inline local scripts
  html = html.replace(
    /<script([^>]*)src=["']([^"']+)["']([^>]*)>\s*<\/script>/gi,
    (match, pre: string, src: string, post: string) => {
      if (src.startsWith('http') || src.startsWith('//') || src.startsWith('data:')) {
        return match
      }
      const path = src.replace(/^\.\//, '')
      const jsFile = findFile(files, path)
      if (jsFile?.content != null) {
        return `<script data-forge-src="${path}"${pre}${post}>\n${jsFile.content}\n</script>`
      }
      return match
    }
  )

  // Inject error bridge so parent can show preview errors without crashing
  const bridge = `
<script>
(function(){
  function send(type, message) {
    try { parent.postMessage({ source: 'vexdyn-forge-preview', type: type, message: String(message) }, '*'); } catch(e) {}
  }
  window.addEventListener('error', function(e) {
    send('error', e.message || 'Script error');
  });
  window.addEventListener('unhandledrejection', function(e) {
    send('error', e.reason && e.reason.message ? e.reason.message : String(e.reason));
  });
})();
</script>`

  if (html.includes('</head>')) {
    html = html.replace('</head>', bridge + '</head>')
  } else if (html.includes('<body')) {
    html = html.replace(/<body([^>]*)>/i, `<body$1>${bridge}`)
  } else {
    html = bridge + html
  }

  return html
}
