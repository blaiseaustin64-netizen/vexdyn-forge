import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
  },
  optimizeDeps: {
    include: [
      '@codemirror/state',
      '@codemirror/view',
      '@codemirror/commands',
      '@codemirror/language',
      '@codemirror/lang-html',
      '@codemirror/lang-css',
      '@codemirror/lang-javascript',
      '@codemirror/autocomplete',
      '@codemirror/search',
      '@lezer/highlight',
    ],
  },
})
