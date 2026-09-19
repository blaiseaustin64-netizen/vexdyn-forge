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
  // blank
  return [
    file('index.html', 'index.html', BLANK_HTML),
    file('style.css', 'style.css', BLANK_CSS),
    file('script.js', 'script.js', BLANK_JS),
  ]
}

export { folder as makeFolder, file as makeFile }
