/**
 * Local runtime — sandboxed static HTML/JS preview.
 * Architecture prepared for real backend runtimes later.
 */

import type { Project } from '../types/project'
import type { RuntimeService, RuntimeStatus, RuntimeKind } from './types'
import { buildPreviewDocument } from '../lib/preview'

const statusMap = new Map<string, RuntimeStatus>()

function detectKind(project: Project): RuntimeKind {
  const names = project.files.map((f) => f.name.toLowerCase())
  if (names.some((n) => n === 'package.json')) {
    const pkg = project.files.find((f) => f.name === 'package.json')
    if (pkg?.content?.includes('"react"') || pkg?.content?.includes('"next"')) {
      return 'react'
    }
    return 'javascript'
  }
  if (names.some((n) => n.endsWith('.tsx') || n.endsWith('.jsx'))) return 'react'
  if (names.some((n) => n.endsWith('.ts'))) return 'typescript'
  if (names.some((n) => n.endsWith('.py'))) return 'python'
  return 'static'
}

export const localRuntimeService: RuntimeService = {
  canRun(project) {
    const kind = detectKind(project)
    if (kind === 'static' || kind === 'javascript') {
      return { ok: true }
    }
    if (kind === 'react' || kind === 'typescript') {
      return {
        ok: true,
        reason:
          'Static preview available. Full React/TS bundling requires a build runtime (coming soon).',
      }
    }
    if (kind === 'python' || kind === 'node') {
      return {
        ok: false,
        reason:
          'Python and Node runtimes require a secure backend sandbox. Architecture is prepared.',
      }
    }
    return { ok: true }
  },

  async start(project) {
    const kind = detectKind(project)
    const can = this.canRun(project)
    if (!can.ok) {
      const status: RuntimeStatus = {
        kind,
        state: 'error',
        message: can.reason,
      }
      statusMap.set(project.id, status)
      return status
    }

    // For static / simple JS we use the existing iframe document builder
    try {
      buildPreviewDocument(project.files) // validates
      const status: RuntimeStatus = {
        kind,
        state: 'running',
        message: can.reason,
      }
      statusMap.set(project.id, status)
      return status
    } catch (e) {
      const status: RuntimeStatus = {
        kind,
        state: 'error',
        message: e instanceof Error ? e.message : 'Preview failed',
      }
      statusMap.set(project.id, status)
      return status
    }
  },

  async stop(projectId) {
    statusMap.set(projectId, {
      kind: 'static',
      state: 'stopped',
    })
  },

  getStatus(projectId) {
    return (
      statusMap.get(projectId) ?? {
        kind: 'static',
        state: 'idle',
      }
    )
  },
}
