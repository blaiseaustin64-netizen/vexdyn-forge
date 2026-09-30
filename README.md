# VEXDYN FORGE

Browser-based development workspace for VEXDYN.

**VS Code × VEXDYN × modern cloud development platform**

Part of the VEXDYN product family:

| Product | Role |
|---------|------|
| FORGE | Development workspace |
| LAB | Design / visual creation (future) |
| NYVEN | Intelligence layer (future) |

---

## Current capabilities (v1.1 foundation)

### Preserved from V1
- Project dashboard (create, search, sort, rename, duplicate, delete)
- Starters: Blank, Landing Page, Portfolio
- Nested folders; create / rename / delete files & folders
- CodeMirror 6 editor (syntax highlighting, find/replace, completions, undo/redo)
- Autosave with Saved / Unsaved / Saving states
- Sandboxed iframe Preview
- Full project ZIP download
- Profile & Settings
- localStorage persistence

### New in this upgrade
- **IDE-style workspace layout**: activity bar, collapsible sidebar, editor tabs, breadcrumbs, bottom panel, status bar
- **Expanded language support**: HTML, CSS, JS, TS, JSX, TSX, JSON, Markdown, Python, SQL (+ architecture for YAML, Bash, SVG)
- **Additional templates**: HTML/CSS/JS structured, React, React+TS, Tailwind (available); SaaS/Dashboard/etc. slots prepared
- **Project-wide search** panel
- **Problems panel** with basic diagnostics
- **Terminal / Output / Debug** panel architecture (no fake execution)
- **Service layer**: clean boundaries for filesystem, runtime, terminal, build, deployment, AI, diagnostics
- **Design system** updated: base `#0a0e14` → `#111823`, accent `#3B6EA5` → `#5B8DC7`, silver `#9AA5B1`
- Keyboard shortcuts: ⌘B sidebar, ⌘J bottom panel, ⌘P search, F11 fullscreen editor
- Integration hooks prepared for X-Ray, Deploy (Cloudflare Pages), Nyven AI, Brand-in-a-Box

---

## Local development

```bash
npm install
npm run dev
```

## Production build

```bash
npm install
npm run build
```

Output: `dist/`

---

## Architecture

```
src/
  components/     UI components + editor + panels
  hooks/          useProjects, useWorkspace
  lib/            stores, starters, preview, download
  pages/          Dashboard, Workspace, Profile, Settings
  services/       Service contracts + local/stub implementations
  styles/         tokens, global, components
  types/          Project model
```

### Service boundaries (extensible)
- `projects` — localStorage now; cloud backend later
- `files` — project filesystem abstraction
- `runtime` — static preview now; React/Node/Python later
- `terminal` — UI ready; requires secure sandbox
- `build` / `deployment` — contracts for Cloudflare Pages
- `ai` — Nyven project-aware actions (prepared)
- `diagnostics` — client heuristics; language servers later

---

## Persistence

Projects use **browser localStorage** as the primary store.  
Cloud migration path is designed (Local → Sign in → Upload → Cloud Project) without breaking existing local projects.

---

## What requires a real backend / runtime

- Terminal command execution (`npm install`, `python`, etc.)
- Full React / TypeScript / Vite bundling and HMR
- Python / Node runtimes
- Cloudflare Pages deployment
- Cloud project storage, auth, collaboration
- Nyven AI operating on the real filesystem

These are architected with honest stubs — no fake functionality.

---

## Security

- Project JS runs only in a sandboxed preview iframe
- Destructive actions require confirmation
- No secrets or API keys in this package
- Future runtimes must use isolated sandboxes
