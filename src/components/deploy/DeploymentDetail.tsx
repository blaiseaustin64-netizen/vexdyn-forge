/**
 * Deployment detail — Overview / Stages / Logs / Settings
 */

import { useMemo, useState, useEffect } from 'react'
import { Button } from '../Button'
import { Icon } from '../ui/Icon'
import type {
  DeploymentRecord,
  DeployStageId,
  DeployStageInfo,
} from '../../services/types'

const HISTORY_KEY = 'vexdyn-forge-deployments-v1'

const STAGE_ORDER: DeployStageId[] = [
  'preparing',
  'validating',
  'building',
  'packaging',
  'uploading',
  'deploying',
  'finalizing',
]

type Tab = 'overview' | 'stages' | 'logs' | 'settings'

interface DeploymentDetailProps {
  record: DeploymentRecord
  onClose: () => void
  onRedeploy: () => void
  onDeleted?: (id: string) => void
}

function formatWhen(iso?: string): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString()
}

function formatDuration(ms?: number): string {
  if (ms == null || ms < 0) return '—'
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

function relativeTime(iso?: string): string {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 60_000) return 'just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  return new Date(iso).toLocaleDateString()
}

function statusLabel(s: DeploymentRecord['status']): string {
  if (s === 'ready') return 'Ready'
  if (s === 'failed') return 'Failed'
  if (s === 'cancelled') return 'Cancelled'
  if (s === 'queued') return 'Queued'
  return 'Building'
}

function StageDot({ status }: { status: DeployStageInfo['status'] }) {
  return <span className={`dd-dot dd-dot--${status}`} aria-hidden />
}

export function DeploymentDetail({
  record,
  onClose,
  onRedeploy,
  onDeleted,
}: DeploymentDetailProps) {
  const [tab, setTab] = useState<Tab>('overview')
  const [logFilter, setLogFilter] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const stages = useMemo(() => {
    if (record.stages?.length) return record.stages
    return STAGE_ORDER.map((id) => ({
      id,
      label: id.charAt(0).toUpperCase() + id.slice(1),
      status: 'pending' as const,
    }))
  }, [record.stages])

  const logs = useMemo(() => {
    const lines = record.logs ?? []
    if (!logFilter.trim()) return lines
    const q = logFilter.toLowerCase()
    return lines.filter((l) => l.toLowerCase().includes(q))
  }, [record.logs, logFilter])

  const duration =
    record.durationMs ??
    (record.finishedAt && record.startedAt
      ? new Date(record.finishedAt).getTime() -
        new Date(record.startedAt).getTime()
      : undefined)

  const copyLogs = () => {
    void navigator.clipboard?.writeText((record.logs ?? []).join('\n'))
  }

  const downloadLogs = () => {
    const blob = new Blob([(record.logs ?? []).join('\n')], {
      type: 'text/plain',
    })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `deploy-${record.id.slice(0, 8)}.txt`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const deleteRecord = () => {
    try {
      const raw = localStorage.getItem(HISTORY_KEY)
      if (raw) {
        const list = JSON.parse(raw) as DeploymentRecord[]
        const next = list.filter((r) => r.id !== record.id)
        localStorage.setItem(HISTORY_KEY, JSON.stringify(next))
      }
    } catch {
      /* ignore */
    }
    onDeleted?.(record.id)
    onClose()
  }

  const shortId = record.id.slice(0, 8)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="dd-overlay" role="dialog" aria-modal="true" aria-label="Deployment detail">
      <div className="dd-shell" tabIndex={-1}>
        <header className="dd-header">
          <button type="button" className="dd-back" onClick={onClose}>
            <Icon name="chevronLeft" size={16} />
            History
          </button>
          <div className="dd-header-meta">
            <span className={`dd-status dd-status--${record.status}`}>
              {statusLabel(record.status)}
            </span>
            <span className="mono dd-id">{shortId}</span>
          </div>
        </header>

        <nav className="dd-tabs" role="tablist" aria-label="Detail sections">
          {(['overview', 'stages', 'logs', 'settings'] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              className={tab === t ? 'active' : ''}
              onClick={() => setTab(t)}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </nav>

        <div className="dd-body">
          {tab === 'overview' && (
            <div className="dd-overview">
              <dl className="dd-grid">
                <div>
                  <dt>Status</dt>
                  <dd>{statusLabel(record.status)}</dd>
                </div>
                <div>
                  <dt>Environment</dt>
                  <dd className="dd-env">{record.environment}</dd>
                </div>
                <div>
                  <dt>Created</dt>
                  <dd>{formatWhen(record.createdAt)}</dd>
                </div>
                <div>
                  <dt>Duration</dt>
                  <dd className="mono">{formatDuration(duration)}</dd>
                </div>
                <div>
                  <dt>Framework</dt>
                  <dd>{record.framework}</dd>
                </div>
                <div>
                  <dt>Relative</dt>
                  <dd>{relativeTime(record.finishedAt || record.createdAt)}</dd>
                </div>
              </dl>

              {record.url && (
                <div className="dd-url-row">
                  <span className="mono">{record.url}</span>
                  <div className="dd-url-actions">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() =>
                        window.open(record.url, '_blank', 'noopener')
                      }
                    >
                      Visit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        void navigator.clipboard?.writeText(record.url || '')
                      }
                    >
                      Copy
                    </Button>
                  </div>
                </div>
              )}

              {record.status === 'failed' && record.error && (
                <div className="dd-error-box">
                  <p>{record.error}</p>
                  {record.hint && (
                    <p className="dd-hint">
                      <strong>What to try:</strong> {record.hint}
                    </p>
                  )}
                </div>
              )}

              <div className="dd-actions">
                <Button variant="secondary" size="sm" onClick={onRedeploy}>
                  Redeploy
                </Button>
              </div>
            </div>
          )}

          {tab === 'stages' && (
            <ol className="dd-stage-list">
              {stages.map((s) => {
                const failed =
                  s.status === 'failed' || record.failedStage === s.id
                return (
                  <li
                    key={s.id}
                    className={`dd-stage-row ${failed ? 'dd-stage-row--failed' : ''}`}
                  >
                    <StageDot status={failed ? 'failed' : s.status} />
                    <div className="dd-stage-body">
                      <div className="dd-stage-top">
                        <span className="dd-stage-label">{s.label}</span>
                        <span className="mono dd-stage-dur">
                          {formatDuration(s.durationMs)}
                        </span>
                      </div>
                      {s.detail && (
                        <p className="dd-stage-detail">{s.detail}</p>
                      )}
                      {failed && record.error && (
                        <div className="dd-fail-inline">
                          <p>{record.error}</p>
                          {record.hint && (
                            <p className="dd-hint">{record.hint}</p>
                          )}
                          {s.logs && s.logs.length > 0 && (
                            <pre>{s.logs.join('\n')}</pre>
                          )}
                        </div>
                      )}
                    </div>
                  </li>
                )
              })}
            </ol>
          )}

          {tab === 'logs' && (
            <div className="dd-logs">
              <div className="dd-logs-toolbar">
                <input
                  type="search"
                  className="dd-log-search"
                  placeholder="Filter logs…"
                  value={logFilter}
                  onChange={(e) => setLogFilter(e.target.value)}
                  aria-label="Filter logs"
                />
                <Button variant="ghost" size="sm" onClick={copyLogs}>
                  Copy
                </Button>
                <Button variant="ghost" size="sm" onClick={downloadLogs}>
                  Download
                </Button>
              </div>
              <pre className="dd-log-pre">
                {logs.length ? logs.join('\n') : 'No logs for this deployment.'}
              </pre>
            </div>
          )}

          {tab === 'settings' && (
            <div className="dd-settings">
              <dl className="dd-grid">
                <div>
                  <dt>Project</dt>
                  <dd>{record.projectName}</dd>
                </div>
                <div>
                  <dt>Production domain</dt>
                  <dd className="mono">
                    {record.url
                      ? record.url.replace(/^https?:\/\//, '')
                      : record.slug
                        ? `${record.slug}.pages.dev`
                        : '—'}
                  </dd>
                </div>
                <div>
                  <dt>Default environment</dt>
                  <dd>{record.environment}</dd>
                </div>
                <div>
                  <dt>Deployment ID</dt>
                  <dd className="mono">{record.id}</dd>
                </div>
              </dl>
              <div className="dd-actions">
                <Button variant="secondary" size="sm" onClick={onRedeploy}>
                  Redeploy
                </Button>
              </div>
              <div className="dd-danger">
                {!confirmDelete ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setConfirmDelete(true)}
                  >
                    Delete this deployment record
                  </Button>
                ) : (
                  <div className="dd-confirm-del">
                    <p>Remove this record from local history? This cannot be undone.</p>
                    <Button variant="primary" size="sm" onClick={deleteRecord}>
                      Confirm delete
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setConfirmDelete(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
