# VEXDYN FORGE

Browser-based development workspace for VEXDYN.

**Stable checkpoint v1.4** — professional local editor ready for backend phase.

---

## v1.4 — Polish & stabilize

- Project-wide Find & Replace (case, whole word, regex, path filter, next/prev)
- Split editor: move tab to group, secondary tabs, close group
- Prettier formatting for HTML/CSS/JS/TS/JSX/JSON/Markdown (honest failures)
- Editor UX polish (search panel, split tabs, scrollbars)
- Shortcut audit preserved

### Shortcuts

| Shortcut | Action |
|----------|--------|
| ⌘/Ctrl+Shift+P | Command Palette |
| ⌘/Ctrl+P | Go to File |
| ⌘/Ctrl+G | Go to Line |
| ⌘/Ctrl+F | Find (current file) |
| ⌘/Ctrl+H | Replace (current file) |
| ⌘/Ctrl+S | Save |
| ⌘/Ctrl+B | Toggle Sidebar |
| ⌘/Ctrl+J | Toggle Panel |
| ⇧⌥F | Format Document |
| Tab (HTML) | Emmet expand |
| F11 | Fullscreen |

### Develop

```bash
npm install
npm run dev
```

### Out of scope (later backend)

Terminal · React/Vite runtime · Cloudflare deploy · cloud storage · auth · LSPs · Nyven AI
