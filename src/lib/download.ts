/**
 * Download project as ZIP.
 * Uses JSZip when available; falls back to a simple multi-file approach.
 */

import type { Project, ProjectFile } from '../types/project'

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'project'
}

/** Minimal ZIP writer (store method only) — no external dep required */
function crc32(buf: Uint8Array): number {
  let c = ~0
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i]
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1
    }
  }
  return ~c >>> 0
}

function u16(n: number): Uint8Array {
  const b = new Uint8Array(2)
  b[0] = n & 0xff
  b[1] = (n >> 8) & 0xff
  return b
}

function u32(n: number): Uint8Array {
  const b = new Uint8Array(4)
  b[0] = n & 0xff
  b[1] = (n >> 8) & 0xff
  b[2] = (n >> 16) & 0xff
  b[3] = (n >> 24) & 0xff
  return b
}

function concat(parts: Uint8Array[]): Uint8Array {
  const len = parts.reduce((s, p) => s + p.length, 0)
  const out = new Uint8Array(len)
  let o = 0
  for (const p of parts) {
    out.set(p, o)
    o += p.length
  }
  return out
}

function encodeUtf8(s: string): Uint8Array {
  return new TextEncoder().encode(s)
}

function zipStore(files: { path: string; data: Uint8Array }[]): Blob {
  const localParts: Uint8Array[] = []
  const centralParts: Uint8Array[] = []
  let offset = 0

  for (const f of files) {
    const nameBytes = encodeUtf8(f.path)
    const crc = crc32(f.data)
    const localHeader = concat([
      u32(0x04034b50),
      u16(20),
      u16(0),
      u16(0), // store
      u16(0),
      u16(0),
      u32(crc),
      u32(f.data.length),
      u32(f.data.length),
      u16(nameBytes.length),
      u16(0),
      nameBytes,
      f.data,
    ])
    localParts.push(localHeader)

    const central = concat([
      u32(0x02014b50),
      u16(20),
      u16(20),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(crc),
      u32(f.data.length),
      u32(f.data.length),
      u16(nameBytes.length),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(0),
      u32(offset),
      nameBytes,
    ])
    centralParts.push(central)
    offset += localHeader.length
  }

  const centralDir = concat(centralParts)
  const end = concat([
    u32(0x06054b50),
    u16(0),
    u16(0),
    u16(files.length),
    u16(files.length),
    u32(centralDir.length),
    u32(offset),
    u16(0),
  ])

  return new Blob([concat([...localParts, centralDir, end])], {
    type: 'application/zip',
  })
}

export async function downloadProject(project: Project): Promise<void> {
  const entries: { path: string; data: Uint8Array }[] = []

  // Ensure folders appear (empty folder entries as path ending with /)
  const folders = project.files.filter((f) => f.kind === 'folder')
  for (const folder of folders) {
    const path = folder.path.endsWith('/') ? folder.path : folder.path + '/'
    entries.push({ path, data: new Uint8Array(0) })
  }

  const textFiles = project.files.filter((f) => f.kind === 'file')
  for (const f of textFiles) {
    entries.push({
      path: f.path,
      data: encodeUtf8(f.content ?? ''),
    })
  }

  if (entries.length === 0) {
    entries.push({
      path: 'README.txt',
      data: encodeUtf8('Empty VEXDYN FORGE project\n'),
    })
  }

  const blob = zipStore(entries)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${slugify(project.name)}.zip`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export type { ProjectFile }
