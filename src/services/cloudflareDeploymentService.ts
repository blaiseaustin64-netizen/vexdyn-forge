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

  async getStatus(deploymentId: string): Promise<DeploymentRecord | null> {
    const base = apiBase()
    if (!base) {
      return loadHistory().find((r) => r.id === deploymentId) ?? null
    }

    try {
      const res = await fetch(endpoint(`/api/deploy/${encodeURIComponent(deploymentId)}`))
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
