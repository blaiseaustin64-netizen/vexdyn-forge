/**
 * Project persistence abstraction.
 * localStorage fallback for development — replaceable by VEXDYN Core backend.
 */

import type {
  Project,
  CreateProjectInput,
  ProjectFile,
  StarterTemplate,
} from '../types/project'
import { buildStarterFiles } from './starters'
import { getLocalOwnerId } from './accountStore'

const STORAGE_KEY = 'vexdyn-forge-projects-v1'

function uid(): string {
  return crypto.randomUUID()
}

function nowIso(): string {
  return new Date().toISOString()
}

function loadAll(): Project[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Project[]
    if (!Array.isArray(parsed)) return []
    // Migrate Prompt-2 projects that lack files[]
    return parsed.map((p) => {
      if (!p.files || !Array.isArray(p.files)) {
        return {
          ...p,
          files: buildStarterFiles(p.starter || 'blank'),
        }
      }
      return p
    })
  } catch {
    return []
  }
}

function saveAll(projects: Project[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects))
  } catch {
    // storage full / unavailable
  }
}

function touchProject(p: Project): Project {
  return { ...p, updatedAt: nowIso(), status: 'saved' }
}

export const projectStore = {
  list(): Project[] {
    return loadAll().sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )
  },

  get(id: string): Project | undefined {
    return loadAll().find((p) => p.id === id)
  },

  create(input: CreateProjectInput): Project {
    const name = input.name.trim()
    if (!name) throw new Error('Project name is required')

    const projects = loadAll()
    const project: Project = {
      id: uid(),
      ownerId: getLocalOwnerId(),
      name,
      type: 'html-css-js',
      starter: input.starter,
      status: 'saved',
      createdAt: nowIso(),
      updatedAt: nowIso(),
      files: buildStarterFiles(input.starter),
      settings: {},
    }
    projects.unshift(project)
    saveAll(projects)
    return project
  },

  rename(id: string, newName: string): Project {
    const name = newName.trim()
    if (!name) throw new Error('Project name is required')
    const projects = loadAll()
    const idx = projects.findIndex((p) => p.id === id)
    if (idx === -1) throw new Error('Project not found')
    projects[idx] = { ...projects[idx], name, updatedAt: nowIso() }
    saveAll(projects)
    return projects[idx]
  },

  duplicate(id: string): Project {
    const projects = loadAll()
    const source = projects.find((p) => p.id === id)
    if (!source) throw new Error('Project not found')
    // Deep-copy files so contents are independent
    const files: ProjectFile[] = source.files.map((f) => ({
      ...f,
      id: uid(),
      content: f.content,
    }))
    // Re-map parentIds if needed — for flat starters parentId is null
    const copy: Project = {
      ...source,
      id: uid(),
      name: `${source.name} Copy`,
      status: 'saved',
      createdAt: nowIso(),
      updatedAt: nowIso(),
      files,
    }
    projects.unshift(copy)
    saveAll(projects)
    return copy
  },

  remove(id: string): void {
    saveAll(loadAll().filter((p) => p.id !== id))
  },

  /** Persist full project (files + metadata) */
  saveProject(project: Project): Project {
    const projects = loadAll()
    const idx = projects.findIndex((p) => p.id === project.id)
    const next = touchProject({ ...project, status: 'saved' })
    if (idx === -1) projects.unshift(next)
    else projects[idx] = next
    saveAll(projects)
    return next
  },

  updateFileContent(
    projectId: string,
    fileId: string,
    content: string
  ): Project | undefined {
    const projects = loadAll()
    const idx = projects.findIndex((p) => p.id === projectId)
    if (idx === -1) return undefined
    const files = projects[idx].files.map((f) =>
      f.id === fileId
        ? { ...f, content, updatedAt: nowIso() }
        : f
    )
    projects[idx] = touchProject({ ...projects[idx], files })
    saveAll(projects)
    return projects[idx]
  },

  addFile(projectId: string, file: ProjectFile): Project | undefined {
    const projects = loadAll()
    const idx = projects.findIndex((p) => p.id === projectId)
    if (idx === -1) return undefined
    const files = [...projects[idx].files, file]
    projects[idx] = touchProject({ ...projects[idx], files })
    saveAll(projects)
    return projects[idx]
  },

  renameFile(
    projectId: string,
    fileId: string,
    newName: string
  ): Project | undefined {
    const name = newName.trim()
    if (!name) throw new Error('Name is required')
    const projects = loadAll()
    const idx = projects.findIndex((p) => p.id === projectId)
    if (idx === -1) return undefined
    const target = projects[idx].files.find((f) => f.id === fileId)
    if (!target) return undefined

    const parentPath = target.path.includes('/')
      ? target.path.slice(0, target.path.lastIndexOf('/'))
      : ''
    const newPath = parentPath ? `${parentPath}/${name}` : name

    // Also update children paths if folder
    const files = projects[idx].files.map((f) => {
      if (f.id === fileId) {
        return { ...f, name, path: newPath, updatedAt: nowIso() }
      }
      if (target.kind === 'folder' && f.path.startsWith(target.path + '/')) {
        const rest = f.path.slice(target.path.length)
        return { ...f, path: newPath + rest, updatedAt: nowIso() }
      }
      return f
    })
    projects[idx] = touchProject({ ...projects[idx], files })
    saveAll(projects)
    return projects[idx]
  },

  deleteFile(projectId: string, fileId: string): Project | undefined {
    const projects = loadAll()
    const idx = projects.findIndex((p) => p.id === projectId)
    if (idx === -1) return undefined
    const target = projects[idx].files.find((f) => f.id === fileId)
    if (!target) return undefined

    let files: ProjectFile[]
    if (target.kind === 'folder') {
      files = projects[idx].files.filter(
        (f) => f.id !== fileId && !f.path.startsWith(target.path + '/')
      )
    } else {
      files = projects[idx].files.filter((f) => f.id !== fileId)
    }
    projects[idx] = touchProject({ ...projects[idx], files })
    saveAll(projects)
    return projects[idx]
  },
}

export function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime()
  const now = Date.now()
  const diffSec = Math.round((now - then) / 1000)

  if (diffSec < 10) return 'Edited just now'
  if (diffSec < 60) return `Edited ${diffSec} seconds ago`
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `Edited ${diffMin} minute${diffMin === 1 ? '' : 's'} ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `Edited ${diffHr} hour${diffHr === 1 ? '' : 's'} ago`
  const diffDay = Math.floor(diffHr / 24)
  if (diffDay === 1) return 'Edited yesterday'
  if (diffDay < 7) return `Edited ${diffDay} days ago`
  return `Edited ${new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })}`
}

export function starterLabel(starter: StarterTemplate): string {
  const map: Record<StarterTemplate, string> = {
    blank: 'Blank',
    landing: 'Landing Page',
    portfolio: 'Portfolio',
  }
  return map[starter]
}
