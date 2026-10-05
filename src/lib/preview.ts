/**
 * Build sandboxed preview HTML from project files.
 * User code runs only inside the iframe — never in the Forge app.
 * Text assets inlined; binary assets rewritten to data: URIs.
 */

import type { ProjectFile } from '../types/project'

function findFile(files: ProjectFile[], path: string): ProjectFile | undefined {
  const clean = path.replace(/^\.\//, '').replace(/^\/+/, '')
  return files.find(
    (f) => f.kind === 'file' && f.path.toLowerCase() === clean.toLowerCase()
  )
}

function resolvePath(fromFile: string, rel: string): string {
  if (rel.startsWith('/') || rel.startsWith('http') || rel.startsWith('data:') || rel.startsWith('//')) {
    return rel.replace(/^\//, '')
  }
  const baseParts = fromFile.split('/').slice(0, -1)
  const relParts = rel.replace(/^\.\//, '').split('/')
  for (const p of relParts) {
    if (p === '..') baseParts.pop()
    else if (p && p !== '.') baseParts.push(p)
  }
  return baseParts.join('/')
}

function assetDataUri(file: ProjectFile): string | null {
  if (file.content == null) return null
  if (file.encoding === 'base64') {
    const mime = file.mimeType || 'application/octet-stream'
    return `data:${mime};base64,${file.content}`
  }
  // SVG or text asset
  if (file.name.toLowerCase().endsWith('.svg')) {
    try {
      return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(file.content)}`
    } catch {
      return null
    }
  }
  return null
}

function rewriteCssUrls(css: string, cssPath: string, files: ProjectFile[]): string {
  return css.replace(
    /url\(\s*(['"]?)([^)'"]+)\1\s*\)/gi,
    (match, _q, raw: string) => {
      const href = raw.trim()
      if (
        href.startsWith('http') ||
        href.startsWith('//') ||
        href.startsWith('data:') ||
        href.startsWith('#')
      ) {
        return match
      }
      const resolved = resolvePath(cssPath, href)
      const asset = findFile(files, resolved)
      if (!asset) return match
      const uri = assetDataUri(asset)
      return uri ? `url("${uri}")` : match
    }
  )
}

/**
 * Resolve relative asset URLs by inlining text assets (css/js)
 * and mapping images/fonts to data URIs from project files.
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
  const htmlPath = index.path

  // Inline linked stylesheets
  html = html.replace(
    /<link[^>]+href=["']([^"']+)["'][^>]*>/gi,
    (match, href: string) => {
      if (href.startsWith('http') || href.startsWith('//') || href.startsWith('data:')) {
        return match
      }
      const path = resolvePath(htmlPath, href)
      const cssFile = findFile(files, path)
      if (cssFile?.content != null && cssFile.encoding !== 'base64') {
        const css = rewriteCssUrls(cssFile.content, cssFile.path, files)
        return `<style data-forge-src="${path}">\n${css}\n</style>`
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
      const path = resolvePath(htmlPath, src)
      const jsFile = findFile(files, path)
      if (jsFile?.content != null && jsFile.encoding !== 'base64') {
        return `<script data-forge-src="${path}"${pre}${post}>\n${jsFile.content}\n<\/script>`
      }
      return match
    }
  )

  // Rewrite <img src>
  html = html.replace(
    /(<img\b[^>]*\bsrc=["'])([^"']+)(["'][^>]*>)/gi,
    (match, pre: string, src: string, post: string) => {
      if (src.startsWith('http') || src.startsWith('//') || src.startsWith('data:')) {
        return match
      }
      const path = resolvePath(htmlPath, src)
      const asset = findFile(files, path)
      const uri = asset ? assetDataUri(asset) : null
      return uri ? `${pre}${uri}${post}` : match
    }
  )

  // Rewrite srcset simple cases
  html = html.replace(
    /(<source\b[^>]*\bsrcset=["'])([^"'\s]+)(["'][^>]*>)/gi,
    (match, pre: string, src: string, post: string) => {
      if (src.startsWith('http') || src.startsWith('data:')) return match
      const path = resolvePath(htmlPath, src)
      const asset = findFile(files, path)
      const uri = asset ? assetDataUri(asset) : null
      return uri ? `${pre}${uri}${post}` : match
    }
  )

  // Inline style url() in HTML attributes
  html = html.replace(
    /style=(["'])([\s\S]*?)\1/gi,
    (match, q: string, styleBody: string) => {
      const next = rewriteCssUrls(styleBody, htmlPath, files)
      return `style=${q}${next}${q}`
    }
  )

  const bridge = `
<script>
(function(){
  function send(type, message, level) {
    try {
      parent.postMessage({
        source: 'vexdyn-forge-preview',
        type: type,
        level: level || type,
        message: String(message)
      }, '*');
    } catch(e) {}
  }
  var levels = ['log','info','warn','error','debug'];
  levels.forEach(function(level) {
    var orig = console[level];
    console[level] = function() {
      try {
        var args = Array.prototype.slice.call(arguments).map(function(a) {
          try { return typeof a === 'string' ? a : JSON.stringify(a); }
          catch(e) { return String(a); }
        });
        send('console', args.join(' '), level);
      } catch(e) {}
      if (orig) orig.apply(console, arguments);
    };
  });
  window.addEventListener('error', function(e) {
    send('error', e.message || 'Script error', 'error');
  });
  window.addEventListener('unhandledrejection', function(e) {
    send('error', e.reason && e.reason.message ? e.reason.message : String(e.reason), 'error');
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
