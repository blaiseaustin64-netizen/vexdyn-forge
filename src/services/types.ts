/**
 * VEXDYN FORGE — Service layer contracts
 */

import type { Project, ProjectFile } from '../types/project'

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

export interface ProjectService {
  list(): Promise<Project[]>
  get(id: string): Promise<Project | null>
  create(name: string, starter: string): Promise<Project>
  rename(id: string, name: string): Promise<Project>
  duplicate(id: string): Promise<Project>
  remove(id: string): Promise<void>
  save(project: Project): Promise<Project>
  uploadToCloud?(id: string): Promise<{ cloudId: string }>
}

export type RuntimeKind =
  | 'static'
  | 'javascript'
  | 'react'
  | 'typescript'
  | 'python'
  | 'node'

export interface RuntimeStatus {
  kind: RuntimeKind
  state: 'idle' | 'starting' | 'running' | 'error' | 'stopped'
  message?: string
  url?: string
}

export interface RuntimeService {
  canRun(project: Project): { ok: boolean; reason?: string }
  start(project: Project): Promise<RuntimeStatus>
  stop(projectId: string): Promise<void>
  getStatus(projectId: string): RuntimeStatus
}

export interface TerminalSession {
  id: string
  projectId: string
  cwd: string
  status: 'ready' | 'running' | 'closed' | 'error'
}

export interface TerminalService {
  createSession(projectId: string): Promise<TerminalSession>
  write(sessionId: string, data: string): Promise<void>
  resize(sessionId: string, cols: number, rows: number): Promise<void>
  destroy(sessionId: string): Promise<void>
  isAvailable(): boolean
}

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

export type DeployStageId =
  | 'preparing'
  | 'validating'
  | 'building'
  | 'packaging'
  | 'uploading'
  | 'deploying'
  | 'finalizing'

export type DeployStatus =
  | 'queued'
  | 'preparing'
  | 'validating'
  | 'building'
  | 'packaging'
  | 'uploading'
  | 'deploying'
  | 'finalizing'
  | 'ready'
  | 'failed'
  | 'cancelled'

export type DeployFramework =
  | 'static'
  | 'react'
  | 'react-ts'
  | 'vite'
  | 'unsupported'

export interface DeployFilePayload {
  path: string
  content: string
  encoding?: 'utf-8' | 'base64'
}

export interface DeployPackage {
  projectId: string
  projectName: string
  slug: string
  framework: DeployFramework
  environment: 'production' | 'preview'
  files: DeployFilePayload[]
  entry?: string
}

export interface DeployStageInfo {
  id: DeployStageId
  label: string
  status: 'pending' | 'running' | 'done' | 'failed' | 'skipped'
  detail?: string
  logs?: string[]
  /** Optional timing (streamed deploys) */
  startedAt?: string
  finishedAt?: string
  durationMs?: number
}

export interface DeploymentRecord {
  id: string
  projectId: string
  projectName: string
  environment: 'production' | 'preview'
  status: DeployStatus
  framework: DeployFramework
  provider: 'cloudflare-pages' | 'workers' | 'other'
  url?: string
  slug?: string
  createdAt: string
  startedAt?: string
  finishedAt?: string
  stages?: DeployStageInfo[]
  logs?: string[]
  error?: string
  version?: number
  /** Optional: which stage failed */
  failedStage?: DeployStageId
  /** Optional: human recovery hint */
  hint?: string
  /** Optional: total duration */
  durationMs?: number
}

export interface DeployStartRequest {
  package: DeployPackage
}

export interface DeployStartResponse {
  deploymentId: string
  status: DeployStatus
  stages?: DeployStageInfo[]
  message?: string
  record?: DeploymentRecord
}

/** NDJSON stream events from POST /api/deploy (Accept: application/x-ndjson) */
export type DeployStreamEvent =
  | {
      type: 'stage'
      id: DeployStageId
      status: DeployStageInfo['status']
      detail?: string
      ts: number
    }
  | {
      type: 'log'
      stage: DeployStageId
      line: string
      ts: number
    }
  | {
      type: 'error'
      stage?: DeployStageId
      message: string
      hint?: string
      ts?: number
    }
  | {
      type: 'done'
      record: DeploymentRecord
    }

export interface DeploymentService {
  isConfigured(): boolean
  detectFramework(project: Project): {
    framework: DeployFramework
    supported: boolean
    reason?: string
    entry?: string
  }
  packageProject(
    project: Project,
    environment: 'production' | 'preview'
  ): Promise<DeployPackage>
  start(request: DeployStartRequest): Promise<DeployStartResponse>
  /**
   * Stream live stage/log events (NDJSON). Falls back to legacy JSON start()
   * if the Worker does not return a stream.
   */
  startStream?(
    request: DeployStartRequest,
    onEvent: (event: DeployStreamEvent) => void
  ): Promise<DeploymentRecord>
  getStatus(deploymentId: string): Promise<DeploymentRecord | null>
  list(projectId: string): Promise<DeploymentRecord[]>
  cancel?(deploymentId: string): Promise<boolean>
  deploy?(projectId: string): Promise<DeploymentRecord>
}

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
  request(
    action: AiAction,
    context: AiContext,
    prompt?: string
  ): Promise<{ text: string; patches?: { path: string; content: string }[] }>
}
