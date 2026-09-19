/**
 * VEXDYN FORGE — Project model
 * Prompt 2: metadata  |  Prompt 3: files + contents
 */

export type ProjectType = 'html-css-js'
export type StarterTemplate = 'blank' | 'landing' | 'portfolio'
export type ProjectStatus = 'saved' | 'unsaved' | 'saving' | 'error'

export type FileKind = 'file' | 'folder'

export interface ProjectFile {
  id: string
  name: string
  path: string // e.g. "index.html" or "assets/logo.svg"
  kind: FileKind
  /** Only for kind === 'file' */
  content?: string
  parentId: string | null
  createdAt: string
  updatedAt: string
}

export interface Project {
  id: string
  ownerId: string
  name: string
  type: ProjectType
  starter: StarterTemplate
  status: ProjectStatus
  createdAt: string
  updatedAt: string
  files: ProjectFile[]
  settings?: Record<string, unknown>
}

export interface CreateProjectInput {
  name: string
  starter: StarterTemplate
}

export const STARTER_OPTIONS: {
  id: StarterTemplate
  label: string
  description: string
}[] = [
  {
    id: 'blank',
    label: 'BLANK',
    description: 'Start with a clean HTML, CSS and JavaScript project.',
  },
  {
    id: 'landing',
    label: 'LANDING PAGE',
    description: 'Start with a modern landing page foundation.',
  },
  {
    id: 'portfolio',
    label: 'PORTFOLIO',
    description: 'Start with a personal portfolio foundation.',
  },
]

export const PROJECT_TYPE_LABEL: Record<ProjectType, string> = {
  'html-css-js': 'HTML / CSS / JS',
}

export function isTextFile(name: string): boolean {
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  return ['html', 'htm', 'css', 'js', 'mjs', 'json', 'svg', 'txt', 'md'].includes(ext)
}

export function languageFromFilename(name: string): 'html' | 'css' | 'javascript' | 'text' {
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  if (ext === 'html' || ext === 'htm') return 'html'
  if (ext === 'css') return 'css'
  if (ext === 'js' || ext === 'mjs') return 'javascript'
  return 'text'
}
