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
  DeployPackage,
} from './types'
import {
  detectFramework as detect,
  packageStaticProject,
} from '../lib/deployPackage'

const HISTORY_KEY = 'vexdyn-forge-deployments-v1'

function apiBase(): string {
  return (import.meta.env.VITE_DEPLOY_API_URL as string | undefined)?.replace(/\/$/, '') ?? ''
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
    // Cap storage
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
        'Deployment backend is not configured. Set VITE_DEPLOY_API_URL to your VEXDYN deploy API, and configure Cloudflare credentials on the server.'
      )
    }

    const res = await fetch(`${base}/api/deploy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    })

    const data = (await res.json().catch(() => ({}))) as DeployStartResponse & {
      error?: string
      record?: DeploymentRecord
    }

    if (!res.ok) {
      throw new Error(data.error || data.message || `Deploy failed (${res.status})`)
    }

    if (data.record) {
      upsertRecord(data.record)
    }

    return {
      deploymentId: data.deploymentId,
      status: data.status,
      stages: data.stages,
      message: data.message,
    }
  },

  async getStatus(deploymentId: string): Promise<DeploymentRecord | null> {
    const base = apiBase()
    if (!base) {
      return loadHistory().find((r) => r.id === deploymentId) ?? null
    }

    try {
      const res = await fetch(
        `${base}/api/deploy/${encodeURIComponent(deploymentId)}`
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
          `${base}/api/deploy?projectId=${encodeURIComponent(projectId)}`
        )
        if (res.ok) {
          const remote = (await res.json()) as DeploymentRecord[]
          // Merge with local cache
          const local = loadHistory().filter((r) => r.projectId === projectId)
          const map = new Map<string, DeploymentRecord>()
          for (const r of [...remote, ...local]) map.set(r.id, r)
          const merged = Array.from(map.values()).sort((a, b) =>
            b.createdAt.localeCompare(a.createdAt)
          )
          return merged
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
        `${base}/api/deploy/${encodeURIComponent(deploymentId)}/cancel`,
        { method: 'POST' }
      )
      return res.ok
    } catch {
      return false
    }
  },

  /** Legacy shim */
  async deploy(projectId: string): Promise<DeploymentRecord> {
    throw new Error(
      'Use start() with a packaged project. Call services.deployment.packageProject first.'
    )
  },
}

export type { DeployPackage }
