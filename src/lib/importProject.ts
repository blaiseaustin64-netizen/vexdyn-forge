/**
 * Shared browser-side project import: files, folders, ZIP.
 * Used by Import Project modal and Deploy ZIP flow.
 * ZIP via native DecompressionStream (no npm dependency).
 */

import type { ProjectFile, ProjectType, FileKind } from '../types/project'
import { isBinaryAsset, isTextFile, mimeFromFilename } from '../types/project'

export interface ImportedPath {
  path: string
  content: string
  encoding?: 'utf-8' | 'base64'
  mimeType?: string
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

const MAX_BINARY_BYTES = 1_500_000

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

function bytesToUtf8(bytes: Uint8Array): string {
  return new TextDecoder('utf-8', { fatal: false }).decode(bytes)
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

export function stripCommonRoot(paths: string[]): {
  paths: string[]
  root: string | null
} {
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

function applyStripRoot(items: ImportedPath[]): ImportedPath[] {
  const rawPaths = items.map((o) => o.path)
  const { paths: stripped, root } = stripCommonRoot(rawPaths)
  if (!root) return items
  return items.map((o, i) => ({ ...o, path: stripped[i] }))
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
  if (pkgFile && pkgFile.encoding !== 'base64') {
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

  if (
    files.some((f) => f.path.endsWith('.py')) ||
    names.has('requirements.txt') ||
    names.has('pyproject.toml')
  ) {
    labels.push('Python')
    if (projectType === 'html-css-js') projectType = 'python'
  }

  if (names.has('index.html') || files.some((f) => f.path.endsWith('.html'))) {
    if (!labels.includes('HTML/CSS/JS')) labels.push('HTML/CSS/JS')
    entryHints.push('index.html')
  }

  const assetCount = files.filter((f) => f.encoding === 'base64').length
  if (assetCount > 0) labels.push(`${assetCount} asset${assetCount === 1 ? '' : 's'}`)

  if (hasPackageJson && entryHints.length === 0) {
    if (scripts.dev) entryHints.push('npm run dev')
    else if (scripts.start) entryHints.push('npm start')
  }

  const uniq = Array.from(new Set(labels))
  if (uniq.length === 0) uniq.push('Static files')

  return {
    projectType,
    labels: uniq,
    summary:
      uniq.length === 1 ? `Detected: ${uniq[0]}` : `Detected: ${uniq.join(' · ')}`,
    hasPackageJson,
    entryHints,
  }
}

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
      encoding: item.encoding || 'utf-8',
      mimeType: item.mimeType,
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

function fileFromBytes(path: string, raw: Uint8Array): ImportedPath | null {
  if (!path || path.endsWith('/') || shouldSkip(path)) return null
  const name = path.split('/').pop() || path
  if (isBinaryAsset(name)) {
    if (raw.length > MAX_BINARY_BYTES) return null
    return {
      path,
      content: bytesToBase64(raw),
      encoding: 'base64',
      mimeType: mimeFromFilename(name),
    }
  }
  // Prefer text for known text types; skip opaque binaries
  if (!isTextFile(name)) {
    // allow unknown small text-like
    const n = Math.min(raw.length, 400)
    for (let i = 0; i < n; i++) {
      if (raw[i] === 0) return null
    }
    if (raw.length > 200_000) return null
  }
  return { path, content: bytesToUtf8(raw), encoding: 'utf-8' }
}

export async function unpackZipBytes(data: Uint8Array): Promise<ImportedPath[]> {
  const out: ImportedPath[] = []
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength)
  let offset = 0

  while (offset + 30 <= data.length) {
    const sig = view.getUint32(offset, true)
    if (sig === 0x02014b50 || sig === 0x06054b50) break
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

    let raw: Uint8Array
    if (method === 0) raw = comp
    else if (method === 8) {
      try {
        raw = await inflateRaw(comp)
      } catch {
        continue
      }
    } else continue

    const item = fileFromBytes(path, raw)
    if (item) out.push(item)
  }
  return applyStripRoot(out)
}

async function readOneFile(file: File, relPath: string): Promise<ImportedPath | null> {
  const path = normalizePath(relPath)
  if (!path || shouldSkip(path)) return null
  if (path.toLowerCase().endsWith('.zip')) {
    return null // handled by caller
  }
  const buf = new Uint8Array(await file.arrayBuffer())
  return fileFromBytes(path, buf)
}

/** Read FileList from input or drop (files + optional zip members). */
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

    if (
      path.toLowerCase().endsWith('.zip') ||
      file.type === 'application/zip' ||
      file.type === 'application/x-zip-compressed'
    ) {
      const buf = new Uint8Array(await file.arrayBuffer())
      out.push(...(await unpackZipBytes(buf)))
      continue
    }

    const item = await readOneFile(file, path)
    if (item) out.push(item)
  }

  return applyStripRoot(out)
}

/** DirectoryEntry recursive reader for drag-and-drop folders */
async function readEntry(
  entry: FileSystemEntry,
  base = ''
): Promise<ImportedPath[]> {
  if (entry.isFile) {
    const fileEntry = entry as FileSystemFileEntry
    const file: File = await new Promise((resolve, reject) =>
      fileEntry.file(resolve, reject)
    )
    const path = normalizePath(base ? `${base}/${entry.name}` : entry.name)
    if (path.toLowerCase().endsWith('.zip')) {
      const buf = new Uint8Array(await file.arrayBuffer())
      return unpackZipBytes(buf)
    }
    const item = await readOneFile(file, path)
    return item ? [item] : []
  }

  if (entry.isDirectory) {
    const dir = entry as FileSystemDirectoryEntry
    const reader = dir.createReader()
    const entries: FileSystemEntry[] = []
    // readEntries may return partial batches
    for (;;) {
      const batch: FileSystemEntry[] = await new Promise((resolve, reject) =>
        reader.readEntries(resolve, reject)
      )
      if (!batch.length) break
      entries.push(...batch)
    }
    const nested: ImportedPath[] = []
    const nextBase = base ? `${base}/${entry.name}` : entry.name
    for (const child of entries) {
      nested.push(...(await readEntry(child, nextBase)))
    }
    return nested
  }
  return []
}

/**
 * Preferred entry for drag-and-drop (supports folders via webkitGetAsEntry).
 */
export async function readDataTransfer(
  dt: DataTransfer
): Promise<ImportedPath[]> {
  const items = dt.items
  if (items && items.length) {
    const entries: FileSystemEntry[] = []
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (item.kind !== 'file') continue
      const entry =
        typeof item.webkitGetAsEntry === 'function'
          ? item.webkitGetAsEntry()
          : null
      if (entry) entries.push(entry)
    }
    if (entries.length) {
      const out: ImportedPath[] = []
      for (const entry of entries) {
        out.push(...(await readEntry(entry)))
      }
      return applyStripRoot(out)
    }
  }
  // Fallback: files only
  if (dt.files?.length) return readFileList(dt.files)
  return []
}

export async function readZipFile(file: File): Promise<ImportedPath[]> {
  const buf = new Uint8Array(await file.arrayBuffer())
  return unpackZipBytes(buf)
}
