/**
 * Client-side project packaging for deployment.
 * Static HTML/CSS/JS only in this phase.
 */

import type { Project, ProjectFile } from '../types/project'
import type {
  DeployFramework,
  DeployPackage,
  DeployFilePayload,
} from '../services/types'

const SKIP_NAMES = new Set([
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  '.DS_Store',
  'Thumbs.db',
])

const SKIP_PREFIXES = ['.git/', 'node_modules/', 'dist/', 'build/', '.forge/']

export function slugifyProjectName(name: string): string {
  let slug = name
    .toLowerCase()
    .trim()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
  if (!slug) slug = 'forge-project'
  // Cloudflare Pages project names: max 58, alphanumeric + hyphens
  if (slug.length > 50) slug = slug.slice(0, 50).replace(/-+$/, '')
  if (!/^[a-z]/.test(slug)) slug = `p-${slug}`
  return slug
}

export function detectFramework(project: Project): {
  framework: DeployFramework
  supported: boolean
  reason?: string
  entry?: string
} {
  const files = project.files ?? []
  const paths = files.filter((f) => f.kind === 'file').map((f) => f.path)

  const hasPkg = paths.includes('package.json')
  const hasVite =
    paths.includes('vite.config.js') ||
    paths.includes('vite.config.ts') ||
    paths.includes('vite.config.mjs')
  const hasTsx = paths.some((p) => p.endsWith('.tsx'))
  const hasJsx = paths.some((p) => p.endsWith('.jsx'))
  const hasIndexHtml = paths.includes('index.html') || paths.some((p) => p.endsWith('.html'))

  if (hasPkg || hasVite || hasTsx || hasJsx) {
    if (hasTsx) {
      return {
        framework: 'react-ts',
        supported: false,
        reason:
          'React / TypeScript projects require a build runtime that is not connected yet. Deploy a static HTML/CSS/JS project for now.',
        entry: hasIndexHtml ? 'index.html' : undefined,
      }
    }
    if (hasJsx || hasVite) {
      return {
        framework: hasVite ? 'vite' : 'react',
        supported: false,
        reason:
          'React / Vite projects require a build step that is not available yet. Deploy a static HTML/CSS/JS project for now.',
        entry: hasIndexHtml ? 'index.html' : undefined,
      }
    }
  }

  if (!hasIndexHtml) {
    return {
      framework: 'unsupported',
      supported: false,
      reason:
        'No HTML entry file found. Add an index.html (or any .html file) for static deployment.',
    }
  }

  return {
    framework: 'static',
    supported: true,
    entry: paths.includes('index.html')
      ? 'index.html'
      : paths.find((p) => p.endsWith('.html')),
  }
}

function shouldInclude(file: ProjectFile): boolean {
  if (file.kind !== 'file') return false
  if (file.content == null) return false
  if (SKIP_NAMES.has(file.name)) return false
  const path = file.path.replace(/^\/+/, '')
  if (SKIP_PREFIXES.some((p) => path.startsWith(p))) return false
  // Skip binary-looking large placeholders
  if (file.content.startsWith('data:') && file.content.length > 500_000) return false
  return true
}

export function packageStaticProject(
  project: Project,
  environment: 'production' | 'preview' = 'production'
): DeployPackage {
  const detection = detectFramework(project)
  if (!detection.supported) {
    throw new Error(detection.reason ?? 'Project type not supported for deployment')
  }

  const files: DeployFilePayload[] = []
  for (const f of project.files ?? []) {
    if (!shouldInclude(f)) continue
    files.push({
      path: f.path.replace(/^\/+/, ''),
      content: f.content ?? '',
      encoding: 'utf-8',
    })
  }

  if (files.length === 0) {
    throw new Error('No deployable files found in this project.')
  }

  // Ensure index.html exists at root when possible
  const hasRootIndex = files.some((f) => f.path === 'index.html')
  if (!hasRootIndex) {
    const html = files.find((f) => f.path.endsWith('.html'))
    if (html && html.path !== 'index.html') {
      // Keep original; CF will use directory listing or we rename for static
      files.push({
        path: 'index.html',
        content: html.content,
        encoding: 'utf-8',
      })
    }
  }

  return {
    projectId: project.id,
    projectName: project.name,
    slug: slugifyProjectName(project.name),
    framework: 'static',
    environment,
    files,
    entry: detection.entry ?? 'index.html',
  }
}
