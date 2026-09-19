# VEXDYN FORGE V1

**CREATE WITHOUT LIMITS.**

Browser-based development environment for the VEXDYN ecosystem.  
Build real HTML / CSS / JavaScript projects with files, a professional editor, live preview, and ZIP download.

**Visual identity:** dark modern tech blue + premium silver + subtle violet (secondary).

| Product | Role |
|--------|------|
| Learn | Learn |
| Lab | Practice |
| **Forge** | **Create** |
| Builder | Intelligent / visual creation (future) |
| NYVEN | Intelligence layer (future) |

---

## V1 features

- Project dashboard (create, search, sort, rename, duplicate, delete)
- Starters: Blank, Landing Page, Portfolio
- Desktop workspace: **Files | Code | Preview**
- Mobile workspace: **Files · Code · Preview** (one pane at a time)
- Nested folders; create / rename / delete files & folders
- CodeMirror 6 editor (syntax highlighting, find/replace, completions, undo/redo)
- Autosave with Saved / Unsaved / Saving states
- **Run** with premium glass-wave execution transition
- Sandboxed iframe Preview
- Full project ZIP download
- Profile (account center) & Settings
- Forge dark visual system (blue / silver / secondary violet)

---

## Local development

```bash
npm install
npm run dev
```

---

## Production build

```bash
npm install
npm run build
npm run preview
```

Output: `dist/`

---

## Deploy to Vercel

1. Push to GitHub (without `node_modules` or secrets).
2. Import in [Vercel](https://vercel.com).
3. Framework: **Vite**
4. Build command: `npm run build`
5. Output directory: `dist`

`vercel.json` rewrites SPA routes. **No environment variables required for V1.**

---

## Persistence (honest)

Projects, files, profile, and settings use **browser localStorage** on this device.  
Not cloud storage. Not VEXDYN Core authentication.

---

## Future (not in V1)

VEXDYN Core · NYVEN · Live · PRO · Builder · React · Git · collaboration · terminal

---

## Security

- Project JS runs only in a sandboxed preview iframe
- Destructive actions require confirmation
- No secrets or API keys in this package
