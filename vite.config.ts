import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { writeFileSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * Emit dist/version.json with a unique build id so clients can detect new deploys.
 * Also injects import.meta.env.VITE_APP_BUILD_ID for the running app.
 */
function versionPlugin(): Plugin {
  const buildId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  return {
    name: 'vexdyn-forge-version',
    config() {
      return {
        define: {
          'import.meta.env.VITE_APP_BUILD_ID': JSON.stringify(buildId),
        },
      }
    },
    closeBundle() {
      const outDir = resolve(__dirname, 'dist')
      try {
        mkdirSync(outDir, { recursive: true })
      } catch {
        /* exists */
      }
      writeFileSync(
        resolve(outDir, 'version.json'),
        JSON.stringify(
          {
            buildId,
            builtAt: new Date().toISOString(),
          },
          null,
          2
        ) + '\n',
        'utf8'
      )
    },
  }
}

export default defineConfig({
  plugins: [react(), versionPlugin()],
  server: {
    port: 5173,
    host: true,
  },
  build: {
    // Content-hashed filenames are Vite default (assets/[name]-[hash].js)
    sourcemap: false,
    rollupOptions: {
      output: {
        // Ensure stable, hashed asset names for long-cache + cache-bust on change
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
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
