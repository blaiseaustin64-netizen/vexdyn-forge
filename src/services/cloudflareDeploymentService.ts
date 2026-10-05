/**
 * Real deployment service — talks to VEXDYN deployment backend only.
 * Cloudflare credentials never leave the server.
 */

import type { Project } from '../types/project'
import type {
  DeploymentService,
  DeploymentRecord,
  DeployStartRequest,
  DeployStartResponse,
  DeployStreamEvent,
} from './types'
import {
  detectFramework as detect,
  packageStaticProject,
} from '../lib/deployPackage'

const HISTORY_KEY = 'vexdyn-forge-deployments-v1'

/**
 * Resolve API base URL.
 * Accepts either:
 *   https://worker.example.workers.dev
 *   https://worker.example.workers.dev/
 *   https://worker.example.workers.dev/api
 *   https://worker.example.workers.dev/api/deploy  (full endpoint — stripped)
 * Never returns a same-origin relative path (that causes Pages 405 on POST).
 */
function apiBase(): string {
  let raw =
    (import.meta.env.VITE_DEPLOY_API_URL as string | undefined)?.trim() ?? ''

  // Optional runtime override (set in console for debugging)
  if (typeof window !== 'undefined') {
    const w = (window as unknown as { __VEXDYN_DEPLOY_API_URL__?: string })
      .__VEXDYN_DEPLOY_API_URL__
    if (w) raw = String(w).trim()
  }

  if (!raw) return ''

  // Relative URLs would POST to the Forge Pages host → HTTP 405
  if (raw.startsWith('/') || raw.startsWith('./')) {
    console.error(
      '[Forge Deploy] VITE_DEPLOY_API_URL must be an absolute Worker URL, not a relative path:',
      raw
    )
    return ''
  }

  let base = raw.replace(/\/+$/, '')
  // Strip accidental full endpoint suffix so we don't POST to .../api/deploy/api/deploy
  base = base.replace(/\/api\/deploy$/i, '')
  base = base.replace(/\/api$/i, '')
  return base.replace(/\/+$/, '')
}

function endpoint(path: string): string {
  const base = apiBase()
  if (!base) return ''
  const p = path.startsWith('/') ? path : `/${path}`
  return `${base}${p}`
}

function loadHistory(): DeploymentRecord[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as DeploymentRecord[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveHistory(records: DeploymentRecord[]): void {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(records.slice(0, 200)))
  } catch {
    /* ignore */
  }
}

function upsertRecord(record: DeploymentRecord): void {
  const all = loadHistory().filter((r) => r.id !== record.id)
  all.unshift(record)
  saveHistory(all)
}

/**
 * Read NDJSON lines from a fetch body and invoke onEvent for each parsed object.
 */
async function readNdjsonStream(
  body: ReadableStream<Uint8Array>,
  onEvent: (event: DeployStreamEvent) => void
): Promise<DeploymentRecord | null> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let finalRecord: DeploymentRecord | null = null

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    let nl: number
    while ((nl = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, nl).trim()
      buffer = buffer.slice(nl + 1)
      if (!line) continue
      try {
        const event = JSON.parse(line) as DeployStreamEvent
        if (event.type === 'done' && event.record) {
          finalRecord = event.record
        }
        onEvent(event)
        if (import.meta.env.DEV && event.type === 'stage') {
          console.debug('[Forge Deploy stream]', event.id, event.status, event.detail)
        }
      } catch {
        console.warn('[Forge Deploy] bad NDJSON line', line.slice(0, 120))
      }
    }
  }

  // trailing line without newline
  const tail = buffer.trim()
  if (tail) {
    try {
      const event = JSON.parse(tail) as DeployStreamEvent
      if (event.type === 'done' && event.record) finalRecord = event.record
      onEvent(event)
    } catch {
      /* ignore */
    }
  }

  return finalRecord
}

export const cloudflareDeploymentService: DeploymentService = {
  isConfigured() {
    return Boolean(apiBase())
  },

  detectFramework(project: Project) {
    return detect(project)
  },

  async packageProject(project, environment) {
    return packageStaticProject(project, environment)
  },

  async start(request: DeployStartRequest): Promise<DeployStartResponse> {
    const base = apiBase()
    if (!base) {
      throw new Error(
        'Deployment backend is not configured. Set VITE_DEPLOY_API_URL to your Worker origin (e.g. https://vexdyn-forge-deploy.xxx.workers.dev), not a relative path and not the Forge site URL.'
      )
    }

    const url = endpoint('/api/deploy')
    let res: Response
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      })
    } catch (e) {
      throw new Error(
        `Could not reach deployment API at ${url}. ${
          e instanceof Error ? e.message : String(e)
        }`
      )
    }

    const data = (await res.json().catch(() => ({}))) as DeployStartResponse & {
      error?: string
      record?: DeploymentRecord
    }

    // Prefer structured failure with stages over a bare status code
    if (data.record) {
      upsertRecord(data.record)
      if (data.record.status === 'failed' || data.record.status === 'cancelled') {
        return {
          deploymentId: data.deploymentId || data.record.id,
          status: data.record.status,
          stages: data.record.stages,
          message: data.error || data.message || data.record.error,
          record: data.record,
        }
      }
    }

    if (!res.ok) {
      const detail =
        data.error ||
        data.message ||
        (res.status === 405
          ? `Method not allowed (405) for POST ${url}. Check that VITE_DEPLOY_API_URL points at the Worker origin, not the Forge Pages site.`
          : `Deploy failed (${res.status}) for ${url}`)
      throw new Error(detail)
    }

    if (data.record) {
      upsertRecord(data.record)
    }

    return {
      deploymentId: data.deploymentId,
      status: data.status,
      stages: data.stages,
      message: data.message,
      record: data.record,
    }
  },

  /**
   * Live stage streaming. Requests NDJSON; falls back to legacy JSON if needed.
   */
  async startStream(
    request: DeployStartRequest,
    onEvent: (event: DeployStreamEvent) => void
  ): Promise<DeploymentRecord> {
    const base = apiBase()
    if (!base) {
      throw new Error(
        'Deployment backend is not configured. Set VITE_DEPLOY_API_URL to your Worker origin.'
      )
    }

    const url = endpoint('/api/deploy')
    let res: Response
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/x-ndjson',
        },
        body: JSON.stringify(request),
      })
    } catch (e) {
      throw new Error(
        `Could not reach deployment API at ${url}. ${
          e instanceof Error ? e.message : String(e)
        }`
      )
    }

    const ct = (res.headers.get('content-type') || '').toLowerCase()
    const isNdjson =
      ct.includes('application/x-ndjson') || ct.includes('ndjson')

    if (isNdjson && res.body) {
      const record = await readNdjsonStream(res.body, onEvent)
      if (record) {
        upsertRecord(record)
        return record
      }
      // Stream ended without done — try status poll is caller's job
      throw new Error(
        res.ok
          ? 'Deployment stream ended without a final record'
          : `Deploy stream failed (${res.status})`
      )
    }

    // Legacy JSON fallback
    const data = (await res.json().catch(() => ({}))) as DeployStartResponse & {
      error?: string
      record?: DeploymentRecord
    }

    if (data.record?.stages) {
      for (const stage of data.record.stages) {
        onEvent({
          type: 'stage',
          id: stage.id,
          status: stage.status,
          detail: stage.detail,
          ts: Date.now(),
        })
        for (const line of stage.logs || []) {
          onEvent({ type: 'log', stage: stage.id, line, ts: Date.now() })
        }
      }
    }

    if (data.record) {
      if (data.record.status === 'failed' && data.record.error) {
        onEvent({
          type: 'error',
          stage: data.record.failedStage,
          message: data.record.error,
          hint: data.record.hint,
          ts: Date.now(),
        })
      }
      onEvent({ type: 'done', record: data.record })
      upsertRecord(data.record)
      return data.record
    }

    if (!res.ok) {
      const message =
        data.error || data.message || `Deploy failed (${res.status})`
      onEvent({ type: 'error', message, ts: Date.now() })
      throw new Error(message)
    }

    throw new Error(data.message || 'Deployment returned no record')
  },

  async getStatus(deploymentId: string): Promise<DeploymentRecord | null> {
    const base = apiBase()
    if (!base) {
      return loadHistory().find((r) => r.id === deploymentId) ?? null
    }

    try {
      const res = await fetch(
        endpoint(`/api/deploy/${encodeURIComponent(deploymentId)}`)
      )
      if (!res.ok) {
        return loadHistory().find((r) => r.id === deploymentId) ?? null
      }
      const record = (await res.json()) as DeploymentRecord
      upsertRecord(record)
      return record
    } catch {
      return loadHistory().find((r) => r.id === deploymentId) ?? null
    }
  },

  async list(projectId: string): Promise<DeploymentRecord[]> {
    const base = apiBase()
    if (base) {
      try {
        const res = await fetch(
          endpoint(`/api/deploy?projectId=${encodeURIComponent(projectId)}`)
        )
        if (res.ok) {
          const remote = (await res.json()) as DeploymentRecord[]
          const local = loadHistory().filter((r) => r.projectId === projectId)
          const map = new Map<string, DeploymentRecord>()
          for (const r of [...remote, ...local]) map.set(r.id, r)
          return Array.from(map.values()).sort((a, b) =>
            b.createdAt.localeCompare(a.createdAt)
          )
        }
      } catch {
        /* fall through */
      }
    }
    return loadHistory().filter((r) => r.projectId === projectId)
  },

  async cancel(deploymentId: string): Promise<boolean> {
    const base = apiBase()
    if (!base) return false
    try {
      const res = await fetch(
        endpoint(`/api/deploy/${encodeURIComponent(deploymentId)}/cancel`),
        { method: 'POST' }
      )
      return res.ok
    } catch {
      return false
    }
  },

  async deploy(_projectId: string): Promise<DeploymentRecord> {
    throw new Error(
      'Use start() with a packaged project. Call services.deployment.packageProject first.'
    )
  },
}
