/**
 * Real deployment flow — stages driven by backend status.
 * No fake progress timers.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { Modal } from '../Modal'
import { Button } from '../Button'
import { Icon } from '../ui/Icon'
import { StatusIndicator } from '../ui/StatusIndicator'
import { services } from '../../services'
import type { Project } from '../../types/project'
import type {
  DeploymentRecord,
  DeployStageInfo,
  DeployStatus,
} from '../../services/types'
import { slugifyProjectName } from '../../lib/deployPackage'

interface DeployModalProps {
  open: boolean
  onClose: () => void
  project: Project
  onDeployed?: (record: DeploymentRecord) => void
}

type Phase = 'confirm' | 'running' | 'ready' | 'failed'

const STAGE_ORDER = [
  'preparing',
  'validating',
  'building',
  'packaging',
  'uploading',
  'deploying',
  'finalizing',
] as const

function statusToIndicator(
  s: DeployStatus
): 'ready' | 'building' | 'failed' | 'idle' | 'deploying' {
  if (s === 'ready') return 'ready'
  if (s === 'failed' || s === 'cancelled') return 'failed'
  if (s === 'queued') return 'idle'
  return 'deploying'
}

export function DeployModal({
  open,
  onClose,
  project,
  onDeployed,
}: DeployModalProps) {
  const [env, setEnv] = useState<'production' | 'preview'>('production')
  const [phase, setPhase] = useState<Phase>('confirm')
  const [record, setRecord] = useState<DeploymentRecord | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const pollRef = useRef<number | null>(null)

  const configured = services.deployment.isConfigured()
  const detection = services.deployment.detectFramework(project)
  const slug = slugifyProjectName(project.name)
  const targetUrl = `${slug}.pages.dev`

  useEffect(() => {
    if (open) {
      setPhase('confirm')
      setRecord(null)
      setError(null)
      setExpanded(null)
      setBusy(false)
    }
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current)
    }
  }, [open])

  const stopPoll = () => {
    if (pollRef.current) {
      window.clearInterval(pollRef.current)
      pollRef.current = null
    }
  }

  const applyRecord = useCallback(
    (r: DeploymentRecord) => {
      setRecord(r)
      if (r.status === 'ready') {
        setPhase('ready')
        setBusy(false)
        stopPoll()
        onDeployed?.(r)
      } else if (r.status === 'failed' || r.status === 'cancelled') {
        setPhase('failed')
        setError(r.error || 'Deployment failed')
        setBusy(false)
        stopPoll()
      }
    },
    [onDeployed]
  )

  const startDeploy = async () => {
    setError(null)
    setBusy(true)
    setPhase('running')

    if (!detection.supported) {
      setPhase('failed')
      setError(detection.reason || 'Project type not supported')
      setBusy(false)
      return
    }

    if (!configured) {
      setPhase('failed')
      setError(
        'Deployment backend is not configured. Set VITE_DEPLOY_API_URL and deploy the Worker with CF_API_TOKEN + CF_ACCOUNT_ID secrets.'
      )
      setBusy(false)
      return
    }

    try {
      const pkg = await services.deployment.packageProject(project, env)
      const started = await services.deployment.start({ package: pkg })

      // Prefer full record from response
      if (started.record) {
        applyRecord(started.record)
        return
      }

      // Poll until terminal state
      const id = started.deploymentId
      const initial: DeploymentRecord = {
        id,
        projectId: project.id,
        projectName: project.name,
        environment: env,
        status: started.status,
        framework: detection.framework,
        provider: 'cloudflare-pages',
        createdAt: new Date().toISOString(),
        stages: started.stages,
        logs: [],
      }
      setRecord(initial)

      if (
        started.status === 'ready' ||
        started.status === 'failed' ||
        started.status === 'cancelled'
      ) {
        applyRecord({
          ...initial,
          error: started.message,
        })
        return
      }

      pollRef.current = window.setInterval(async () => {
        const next = await services.deployment.getStatus(id)
        if (next) applyRecord(next)
      }, 1500)
    } catch (e) {
      setPhase('failed')
      setError(e instanceof Error ? e.message : String(e))
      setBusy(false)
    }
  }

  const stages: DeployStageInfo[] =
    record?.stages ??
    STAGE_ORDER.map((id) => ({
      id,
      label: id.charAt(0).toUpperCase() + id.slice(1),
      status: 'pending' as const,
    }))

  const copyUrl = () => {
    if (record?.url) void navigator.clipboard?.writeText(record.url)
  }

  return (
    <Modal
      open={open}
      onClose={busy ? () => {} : onClose}
      title={
        phase === 'ready'
          ? 'Deployment Ready'
          : phase === 'failed'
            ? 'Deployment Failed'
            : phase === 'running'
              ? 'Production Deployment'
              : 'Deploy Project'
      }
    >
      <div className="deploy-modal deploy-flow">
        {phase === 'confirm' && (
          <>
            <div className="deploy-field">
              <span className="label">Project</span>
              <p className="deploy-value">{project.name}</p>
            </div>

            <div className="deploy-field">
              <span className="label">Environment</span>
              <div className="deploy-env-row">
                <button
                  type="button"
                  className={`deploy-env-btn ${env === 'production' ? 'selected' : ''}`}
                  onClick={() => setEnv('production')}
                >
                  Production
                </button>
                <button
                  type="button"
                  className={`deploy-env-btn ${env === 'preview' ? 'selected' : ''}`}
                  onClick={() => setEnv('preview')}
                >
                  Preview
                </button>
              </div>
            </div>

            <div className="deploy-field">
              <span className="label">Framework</span>
              <p className="deploy-value">
                {detection.framework === 'static'
                  ? 'Static HTML / CSS / JS'
                  : detection.framework}
                {!detection.supported && (
                  <span className="deploy-unsupported"> — not deployable yet</span>
                )}
              </p>
              {detection.entry && (
                <p className="deploy-value muted">Entry: {detection.entry}</p>
              )}
            </div>

            <div className="deploy-field">
              <span className="label">Target</span>
              <p className="deploy-value mono">{targetUrl}</p>
            </div>

            {!configured && (
              <div className="deploy-notice">
                <Icon name="info" size={14} />
                <p>
                  Deployment backend not configured. Deploy the Worker in{' '}
                  <code>deploy-api/</code> and set <code>VITE_DEPLOY_API_URL</code>.
                  Cloudflare tokens stay server-side only.
                </p>
              </div>
            )}

            {!detection.supported && detection.reason && (
              <div className="deploy-notice warn">
                <Icon name="warning" size={14} />
                <p>{detection.reason}</p>
              </div>
            )}

            <div className="modal-footer create-footer">
              <Button variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() => void startDeploy()}
                disabled={!detection.supported || !configured}
              >
                <Icon name="deploy" size={14} />
                Deploy to Production
              </Button>
            </div>
          </>
        )}

        {(phase === 'running' || phase === 'ready' || phase === 'failed') && (
          <>
            <div className="deploy-pipeline" aria-live="polite">
              <div className="deploy-pipeline-header">
                <span className="deploy-pipeline-brand">VEXDYN FORGE</span>
                <StatusIndicator
                  status={statusToIndicator(record?.status ?? 'deploying')}
                  label={
                    phase === 'ready'
                      ? 'Ready'
                      : phase === 'failed'
                        ? 'Failed'
                        : 'Deploying'
                  }
                />
              </div>

              <div className="deploy-pipeline-track" aria-hidden>
                <div
                  className={`deploy-pipeline-progress phase-${phase}`}
                  style={{
                    width: `${
                      phase === 'ready'
                        ? 100
                        : phase === 'failed'
                          ? Math.max(
                              10,
                              (stages.filter((s) => s.status === 'done').length /
                                stages.length) *
                                100
                            )
                          : Math.max(
                              8,
                              ((stages.filter((s) => s.status === 'done').length +
                                (stages.some((s) => s.status === 'running')
                                  ? 0.45
                                  : 0)) /
                                stages.length) *
                                100
                            )
                    }%`,
                  }}
                />
              </div>

              <ul className="deploy-stage-list">
                {stages.map((s) => (
                  <li
                    key={s.id}
                    className={`deploy-stage status-${s.status} ${
                      expanded === s.id ? 'open' : ''
                    }`}
                  >
                    <button
                      type="button"
                      className="deploy-stage-row"
                      onClick={() =>
                        setExpanded((cur) => (cur === s.id ? null : s.id))
                      }
                    >
                      <span className="deploy-stage-icon" aria-hidden>
                        {s.status === 'done' && <Icon name="check" size={14} />}
                        {s.status === 'running' && (
                          <Icon name="loading" size={14} className="spin" />
                        )}
                        {s.status === 'failed' && (
                          <Icon name="error" size={14} />
                        )}
                        {s.status === 'pending' && (
                          <Icon name="circle" size={10} />
                        )}
                      </span>
                      <span className="deploy-stage-label">{s.label}</span>
                      {s.detail && (
                        <span className="deploy-stage-detail">{s.detail}</span>
                      )}
                    </button>
                    {expanded === s.id && (s.logs?.length || s.detail) && (
                      <div className="deploy-stage-body">
                        {s.logs?.map((line, i) => (
                          <div key={i} className="deploy-log-line">
                            {line}
                          </div>
                        ))}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            {phase === 'ready' && record?.url && (
              <div className="deploy-success">
                <p className="deploy-success-title">Your project is live</p>
                <p className="deploy-success-url mono">{record.url.replace(/^https?:\/\//, '')}</p>
                <div className="deploy-success-actions">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => window.open(record.url, '_blank', 'noopener')}
                  >
                    <Icon name="externalLink" size={14} />
                    Open Site
                  </Button>
                  <Button variant="secondary" size="sm" onClick={copyUrl}>
                    <Icon name="copy" size={14} />
                    Copy URL
                  </Button>
                  <Button variant="ghost" size="sm" onClick={onClose}>
                    Done
                  </Button>
                </div>
              </div>
            )}

            {phase === 'failed' && (
              <div className="deploy-failed">
                <p className="deploy-failed-msg">{error || record?.error}</p>
                <div className="deploy-success-actions">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setPhase('confirm')
                      setError(null)
                      setRecord(null)
                    }}
                  >
                    Retry
                  </Button>
                  <Button variant="ghost" size="sm" onClick={onClose}>
                    Close
                  </Button>
                </div>
              </div>
            )}

            {phase === 'running' && (
              <div className="modal-footer create-footer">
                <Button variant="ghost" onClick={onClose} disabled>
                  Close
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  )
}
