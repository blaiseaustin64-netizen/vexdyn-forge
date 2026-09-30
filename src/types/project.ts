/**
 * VEXDYN FORGE — Project model
 * Expanded for multi-language / multi-stack support while preserving V1 data.
 */

export type ProjectType =
  | 'html-css-js'
  | 'react'
  | 'react-ts'
  | 'vite'
  | 'next'
  | 'python'
  | 'node'
  | 'tailwind'
  | 'other'

export type StarterTemplate =
  | 'blank'
  | 'landing'
  | 'portfolio'
  | 'react'
  | 'react-ts'
  | 'html-css-js'
  | 'tailwind'
  | 'saas'
  | 'dashboard'
  | 'business'
  | 'ecommerce'
  | 'ai-app'
  | 'fullstack'

export type ProjectStatus = 'saved' | 'unsaved' | 'saving' | 'error'

export type FileKind = 'file' | 'folder'

export type EditorLanguage =
  | 'html'
  | 'css'
  | 'javascript'
  | 'typescript'
  | 'jsx'
  | 'tsx'
  | 'json'
  | 'markdown'
  | 'python'
  | 'sql'
  | 'yaml'
  | 'bash'
  | 'svg'
  | 'text'

export interface ProjectFile {
  id: string
  name: string
  path: string // e.g. "index.html" or "src/components/App.tsx"
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
  /** Cloud migration fields (prepared, unused until backend) */
  cloudId?: string
  version?: number
  lastSyncedAt?: string
}

export interface CreateProjectInput {
  name: string
  starter: StarterTemplate
}

export const STARTER_OPTIONS: {
  id: StarterTemplate
  label: string
  description: string
  available: boolean
}[] = [
  {
    id: 'blank',
    label: 'BLANK',
    description: 'Start with a clean HTML, CSS and JavaScript project.',
    available: true,
  },
  {
    id: 'landing',
    label: 'LANDING PAGE',
    description: 'Start with a modern landing page foundation.',
    available: true,
  },
  {
    id: 'portfolio',
    label: 'PORTFOLIO',
    description: 'Start with a personal portfolio foundation.',
    available: true,
  },
  {
    id: 'html-css-js',
    label: 'HTML / CSS / JS',
    description: 'Structured multi-file static web project.',
    available: true,
  },
  {
    id: 'react',
    label: 'REACT',
    description: 'React project structure (preview limited until runtime).',
    available: true,
  },
  {
    id: 'react-ts',
    label: 'REACT + TYPESCRIPT',
    description: 'React + TypeScript starter structure.',
    available: true,
  },
  {
    id: 'tailwind',
    label: 'TAILWIND',
    description: 'HTML project prepared for Tailwind CSS.',
    available: true,
  },
  {
    id: 'saas',
    label: 'SAAS',
    description: 'SaaS marketing + app shell skeleton.',
    available: false,
  },
  {
    id: 'dashboard',
    label: 'DASHBOARD',
    description: 'Admin dashboard layout starter.',
    available: false,
  },
  {
    id: 'business',
    label: 'BUSINESS',
    description: 'Business / company site foundation.',
    available: false,
  },
  {
    id: 'ecommerce',
    label: 'E-COMMERCE',
    description: 'Product listing and cart skeleton.',
    available: false,
  },
  {
    id: 'ai-app',
    label: 'AI APPLICATION',
    description: 'AI-powered app shell.',
    available: false,
  },
  {
    id: 'fullstack',
    label: 'FULL-STACK',
    description: 'Full-stack starter (requires backend runtime).',
    available: false,
  },
]

export const PROJECT_TYPE_LABEL: Record<ProjectType, string> = {
  'html-css-js': 'HTML / CSS / JS',
  react: 'React',
  'react-ts': 'React + TypeScript',
  vite: 'Vite',
  next: 'Next.js',
  python: 'Python',
  node: 'Node.js',
  tailwind: 'Tailwind',
  other: 'Other',
}

export function isTextFile(name: string): boolean {
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  return [
    'html', 'htm', 'css', 'js', 'mjs', 'cjs', 'ts', 'tsx', 'jsx',
    'json', 'svg', 'txt', 'md', 'markdown', 'py', 'sql', 'yml', 'yaml',
    'sh', 'bash', 'env', 'gitignore', 'toml', 'xml', 'vue', 'svelte',
  ].includes(ext)
}

export function languageFromFilename(name: string): EditorLanguage {
  const lower = name.toLowerCase()
  const ext = lower.split('.').pop() ?? ''

  if (ext === 'html' || ext === 'htm') return 'html'
  if (ext === 'css') return 'css'
  if (ext === 'js' || ext === 'mjs' || ext === 'cjs') return 'javascript'
  if (ext === 'ts') return 'typescript'
  if (ext === 'jsx') return 'jsx'
  if (ext === 'tsx') return 'tsx'
  if (ext === 'json') return 'json'
  if (ext === 'md' || ext === 'markdown') return 'markdown'
  if (ext === 'py') return 'python'
  if (ext === 'sql') return 'sql'
  if (ext === 'yml' || ext === 'yaml') return 'yaml'
  if (ext === 'sh' || ext === 'bash') return 'bash'
  if (ext === 'svg') return 'svg'
  return 'text'
}

export function starterToProjectType(starter: StarterTemplate): ProjectType {
  switch (starter) {
    case 'react':
      return 'react'
    case 'react-ts':
      return 'react-ts'
    case 'tailwind':
      return 'tailwind'
    case 'fullstack':
      return 'node'
    default:
      return 'html-css-js'
  }
}
