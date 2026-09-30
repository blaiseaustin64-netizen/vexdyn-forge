/**
 * Starter template file contents for V1 (HTML/CSS/JS).
 * Keep lean — foundations the user can understand and modify.
 */

import type { ProjectFile, StarterTemplate } from '../types/project'

function fid(): string {
  return crypto.randomUUID()
}

function now(): string {
  return new Date().toISOString()
}

function file(
  name: string,
  path: string,
  content: string,
  parentId: string | null = null
): ProjectFile {
  const t = now()
  return {
    id: fid(),
    name,
    path,
    kind: 'file',
    content,
    parentId,
    createdAt: t,
    updatedAt: t,
  }
}

function folder(name: string, path: string, parentId: string | null = null): ProjectFile {
  const t = now()
  return {
    id: fid(),
    name,
    path,
    kind: 'folder',
    parentId,
    createdAt: t,
    updatedAt: t,
  }
}

const BLANK_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>My Project</title>
  <link rel="stylesheet" href="style.css" />
</head>
<body>
  <main>
    <h1>Hello, Forge</h1>
    <p>Edit this file and hit Run to see your changes.</p>
  </main>
  <script src="script.js"></script>
</body>
</html>
`

const BLANK_CSS = `*,
*::before,
*::after {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-height: 100vh;
  font-family: system-ui, -apple-system, sans-serif;
  background: #0f1115;
  color: #e8eaed;
  display: flex;
  align-items: center;
  justify-content: center;
}

main {
  text-align: center;
  padding: 2rem;
}

h1 {
  font-weight: 600;
  letter-spacing: -0.02em;
  margin-bottom: 0.5rem;
}

p {
  color: #9aa0a6;
}
`

const BLANK_JS = `console.log('Forge project ready');

document.querySelector('h1')?.addEventListener('click', () => {
  alert('You are building in VEXDYN FORGE');
});
`

const LANDING_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Landing — Forge</title>
  <link rel="stylesheet" href="style.css" />
</head>
<body>
  <header class="nav">
    <div class="logo">Acme</div>
    <nav>
      <a href="#features">Features</a>
      <a href="#cta" class="btn">Get started</a>
    </nav>
  </header>

  <section class="hero">
    <h1>Build something that matters</h1>
    <p>A clean foundation for your next product. Edit freely in Forge.</p>
    <a href="#cta" class="btn primary">Start free</a>
  </section>

  <section id="features" class="features">
    <article>
      <h3>Fast</h3>
      <p>Ship ideas without the ceremony.</p>
    </article>
    <article>
      <h3>Simple</h3>
      <p>HTML, CSS, and JavaScript — nothing extra.</p>
    </article>
    <article>
      <h3>Yours</h3>
      <p>Every line is editable. Own the result.</p>
    </article>
  </section>

  <section id="cta" class="cta">
    <h2>Ready when you are</h2>
    <button type="button" id="cta-btn" class="btn primary">Join waitlist</button>
  </section>

  <script src="script.js"></script>
</body>
</html>
`

const LANDING_CSS = `*,
*::before,
*::after { box-sizing: border-box; }

body {
  margin: 0;
  font-family: system-ui, -apple-system, sans-serif;
  background: #08090c;
  color: #f5f7fa;
  line-height: 1.5;
}

a { color: inherit; text-decoration: none; }

.nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #202630;
}

.logo { font-weight: 700; letter-spacing: 0.04em; }

.nav nav { display: flex; gap: 1.25rem; align-items: center; }

.btn {
  display: inline-flex;
  align-items: center;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  border: 1px solid #202630;
  background: #12161d;
  color: #f5f7fa;
  cursor: pointer;
  font: inherit;
}

.btn.primary {
  background: #7c5cff;
  border-color: transparent;
}

.hero {
  text-align: center;
  padding: 5rem 1.5rem 4rem;
  max-width: 640px;
  margin: 0 auto;
}

.hero h1 {
  font-size: clamp(2rem, 5vw, 3rem);
  letter-spacing: -0.03em;
  margin: 0 0 1rem;
}

.hero p { color: #a7afbd; margin-bottom: 1.75rem; }

.features {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1.25rem;
  padding: 2rem 1.5rem 4rem;
  max-width: 900px;
  margin: 0 auto;
}

.features article {
  background: #0d1015;
  border: 1px solid #202630;
  border-radius: 12px;
  padding: 1.25rem;
}

.features h3 { margin: 0 0 0.5rem; }
.features p { margin: 0; color: #a7afbd; font-size: 0.9375rem; }

.cta {
  text-align: center;
  padding: 3rem 1.5rem 5rem;
  border-top: 1px solid #202630;
}

.cta h2 { margin-bottom: 1rem; }
`

const LANDING_JS = `document.getElementById('cta-btn')?.addEventListener('click', () => {
  alert('Thanks — this is your landing page foundation.');
});
`

const PORTFOLIO_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Portfolio — Forge</title>
  <link rel="stylesheet" href="style.css" />
</head>
<body>
  <header>
    <h1>Alex Rivera</h1>
    <p class="tagline">Designer & developer</p>
  </header>

  <section class="about">
    <h2>About</h2>
    <p>
      I build calm, focused digital products. This portfolio is a starting point —
      replace the copy and ship your own story.
    </p>
  </section>

  <section class="work">
    <h2>Selected work</h2>
    <ul>
      <li>
        <strong>Northwind</strong>
        <span>Brand system for a climate startup</span>
      </li>
      <li>
        <strong>Pulse</strong>
        <span>Mobile dashboard for health data</span>
      </li>
      <li>
        <strong>Forge</strong>
        <span>Browser-based creation environment</span>
      </li>
    </ul>
  </section>

  <footer>
    <a href="mailto:hello@example.com">hello@example.com</a>
  </footer>

  <script src="script.js"></script>
</body>
</html>
`

const PORTFOLIO_CSS = `*,
*::before,
*::after { box-sizing: border-box; }

body {
  margin: 0;
  min-height: 100vh;
  font-family: system-ui, -apple-system, sans-serif;
  background: #08090c;
  color: #f5f7fa;
  line-height: 1.6;
  padding: 3rem 1.5rem;
  max-width: 640px;
  margin-inline: auto;
}

h1 {
  font-size: 1.75rem;
  letter-spacing: -0.02em;
  margin: 0 0 0.25rem;
}

.tagline { color: #a7afbd; margin: 0 0 2.5rem; }

h2 {
  font-size: 0.75rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #687180;
  margin: 0 0 0.75rem;
}

.about { margin-bottom: 2.5rem; }
.about p { margin: 0; color: #a7afbd; }

.work ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.work li {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  padding: 1rem 0;
  border-bottom: 1px solid #202630;
}

.work li span { color: #687180; font-size: 0.875rem; }

footer {
  margin-top: 3rem;
  padding-top: 1.5rem;
  border-top: 1px solid #202630;
}

footer a {
  color: #9a7bff;
  text-decoration: none;
}

footer a:hover { text-decoration: underline; }
`

const PORTFOLIO_JS = `// Portfolio interactions — add yours here
console.log('Portfolio project loaded');
`

const REACT_APP = `export default function App() {
  return (
    <main style={{ fontFamily: 'system-ui', padding: '2rem', background: '#0a0e14', color: '#e8edf2', minHeight: '100vh' }}>
      <h1>React + Forge</h1>
      <p>Edit <code>src/App.jsx</code> and expand this project.</p>
      <p style={{ color: '#9AA5B1' }}>Full React runtime requires a build step (architecture prepared).</p>
    </main>
  );
}
`

const REACT_INDEX = `import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';

const root = createRoot(document.getElementById('root'));
root.render(<App />);
`

const REACT_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>React App — Forge</title>
</head>
<body>
  <div id="root"></div>
  <!-- Static fallback preview until React runtime is connected -->
  <noscript>Enable JavaScript to run this React app.</noscript>
</body>
</html>
`

const REACT_PKG = `{
  "name": "forge-react-app",
  "private": true,
  "version": "0.0.1",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.4",
    "vite": "^5.4.11"
  }
}
`

const REACT_TS_APP = `export default function App() {
  return (
    <main style={{ fontFamily: 'system-ui', padding: '2rem', background: '#0a0e14', color: '#e8edf2', minHeight: '100vh' }}>
      <h1>React + TypeScript + Forge</h1>
      <p>Edit <code>src/App.tsx</code> and expand this project.</p>
      <p style={{ color: '#9AA5B1' }}>Full TS/React runtime requires a build step (architecture prepared).</p>
    </main>
  );
}
`

const REACT_TS_INDEX = `import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
`

const TAILWIND_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Tailwind — Forge</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="style.css" />
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen">
  <main class="max-w-3xl mx-auto px-6 py-16">
    <h1 class="text-4xl font-semibold tracking-tight mb-4">Tailwind + Forge</h1>
    <p class="text-slate-400 mb-8">CDN Tailwind for rapid prototyping. Replace with a proper build when ready.</p>
    <button class="px-4 py-2 rounded-lg bg-sky-700 hover:bg-sky-600 transition" id="action">
      Get started
    </button>
  </main>
  <script src="script.js"></script>
</body>
</html>
`

const TAILWIND_CSS = `/* Custom styles on top of Tailwind CDN */
body {
  font-family: system-ui, -apple-system, sans-serif;
}
`

const TAILWIND_JS = `document.getElementById('action')?.addEventListener('click', () => {
  alert('Tailwind starter is ready — customize freely.');
});
`

const HTML_CSS_JS_README = `# HTML / CSS / JS Project

Structured static web project created in VEXDYN Forge.

## Structure

- \`index.html\` — entry
- \`css/style.css\` — styles
- \`js/main.js\` — scripts
- \`assets/\` — media folder

Edit files and press **Run** to preview.
`

export function buildStarterFiles(starter: StarterTemplate): ProjectFile[] {
  if (starter === 'landing') {
    return [
      file('index.html', 'index.html', LANDING_HTML),
      file('style.css', 'style.css', LANDING_CSS),
      file('script.js', 'script.js', LANDING_JS),
    ]
  }
  if (starter === 'portfolio') {
    return [
      file('index.html', 'index.html', PORTFOLIO_HTML),
      file('style.css', 'style.css', PORTFOLIO_CSS),
      file('script.js', 'script.js', PORTFOLIO_JS),
    ]
  }
  if (starter === 'html-css-js') {
    const cssFolder = folder('css', 'css')
    const jsFolder = folder('js', 'js')
    const assets = folder('assets', 'assets')
    return [
      file('index.html', 'index.html', BLANK_HTML.replace('style.css', 'css/style.css').replace('script.js', 'js/main.js')),
      cssFolder,
      file('style.css', 'css/style.css', BLANK_CSS, cssFolder.id),
      jsFolder,
      file('main.js', 'js/main.js', BLANK_JS, jsFolder.id),
      assets,
      file('README.md', 'README.md', HTML_CSS_JS_README),
    ]
  }
  if (starter === 'react') {
    const src = folder('src', 'src')
    return [
      file('index.html', 'index.html', REACT_HTML),
      file('package.json', 'package.json', REACT_PKG),
      src,
      file('App.jsx', 'src/App.jsx', REACT_APP, src.id),
      file('main.jsx', 'src/main.jsx', REACT_INDEX, src.id),
      file('README.md', 'README.md', '# React Starter\\n\\nCreated in VEXDYN Forge.\\n\\nRun \`npm install && npm run dev\` when backend runtime is available.\\n'),
    ]
  }
  if (starter === 'react-ts') {
    const src = folder('src', 'src')
    return [
      file('index.html', 'index.html', REACT_HTML),
      file('package.json', 'package.json', REACT_PKG.replace('"vite"', '"typescript": "^5.6.3",\\n    "vite"').replace('App.jsx', 'App.tsx')),
      src,
      file('App.tsx', 'src/App.tsx', REACT_TS_APP, src.id),
      file('main.tsx', 'src/main.tsx', REACT_TS_INDEX, src.id),
      file('tsconfig.json', 'tsconfig.json', '{\\n  "compilerOptions": {\\n    "target": "ES2020",\\n    "jsx": "react-jsx",\\n    "module": "ESNext",\\n    "moduleResolution": "bundler",\\n    "strict": true\\n  },\\n  "include": ["src"]\\n}\\n'),
      file('README.md', 'README.md', '# React + TypeScript Starter\\n\\nCreated in VEXDYN Forge.\\n'),
    ]
  }
  if (starter === 'tailwind') {
    return [
      file('index.html', 'index.html', TAILWIND_HTML),
      file('style.css', 'style.css', TAILWIND_CSS),
      file('script.js', 'script.js', TAILWIND_JS),
    ]
  }
  // blank — truly empty workspace
  if (starter === 'blank') {
    return []
  }

  // fallback empty for unknown / unavailable templates
  return []
}

export { folder as makeFolder, file as makeFile }
