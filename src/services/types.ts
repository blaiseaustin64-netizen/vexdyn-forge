/**
 * VEXDYN FORGE — Service layer contracts
 * Clean boundaries so future backend / runtime / AI can plug in
 * without rewriting the UI.
 */

import type { Project, ProjectFile, ProjectStatus } from '../types/project'

/* ── File System ─────────────────────────────────────────────── */

export interface FileSystemService {
  listFiles(projectId: string): Promise<ProjectFile[]>
  readFile(projectId: string, fileId: string): Promise<string | null>
  writeFile(projectId: string, fileId: string, content: string): Promise<void>
  createNode(
    projectId: string,
    node: Omit<ProjectFile, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<ProjectFile>
  renameNode(projectId: string, fileId: string, name: string): Promise<void>
  deleteNode(projectId: string, fileId: string): Promise<void>
  moveNode(
    projectId: string,
    fileId: string,
    newParentId: string | null
  ): Promise<void>
}

/* ── Project Management ──────────────────────────────────────── */

export interface ProjectService {
  list(): Promise<Project[]>
  get(id: string): Promise<Project | null>
  create(name: string, starter: string): Promise<Project>
  rename(id: string, name: string): Promise<Project>
  duplicate(id: string): Promise<Project>
  remove(id: string): Promise<void>
  save(project: Project): Promise<Project>
  /** Prepare cloud migration path */
  uploadToCloud?(id: string): Promise<{ cloudId: string }>
}

/* ── Runtime / Preview ───────────────────────────────────────── */

export type RuntimeKind = 'static' | 'javascript' | 'react' | 'typescript' | 'python' | 'node'

export interface RuntimeStatus {
  kind: RuntimeKind
  state: 'idle' | 'starting' | 'running' | 'error' | 'stopped'
  message?: string
  url?: string
}

export interface RuntimeService {
  /** Can this project run in the current environment? */
  canRun(project: Project): { ok: boolean; reason?: string }
  /** Start or refresh preview / runtime */
  start(project: Project): Promise<RuntimeStatus>
  stop(projectId: string): Promise<void>
  getStatus(projectId: string): RuntimeStatus
}

/* ── Terminal ────────────────────────────────────────────────── */

export interface TerminalSession {
  id: string
  projectId: string
  cwd: string
  status: 'ready' | 'running' | 'closed' | 'error'
}

export interface TerminalService {
  /** Create a session. Real execution requires backend sandbox. */
  createSession(projectId: string): Promise<TerminalSession>
  write(sessionId: string, data: string): Promise<void>
  resize(sessionId: string, cols: number, rows: number): Promise<void>
  destroy(sessionId: string): Promise<void>
  /** Whether a real backend terminal is available */
  isAvailable(): boolean
}

/* ── Build ───────────────────────────────────────────────────── */

export interface BuildResult {
  success: boolean
  logs: string[]
  artifacts?: { path: string; size: number }[]
  error?: string
}

export interface BuildService {
  build(project: Project): Promise<BuildResult>
  getStatus(projectId: string): 'idle' | 'building' | 'success' | 'failed'
}

/* ── Deployment ──────────────────────────────────────────────── */

export interface DeploymentRecord {
  id: string
  projectId: string
  url?: string
  status: 'pending' | 'building' | 'deploying' | 'live' | 'failed'
  provider: 'cloudflare-pages' | 'workers' | 'other'
  createdAt: string
  logs?: string[]
}

export interface DeploymentService {
  deploy(projectId: string): Promise<DeploymentRecord>
  list(projectId: string): Promise<DeploymentRecord[]>
  getStatus(deploymentId: string): Promise<DeploymentRecord | null>
  /** Real Cloudflare Pages integration — not faked */
  isConfigured(): boolean
}

/* ── AI / Nyven preparation ──────────────────────────────────── */

export type AiAction =
  | 'explain'
  | 'fix'
  | 'generate-component'
  | 'modify-design'
  | 'refactor'
  | 'debug'
  | 'optimize'
  | 'create-file'
  | 'modify-file'
  | 'understand-structure'

export interface AiContext {
  projectId: string
  activeFileId?: string
  selection?: { from: number; to: number; text: string }
  openFiles?: string[]
}

export interface AiService {
  isAvailable(): boolean
  request(action: AiAction, context: AiContext, prompt?: string): Promise<{
    result: string
    fileChanges?: { path: string; content: string }[]
  }>
}

/* ── X-Ray integration ───────────────────────────────────────── */

export interface XRayService {
  checkSite(previewUrl: string): Promise<{ scanId: string }>
  getResults(scanId: string): Promise<unknown>
}

/* ── Storage abstraction ─────────────────────────────────────── */

export interface StorageAdapter {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

/* ── Problems / Diagnostics ──────────────────────────────────── */

export type DiagnosticSeverity = 'error' | 'warning' | 'info' | 'hint'

export interface Diagnostic {
  id: string
  fileId: string
  path: string
  message: string
  severity: DiagnosticSeverity
  line?: number
  column?: number
  source?: string
}

export interface DiagnosticsService {
  getForProject(projectId: string): Diagnostic[]
  getForFile(projectId: string, fileId: string): Diagnostic[]
  clear(projectId: string): void
}
