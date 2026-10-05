/**
 * Deployments panel — production card, filterable history, opens detail
 */

import { useEffect, useState, useCallback, useMemo } from 'react'
import { Icon } from '../ui/Icon'
import { Button } from '../Button'
import { StatusIndicator } from '../ui/StatusIndicator'
import { services } from '../../services'
import type { DeploymentRecord } from '../../services/types'
import { DeploymentDetail } from './DeploymentDetail'

interface DeploymentsPanelProps {
  projectId: string
  projectName: string
  onDeploy: () => void
  refreshKey?: number
}

type Filter = 'all' | 'production' | 'preview' | 'failed'

function formatWhen(iso?: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  const diff = Date.now() - d.getTime()
  if (diff < 60_000) return 'just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  return d.toLocaleDateString()
}

function formatDuration(ms?: number, started?: string, finished?: string): string {
  let value = ms
  if (value == null && started && finished) {
    value = new Date(finished).getTime() - new Date(started).getTime()
  }
  if (value == null || value < 0) return ''
  if (value < 1000) return `${value}ms`
  return `${(value / 1000).toFixed(1)}s`
}

function statusKind(
  s: DeploymentRecord['status']
): 'ready' | 'failed' | 'building' | 'deploying' | 'idle' {
  if (s === 'ready') return 'ready'
  if (s === 'failed' || s === 'cancelled') return 'failed'
  if (s === 'queued') return 'idle'
  return 'deploying'
}

function isRunning(s: DeploymentRecord['status']): boolean {
  return (
    s !== 'ready' &&
    s !== 'failed' &&
    s !== 'cancelled' &&
    s !== 'queued'
  )
}

export function DeploymentsPanel({
  projectId,
  projectName,
  onDeploy,
  refreshKey = 0,
}: DeploymentsPanelProps) {
  const [items, setItems] = useState<DeploymentRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('all')
  const [selected, setSelected] = useState<DeploymentRecord | null>(null)
  const configured = services.deployment.isConfigured()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const list = await services.deployment.list(projectId)
      setItems(list)
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    void load()
  }, [load, refreshKey])

  const production = items.find(
    (d) => d.environment === 'production' && d.status === 'ready'
  )

  const filtered = useMemo(() => {
    return items.filter((d) => {
      if (filter === 'production') return d.environment === 'production'
      if (filter === 'preview') return d.environment === 'preview'
      if (filter === 'failed')
        return d.status === 'failed' || d.status === 'cancelled'
      return true
    })
  }, [items, filter])

  return (
    <div className="deployments-panel">
      <div className="deployments-header">
        <h3>Deployments</h3>
        <Button variant="primary" size="sm" onClick={onDeploy}>
          <Icon name="deploy" size={14} />
          Deploy
        </Button>
      </div>

      <section className="deploy-production">
        <h4 className="deploy-section-title">Current Production</h4>
        {production ? (
          <div className="deploy-card">
            <div className="deploy-card-body">
              <StatusIndicator status="ready" />
              <p className="deploy-card-title">{projectName}</p>
              <p className="deploy-card-url">
                {production.url?.replace(/^https?:\/\//, '') ?? '—'}
              </p>
              <p className="deploy-card-meta muted">
                Deployed {formatWhen(production.finishedAt || production.createdAt)}
              </p>
            </div>
            <div className="deploy-card-actions">
              {production.url && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    window.open(production.url, '_blank', 'noopener')
                  }
                >
                  Open Site
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelected(production)}
              >
                View Logs
              </Button>
              <Button variant="ghost" size="sm" onClick={onDeploy}>
                Redeploy
              </Button>
            </div>
          </div>
        ) : (
          <div className="deploy-card empty">
            <div className="deploy-card-body">
              <StatusIndicator status="idle" label="Not deployed" />
              <p className="deploy-card-title">{projectName}</p>
              <p className="deploy-card-url muted">No production URL yet</p>
            </div>
            <div className="deploy-card-actions">
              <Button
                variant="secondary"
                size="sm"
                onClick={onDeploy}
                disabled={!configured}
              >
                Deploy
              </Button>
            </div>
          </div>
        )}
      </section>

      <section className="deploy-history">
        <div className="deploy-history-head">
          <h4 className="deploy-section-title">History</h4>
          <div className="deploy-filter" role="group" aria-label="Filter deployments">
            {([
              ['all', 'All'],
              ['production', 'Prod'],
              ['preview', 'Preview'],
              ['failed', 'Failed'],
            ] as const).map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={filter === id ? 'active' : ''}
                aria-pressed={filter === id}
                onClick={() => setFilter(id)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <p className="panel-empty">Loading…</p>
        ) : filtered.length === 0 ? (
          <div className="deploy-empty-state">
            <Icon name="history" size={24} />
            <p>{items.length === 0 ? 'No deployments yet' : 'No matches'}</p>
            <p className="panel-hint">
              {items.length === 0
                ? configured
                  ? 'Deploy a static project to see history here.'
                  : 'Configure the deployment backend to enable real deploys.'
                : 'Try another filter.'}
            </p>
          </div>
        ) : (
          <ul className="deploy-history-list">
            {filtered.map((d) => {
              const running = isRunning(d.status)
              return (
                <li key={d.id}>
                  <button
                    type="button"
                    className="deploy-hist-row"
                    onClick={() => setSelected(d)}
                    aria-label={`Deployment ${d.id.slice(0, 8)}, ${d.status}, ${d.environment}`}
                  >
                    <span
                      className={`deploy-hist-dot ${
                        d.status === 'ready'
                          ? 'ok'
                          : d.status === 'failed' || d.status === 'cancelled'
                            ? 'err'
                            : running
                              ? 'run'
                              : 'idle'
                      }`}
                      aria-hidden
                    />
                    <span className="deploy-hist-env">{d.environment}</span>
                    <span className="deploy-hist-id mono">{d.id.slice(0, 8)}</span>
                    <span className="deploy-hist-dur mono">
                      {formatDuration(
                        d.durationMs,
                        d.startedAt,
                        d.finishedAt
                      )}
                    </span>
                    <span className="deploy-hist-when">
                      {formatWhen(d.finishedAt || d.createdAt)}
                    </span>
                    {d.url && (
                      <span className="deploy-hist-url muted">
                        {d.url.replace(/^https?:\/\//, '')}
                      </span>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {selected && (
        <DeploymentDetail
          record={selected}
          onClose={() => setSelected(null)}
          onRedeploy={() => {
            setSelected(null)
            onDeploy()
          }}
          onDeleted={(id) => {
            setItems((prev) => prev.filter((r) => r.id !== id))
            setSelected(null)
          }}
        />
      )}
    </div>
  )
}
