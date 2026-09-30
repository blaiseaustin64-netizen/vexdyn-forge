/**
 * Deployments panel — real records from deployment service
 */

import { useEffect, useState, useCallback } from 'react'
import { Icon } from '../ui/Icon'
import { Button } from '../Button'
import { StatusIndicator } from '../ui/StatusIndicator'
import { services } from '../../services'
import type { DeploymentRecord } from '../../services/types'

interface DeploymentsPanelProps {
  projectId: string
  projectName: string
  onDeploy: () => void
  refreshKey?: number
}

function formatWhen(iso?: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  const diff = Date.now() - d.getTime()
  if (diff < 60_000) return 'just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  return d.toLocaleDateString()
}

function statusKind(
  s: DeploymentRecord['status']
): 'ready' | 'failed' | 'building' | 'deploying' | 'idle' {
  if (s === 'ready') return 'ready'
  if (s === 'failed' || s === 'cancelled') return 'failed'
  if (s === 'queued') return 'idle'
  return 'deploying'
}

export function DeploymentsPanel({
  projectId,
  projectName,
  onDeploy,
  refreshKey = 0,
}: DeploymentsPanelProps) {
  const [items, setItems] = useState<DeploymentRecord[]>([])
  const [loading, setLoading] = useState(true)
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
        <h4 className="deploy-section-title">History</h4>
        {loading ? (
          <p className="panel-empty">Loading…</p>
        ) : items.length === 0 ? (
          <div className="deploy-empty-state">
            <Icon name="history" size={24} />
            <p>No deployments yet</p>
            <p className="panel-hint">
              {configured
                ? 'Deploy a static HTML/CSS/JS project to see history here.'
                : 'Configure the deployment backend (deploy-api Worker + VITE_DEPLOY_API_URL) to enable real Cloudflare Pages deploys.'}
            </p>
          </div>
        ) : (
          <ul className="deploy-history-list">
            {items.map((d) => (
              <li key={d.id}>
                <button
                  type="button"
                  className="deploy-history-row"
                  onClick={() => setSelected(d)}
                >
                  <StatusIndicator status={statusKind(d.status)} size="sm" />
                  <span className="deploy-hist-env">{d.environment}</span>
                  <span className="deploy-hist-time">
                    {formatWhen(d.finishedAt || d.createdAt)}
                  </span>
                  {d.url && (
                    <span className="deploy-hist-url muted">
                      {d.url.replace(/^https?:\/\//, '')}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {selected && (
        <div className="deploy-log-drawer">
          <div className="deploy-log-drawer-head">
            <strong>Deployment logs</strong>
            <button
              type="button"
              className="panel-icon-btn"
              onClick={() => setSelected(null)}
              aria-label="Close logs"
            >
              <Icon name="close" size={14} />
            </button>
          </div>
          <pre className="deploy-log-pre">
            {(selected.logs && selected.logs.length
              ? selected.logs
              : selected.stages?.flatMap((s) => s.logs || []) || [
                  selected.error || selected.status,
                ]
            ).join('\n')}
          </pre>
          {selected.url && selected.status === 'ready' && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => window.open(selected.url, '_blank', 'noopener')}
            >
              Open Site
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
