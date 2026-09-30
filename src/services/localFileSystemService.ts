/**
 * Local file system service — operates on in-memory / localStorage project files.
 */

import type { ProjectFile } from '../types/project'
import { projectStore } from '../lib/projectStore'
import type { FileSystemService } from './types'

function uid() {
  return crypto.randomUUID()
}

function now() {
  return new Date().toISOString()
}

export const localFileSystemService: FileSystemService = {
  async listFiles(projectId) {
    const p = projectStore.get(projectId)
    return p?.files ?? []
  },

  async readFile(projectId, fileId) {
    const p = projectStore.get(projectId)
    const f = p?.files.find((x) => x.id === fileId)
    return f?.content ?? null
  },

  async writeFile(projectId, fileId, content) {
    const p = projectStore.get(projectId)
    if (!p) throw new Error('Project not found')
    const files = p.files.map((f) =>
      f.id === fileId ? { ...f, content, updatedAt: now() } : f
    )
    projectStore.saveProject({ ...p, files, updatedAt: now(), status: 'saved' })
  },

  async createNode(projectId, node) {
    const p = projectStore.get(projectId)
    if (!p) throw new Error('Project not found')
    const created: ProjectFile = {
      ...node,
      id: uid(),
      createdAt: now(),
      updatedAt: now(),
    }
    projectStore.saveProject({
      ...p,
      files: [...p.files, created],
      updatedAt: now(),
    })
    return created
  },

  async renameNode(projectId, fileId, name) {
    const saved = projectStore.renameFile(projectId, fileId, name)
    if (!saved) throw new Error('Rename failed')
  },

  async deleteNode(projectId, fileId) {
    const saved = projectStore.deleteFile(projectId, fileId)
    if (!saved) throw new Error('Delete failed')
  },

  async moveNode(projectId, fileId, newParentId) {
    const p = projectStore.get(projectId)
    if (!p) throw new Error('Project not found')
    const target = p.files.find((f) => f.id === fileId)
    if (!target) throw new Error('File not found')
    const parent = newParentId
      ? p.files.find((f) => f.id === newParentId)
      : null
    if (newParentId && (!parent || parent.kind !== 'folder')) {
      throw new Error('Invalid parent')
    }
    const newPath = parent ? `${parent.path}/${target.name}` : target.name
    const files = p.files.map((f) => {
      if (f.id === fileId) {
        return { ...f, parentId: newParentId, path: newPath, updatedAt: now() }
      }
      // Update descendant paths if moving a folder
      if (target.kind === 'folder' && f.path.startsWith(target.path + '/')) {
        const rest = f.path.slice(target.path.length)
        return { ...f, path: newPath + rest, updatedAt: now() }
      }
      return f
    })
    projectStore.saveProject({ ...p, files, updatedAt: now() })
  },
}
