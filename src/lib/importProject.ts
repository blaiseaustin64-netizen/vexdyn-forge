/**
 * Browser-side project import: files, folders, ZIP.
 * Does not execute project code or install packages.
 */

import { unzipSync, strFromU8 } from 'fflate'
import type { ProjectFile, ProjectType, FileKind } from '../types/project'

export interface ImportedPath {
  path: string
  content: string
  /** true if binary was skipped or base64-encoded */
  binary?: boolean
}

export interface ProjectDetection {
  projectType: ProjectType
  labels: string[]
  summary: string
  hasPackageJson: boolean
  entryHints: string[]
}

const SKIP_PREFIXES = [
  '__macosx/',
  '.git/',
  'node_modules/',
  '.svn/',
  '.hg/',
]

const SKIP_NAMES = new Set([
  '.ds_store',
  'thumbs.db',
  'desktop.ini',
  '.gitkeep',
])

const TEXT_EXT = new Set([
  'html', 'htm', 'css', 'js', 'mjs', 'cjs', 'jsx', 'ts', 'tsx',
  'json', 'md', 'markdown', 'txt', 'svg', 'xml', 'yml', 'yaml',
  'py', 'sql', 'sh', 'bash', 'env', 'gitignore', 'npmrc', 'prettierrc',
  'eslintrc', 'editorconfig', 'toml', 'ini', 'cfg', 'conf', 'map',
  'vue', 'svelte', 'astro', 'liquid', 'hbs', 'ejs', 'pug',
  'csv', 'tsv', 'lock', 'log', 'rst', 'tex',
])

function uid(): string {
  return crypto.randomUUID()
}

function nowIso(): string {
  return new Date().toISOString()
}

function normalizePath(p: string): string {
  return p.replace(/\\/g, '/').replace(/^\/+/, '').replace(/\/+/g, '/')
}

function shouldSkip(path: string): boolean {
  const lower = path.toLowerCase()
  if (SKIP_NAMES.has(lower.split('/').pop() || '')) return true
  for (const prefix of SKIP_PREFIXES) {
    if (lower.startsWith(prefix) || lower.includes('/' + prefix)) return true
  }
  return false
}

function extOf(path: string): string {
  const base = path.split('/').pop() || ''
  const i = base.lastIndexOf('.')
  if (i <= 0) return ''
  return base.slice(i + 1).toLowerCase()
}

function isProbablyText(path: string, bytes: Uint8Array): boolean {
  const ext = extOf(path)
  if (TEXT_EXT.has(ext)) return true
  // Heuristic: no null bytes in first 800 bytes
  const n = Math.min(bytes.length, 800)
  for (let i = 0; i < n; i++) {
    if (bytes[i] === 0) return false
  }
  return bytes.length < 256_000
}

/** Strip a single common root folder (e.g. repo-name/) when all files share it */
export function stripCommonRoot(paths: string[]): { paths: string[]; root: string | null } {
  if (paths.length === 0) return { paths, root: null }
  const parts = paths.map((p) => p.split('/'))
  if (parts.every((p) => p.length === 1)) return { paths, root: null }
  const first = parts[0][0]
  if (!first) return { paths, root: null }
  if (parts.every((p) => p[0] === first && p.length > 1)) {
    return {
      paths: paths.map((p) => p.split('/').slice(1).join('/')),
      root: first,
    }
  }
  return { paths, root: null }
}

export function detectProject(files: ImportedPath[]): ProjectDetection {
  const names = new Set(files.map((f) => f.path.toLowerCase()))
  const labels: string[] = []
  const entryHints: string[] = []
  let hasPackageJson = false
  let projectType: ProjectType = 'html-css-js'

  let pkg: Record<string, unknown> | null = null
  const pkgFile = files.find((f) => f.path === 'package.json' || f.path.endsWith('/package.json'))
  if (pkgFile) {
    hasPackageJson = true
    labels.push('Node / npm')
    try {
      pkg = JSON.parse(pkgFile.content) as Record<string, unknown>
    } catch {
      /* ignore */
    }
  }

  const deps = {
    ...(typeof pkg?.dependencies === 'object' && pkg.dependencies
      ? (pkg.dependencies as Record<string, string>)
      : {}),
    ...(typeof pkg?.devDependencies === 'object' && pkg.devDependencies
      ? (pkg.devDependencies as Record<string, string>)
      : {}),
  }

  const scripts = (pkg?.scripts as Record<string, string>) || {}

  if (deps['next'] || names.has('next.config.js') || names.has('next.config.mjs')) {
    labels.push('Next.js')
    projectType = 'next'
  } else if (deps['vite'] || names.has('vite.config.js') || names.has('vite.config.ts') || names.has('vite.config.mjs')) {
    labels.push('Vite')
    projectType = 'vite'
  }

  if (deps['react'] || deps['react-dom']) {
    labels.push('React')
    if (deps['typescript'] || names.has('tsconfig.json')) {
      labels.push('TypeScript')
      projectType = projectType === 'html-css-js' ? 'react-ts' : projectType
      if (projectType === 'vite') { /* keep vite */ }
      else if (!labels.includes('Next.js')) projectType = 'react-ts'
    } else {
      if (!labels.includes('Next.js') && projectType === 'html-css-js') projectType = 'react'
    }
  } else if (deps['typescript'] || names.has('tsconfig.json')) {
    labels.push('TypeScript')
  }

  if (
    deps['tailwindcss'] ||
    files.some((f) => /tailwind\.config/i.test(f.path))
  ) {
    labels.push('Tailwind')
    if (projectType === 'html-css-js') projectType = 'tailwind'
  }

  const hasPy = files.some((f) => f.path.endsWith('.py'))
  if (hasPy || names.has('requirements.txt') || names.has('pyproject.toml')) {
    labels.push('Python')
    if (projectType === 'html-css-js') projectType = 'python'
  }

  if (names.has('index.html') || files.some((f) => f.path.endsWith('.html'))) {
    if (!labels.includes('HTML')) labels.push('HTML/CSS/JS')
    entryHints.push('index.html')
  }

  if (hasPackageJson && entryHints.length === 0) {
    if (scripts.dev) entryHints.push('npm run dev')
    else if (scripts.start) entryHints.push('npm start')
  }

  // Unique labels
  const uniq = Array.from(new Set(labels))
  if (uniq.length === 0) uniq.push('Static files')

  const summary =
    uniq.length === 1
      ? `Detected: ${uniq[0]}`
      : `Detected: ${uniq.join(' · ')}`

  return {
    projectType,
    labels: uniq,
    summary,
    hasPackageJson,
    entryHints,
  }
}

/** Build nested ProjectFile[] (files + folders) from flat path list */
export function pathsToProjectFiles(imported: ImportedPath[]): ProjectFile[] {
  const folderIds = new Map<string, string>() // path -> id
  const result: ProjectFile[] = []
  const ts = nowIso()

  function ensureFolder(dirPath: string): string | null {
    if (!dirPath) return null
    if (folderIds.has(dirPath)) return folderIds.get(dirPath)!
    const parentPath = dirPath.includes('/')
      ? dirPath.slice(0, dirPath.lastIndexOf('/'))
      : ''
    const parentId = parentPath ? ensureFolder(parentPath) : null
    const id = uid()
    const name = dirPath.split('/').pop() || dirPath
    folderIds.set(dirPath, id)
    result.push({
      id,
      name,
      path: dirPath,
      kind: 'folder' as FileKind,
      parentId,
      createdAt: ts,
      updatedAt: ts,
    })
    return id
  }

  // Sort so folders are created in order
  const sorted = [...imported].sort((a, b) => a.path.localeCompare(b.path))
  for (const item of sorted) {
    const path = normalizePath(item.path)
    if (!path || shouldSkip(path)) continue
    const parentPath = path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : ''
    const parentId = parentPath ? ensureFolder(parentPath) : null
    const name = path.split('/').pop() || path
    result.push({
      id: uid(),
      name,
      path,
      kind: 'file',
      content: item.content,
      parentId,
      createdAt: ts,
      updatedAt: ts,
    })
  }

  return result
}

export async function readFileList(fileList: FileList | File[]): Promise<ImportedPath[]> {
  const files = Array.from(fileList)
  const out: ImportedPath[] = []

  for (const file of files) {
    // webkitRelativePath for folder picks; name for single files
    const rel =
      (file as File & { webkitRelativePath?: string }).webkitRelativePath ||
      file.name
    const path = normalizePath(rel)
    if (!path || shouldSkip(path)) continue

    if (path.toLowerCase().endsWith('.zip')) {
      const buf = new Uint8Array(await file.arrayBuffer())
      const fromZip = unpackZipBytes(buf)
      out.push(...fromZip)
      continue
    }

    const buf = new Uint8Array(await file.arrayBuffer())
    if (!isProbablyText(path, buf)) {
      // Skip large/binary assets for editor import (keep structure optional)
      continue
    }
    out.push({ path, content: strFromU8(buf) })
  }

  // If folder upload wrapped in a root dir, strip it
  const rawPaths = out.map((o) => o.path)
  const { paths: stripped, root } = stripCommonRoot(rawPaths)
  if (root) {
    return out.map((o, i) => ({ ...o, path: stripped[i] }))
  }
  return out
}

export function unpackZipBytes(data: Uint8Array): ImportedPath[] {
  const unzipped = unzipSync(data)
  const out: ImportedPath[] = []
  for (const [rawPath, bytes] of Object.entries(unzipped)) {
    const path = normalizePath(rawPath)
    if (!path || path.endsWith('/')) continue
    if (shouldSkip(path)) continue
    if (!isProbablyText(path, bytes)) continue
    out.push({ path, content: strFromU8(bytes) })
  }
  const rawPaths = out.map((o) => o.path)
  const { paths: stripped, root } = stripCommonRoot(rawPaths)
  if (root) {
    return out.map((o, i) => ({ ...o, path: stripped[i] }))
  }
  return out
}

export async function readZipFile(file: File): Promise<ImportedPath[]> {
  const buf = new Uint8Array(await file.arrayBuffer())
  return unpackZipBytes(buf)
}
