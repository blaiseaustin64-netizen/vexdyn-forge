/**
 * Browser-side project import: files, folders, ZIP.
 * ZIP via native DecompressionStream (no npm dependency).
 * Does not execute project code or install packages.
 */

import type { ProjectFile, ProjectType, FileKind } from '../types/project'

export interface ImportedPath {
  path: string
  content: string
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
  const n = Math.min(bytes.length, 800)
  for (let i = 0; i < n; i++) {
    if (bytes[i] === 0) return false
  }
  return bytes.length < 256_000
}

function bytesToUtf8(bytes: Uint8Array): string {
  return new TextDecoder('utf-8', { fatal: false }).decode(bytes)
}

/** Strip a single common root folder when all files share it */
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
  const pkgFile = files.find(
    (f) => f.path === 'package.json' || f.path.endsWith('/package.json')
  )
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
  } else if (
    deps['vite'] ||
    names.has('vite.config.js') ||
    names.has('vite.config.ts') ||
    names.has('vite.config.mjs')
  ) {
    labels.push('Vite')
    projectType = 'vite'
  }

  if (deps['react'] || deps['react-dom']) {
    labels.push('React')
    if (deps['typescript'] || names.has('tsconfig.json')) {
      labels.push('TypeScript')
      if (projectType === 'html-css-js') projectType = 'react-ts'
      else if (projectType !== 'vite' && projectType !== 'next') projectType = 'react-ts'
    } else if (projectType === 'html-css-js') {
      projectType = 'react'
    }
  } else if (deps['typescript'] || names.has('tsconfig.json')) {
    labels.push('TypeScript')
  }

  if (deps['tailwindcss'] || files.some((f) => /tailwind\.config/i.test(f.path))) {
    labels.push('Tailwind')
    if (projectType === 'html-css-js') projectType = 'tailwind'
  }

  const hasPy = files.some((f) => f.path.endsWith('.py'))
  if (hasPy || names.has('requirements.txt') || names.has('pyproject.toml')) {
    labels.push('Python')
    if (projectType === 'html-css-js') projectType = 'python'
  }

  if (names.has('index.html') || files.some((f) => f.path.endsWith('.html'))) {
    if (!labels.includes('HTML/CSS/JS')) labels.push('HTML/CSS/JS')
    entryHints.push('index.html')
  }

  if (hasPackageJson && entryHints.length === 0) {
    if (scripts.dev) entryHints.push('npm run dev')
    else if (scripts.start) entryHints.push('npm start')
  }

  const uniq = Array.from(new Set(labels))
  if (uniq.length === 0) uniq.push('Static files')

  const summary =
    uniq.length === 1 ? `Detected: ${uniq[0]}` : `Detected: ${uniq.join(' · ')}`

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
  const folderIds = new Map<string, string>()
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

  const sorted = [...imported].sort((a, b) => a.path.localeCompare(b.path))
  for (const item of sorted) {
    const path = normalizePath(item.path)
    if (!path || shouldSkip(path)) continue
    const parentPath = path.includes('/')
      ? path.slice(0, path.lastIndexOf('/'))
      : ''
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

async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error(
      'This browser cannot decompress ZIP files. Try uploading individual files instead.'
    )
  }
  const stream = new Blob([data]).stream().pipeThrough(
    new DecompressionStream('deflate-raw')
  )
  const buf = await new Response(stream).arrayBuffer()
  return new Uint8Array(buf)
}

/**
 * Minimal ZIP reader (local file headers).
 * Supports store (0) and deflate (8) via DecompressionStream.
 */
export async function unpackZipBytes(data: Uint8Array): Promise<ImportedPath[]> {
  const out: ImportedPath[] = []
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength)
  let offset = 0

  while (offset + 30 <= data.length) {
    const sig = view.getUint32(offset, true)
    if (sig === 0x02014b50 || sig === 0x06054b50) break // central dir / EOCD
    if (sig !== 0x04034b50) break

    const method = view.getUint16(offset + 8, true)
    const compSize = view.getUint32(offset + 18, true)
    const nameLen = view.getUint16(offset + 26, true)
    const extraLen = view.getUint16(offset + 28, true)
    const nameStart = offset + 30
    const nameBytes = data.subarray(nameStart, nameStart + nameLen)
    const path = normalizePath(bytesToUtf8(nameBytes))
    const dataStart = nameStart + nameLen + extraLen
    const comp = data.subarray(dataStart, dataStart + compSize)
    offset = dataStart + compSize

    if (!path || path.endsWith('/')) continue
    if (shouldSkip(path)) continue

    let raw: Uint8Array
    if (method === 0) {
      raw = comp
    } else if (method === 8) {
      try {
        raw = await inflateRaw(comp)
      } catch {
        continue
      }
    } else {
      continue
    }

    if (!isProbablyText(path, raw)) continue
    out.push({ path, content: bytesToUtf8(raw) })
  }

  const rawPaths = out.map((o) => o.path)
  const { paths: stripped, root } = stripCommonRoot(rawPaths)
  if (root) {
    return out.map((o, i) => ({ ...o, path: stripped[i] }))
  }
  return out
}

export async function readFileList(
  fileList: FileList | File[]
): Promise<ImportedPath[]> {
  const files = Array.from(fileList)
  const out: ImportedPath[] = []

  for (const file of files) {
    const rel =
      (file as File & { webkitRelativePath?: string }).webkitRelativePath ||
      file.name
    const path = normalizePath(rel)
    if (!path || shouldSkip(path)) continue

    if (path.toLowerCase().endsWith('.zip') || file.type === 'application/zip') {
      const buf = new Uint8Array(await file.arrayBuffer())
      const fromZip = await unpackZipBytes(buf)
      out.push(...fromZip)
      continue
    }

    const buf = new Uint8Array(await file.arrayBuffer())
    if (!isProbablyText(path, buf)) continue
    out.push({ path, content: bytesToUtf8(buf) })
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
