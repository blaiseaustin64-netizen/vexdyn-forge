/**
 * Full-page VEXDYN Forge deploy experience.
 * Stages come only from backend events (stream or legacy).
 * Visual queue smooths presentation (~350ms) without faking done state.
 */

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from 'react'
import { Button } from '../Button'
import { Icon } from '../ui/Icon'
import { services } from '../../services'
import type { Project } from '../../types/project'
import type {
  DeploymentRecord,
  DeployStageInfo,
  DeployStageId,
  DeployStreamEvent,
} from '../../services/types'
import { slugifyProjectName } from '../../lib/deployPackage'
import {
  detectProject,
  pathsToProjectFiles,
  readZipFile,
  readDataTransfer,
} from '../../lib/importProject'
import { projectStore } from '../../lib/projectStore'

export interface DeployPageProps {
  open: boolean
  onClose: () => void
  project: Project
  onDeployed?: (record: DeploymentRecord) => void
}

type Phase = 'confirm' | 'running' | 'ready' | 'failed'

const STAGE_ORDER: DeployStageId[] = [
  'preparing',
  'validating',
  'building',
  'packaging',
  'uploading',
  'deploying',
  'finalizing',
]

const STAGE_LABELS: Record<DeployStageId, string> = {
  preparing: 'Preparing',
  validating: 'Validating',
  building: 'Building',
  packaging: 'Packaging',
  uploading: 'Uploading',
  deploying: 'Deploying',
  finalizing: 'Finalizing',
}

function emptyStages(): DeployStageInfo[] {
  return STAGE_ORDER.map((id) => ({
    id,
    label: STAGE_LABELS[id],
    status: 'pending' as const,
  }))
}

function formatDuration(ms?: number): string {
  if (ms == null || ms < 0) return ''
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

function formatElapsed(ms: number): string {
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  const r = s % 60
  return m > 0 ? `${m}:${String(r).padStart(2, '0')}` : `0:${String(r).padStart(2, '0')}`
}

/** Circular stage indicator */
function StageRing({
  status,
  reducedMotion,
}: {
  status: DeployStageInfo['status']
  reducedMotion: boolean
}) {
  const r = 10
  const c = 2 * Math.PI * r
  if (status === 'done') {
    return (
      <svg className="dp-ring dp-ring--done" width="28" height="28" viewBox="0 0 28 28" aria-hidden>
        <circle cx="14" cy="14" r={r} className="dp-ring-track" />
        <circle
          cx="14"
          cy="14"
          r={r}
          className="dp-ring-progress dp-ring-progress--done"
          style={{ strokeDasharray: c, strokeDashoffset: 0 }}
        />
        <path
          className={`dp-check ${reducedMotion ? '' : 'dp-check--draw'}`}
          d="M9 14.5l3.2 3.2L19 10.5"
          fill="none"
        />
      </svg>
    )
  }
  if (status === 'failed') {
    return (
      <svg className="dp-ring dp-ring--failed" width="28" height="28" viewBox="0 0 28 28" aria-hidden>
        <circle cx="14" cy="14" r={r} className="dp-ring-track dp-ring-track--failed" />
        <path d="M10 10l8 8M18 10l-8 8" className="dp-x" />
      </svg>
    )
  }
  if (status === 'running') {
    return (
      <svg
        className={`dp-ring dp-ring--running ${reducedMotion ? '' : 'dp-ring-spin'}`}
        width="28"
        height="28"
        viewBox="0 0 28 28"
        aria-hidden
      >
        <circle cx="14" cy="14" r={r} className="dp-ring-track" />
        <circle
          cx="14"
          cy="14"
          r={r}
          className="dp-ring-progress"
          style={{
            strokeDasharray: `${c * 0.35} ${c}`,
            strokeDashoffset: 0,
          }}
        />
      </svg>
    )
  }
  if (status === 'skipped') {
    return (
      <svg className="dp-ring dp-ring--skipped" width="28" height="28" viewBox="0 0 28 28" aria-hidden>
        <circle cx="14" cy="14" r={r} className="dp-ring-track" />
        <path d="M10 14h8" className="dp-skip-line" />
      </svg>
    )
  }
  return (
    <svg className="dp-ring dp-ring--pending" width="28" height="28" viewBox="0 0 28 28" aria-hidden>
      <circle cx="14" cy="14" r={r} className="dp-ring-track" />
    </svg>
  )
}

export function DeployPage({ open, onClose, project, onDeployed }: DeployPageProps) {
  const [env, setEnv] = useState<'production' | 'preview'>('production')
  const [phase, setPhase] = useState<Phase>('confirm')
  const [record, setRecord] = useState<DeploymentRecord | null>(null)
  const [stages, setStages] = useState<DeployStageInfo[]>(emptyStages)
  const [logs, setLogs] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [hint, setHint] = useState<string | null>(null)
  const [failedStage, setFailedStage] = useState<DeployStageId | null>(null)
  const [busy, setBusy] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [connectionLost, setConnectionLost] = useState(false)
  const [logPaused, setLogPaused] = useState(false)

  const logRef = useRef<HTMLDivElement>(null)
  const startTs = useRef<number>(0)
  const timerRef = useRef<number | null>(null)
  const visualQueue = useRef<Array<() => void>>([])
  const queueRunning = useRef(false)
  const deploymentIdRef = useRef<string | null>(null)
  const reducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const configured = services.deployment.isConfigured()
  const detection = services.deployment.detectFramework(project)
  const slug = slugifyProjectName(project.name)
  const fileCount = project.files?.filter((f) => f.kind === 'file').length ?? 0
  const targetHost = `${slug}.pages.dev`

  const doneCount = useMemo(
    () => stages.filter((s) => s.status === 'done' || s.status === 'skipped').length,
    [stages]
  )
  const progressPct = Math.round((doneCount / STAGE_ORDER.length) * 100)

  const enqueueVisual = useCallback(
    (fn: () => void) => {
      if (reducedMotion) {
        fn()
        return
      }
      visualQueue.current.push(fn)
      if (queueRunning.current) return
      queueRunning.current = true
      const run = () => {
        const next = visualQueue.current.shift()
        if (!next) {
          queueRunning.current = false
          return
        }
        next()
        window.setTimeout(run, 350)
      }
      run()
    },
    [reducedMotion]
  )

  const applyStageEvent = useCallback(
    (id: DeployStageId, status: DeployStageInfo['status'], detail?: string) => {
      enqueueVisual(() => {
        setStages((prev) =>
          prev.map((s) =>
            s.id === id
              ? {
                  ...s,
                  status,
                  detail: detail ?? s.detail,
                  ...(status === 'running'
                    ? { startedAt: s.startedAt || new Date().toISOString() }
                    : {}),
                  ...(status === 'done' || status === 'failed' || status === 'skipped'
                    ? {
                        finishedAt: new Date().toISOString(),
                        durationMs:
                          s.startedAt != null
                            ? Date.now() - new Date(s.startedAt).getTime()
                            : s.durationMs,
                      }
                    : {}),
                }
              : s
          )
        )
      })
    },
    [enqueueVisual]
  )

  const appendLog = useCallback(
    (line: string) => {
      setLogs((prev) => [...prev, line])
    },
    []
  )

  useEffect(() => {
    if (!open) return
    setPhase('confirm')
    setRecord(null)
    setStages(emptyStages())
    setLogs([])
    setError(null)
    setHint(null)
    setFailedStage(null)
    setBusy(false)
    setElapsed(0)
    setConnectionLost(false)
    setLogPaused(false)
    visualQueue.current = []
    queueRunning.current = false
    deploymentIdRef.current = null
    if (timerRef.current) {
      window.clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [open])

  // Keyboard: Escape closes when not busy; focus shell for a11y
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, busy, onClose])

  useEffect(() => {
    if (!logPaused && logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight
    }
  }, [logs, logPaused])

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current)
    }
  }, [])

  const onLogScroll = () => {
    const el = logRef.current
    if (!el) return
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 24
    setLogPaused(!atBottom)
  }

  const finishTimer = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  const handleStreamEvent = useCallback(
    (ev: DeployStreamEvent) => {
      if (ev.type === 'stage') {
        applyStageEvent(ev.id, ev.status, ev.detail)
      } else if (ev.type === 'log') {
        appendLog(ev.line)
      } else if (ev.type === 'error') {
        setError(ev.message)
        if (ev.hint) setHint(ev.hint)
        if (ev.stage) setFailedStage(ev.stage)
      } else if (ev.type === 'done') {
        const r = ev.record
        setRecord(r)
        deploymentIdRef.current = r.id
        if (r.stages?.length) {
          enqueueVisual(() => setStages(r.stages!))
        }
        if (r.logs?.length) setLogs(r.logs)
        finishTimer()
        setBusy(false)
        if (r.status === 'ready') {
          setPhase('ready')
          onDeployed?.(r)
        } else if (r.status === 'failed' || r.status === 'cancelled') {
          setPhase('failed')
          setError(r.error || 'Deployment failed')
          if (r.hint) setHint(r.hint)
          if (r.failedStage) setFailedStage(r.failedStage)
        }
      }
    },
    [applyStageEvent, appendLog, enqueueVisual, onDeployed]
  )

  const recoverStatus = async (id: string) => {
    setConnectionLost(true)
    try {
      const next = await services.deployment.getStatus(id)
      if (next) {
        setConnectionLost(false)
        setRecord(next)
        if (next.stages) setStages(next.stages)
        if (next.logs) setLogs(next.logs)
        if (next.status === 'ready') {
          setPhase('ready')
          setBusy(false)
          finishTimer()
          onDeployed?.(next)
        } else if (next.status === 'failed' || next.status === 'cancelled') {
          setPhase('failed')
          setError(next.error || 'Deployment failed')
          setHint(next.hint || null)
          setFailedStage(next.failedStage || null)
          setBusy(false)
          finishTimer()
        }
      }
    } catch {
      /* keep connectionLost */
    }
  }

  const startDeploy = async () => {
    setError(null)
    setHint(null)
    setFailedStage(null)
    setLogs([])
    setStages(emptyStages())
    setRecord(null)
    setConnectionLost(false)
    setBusy(true)
    setPhase('running')
    startTs.current = Date.now()
    setElapsed(0)
    timerRef.current = window.setInterval(() => {
      setElapsed(Date.now() - startTs.current)
    }, 250)

    if (!detection.supported) {
      setPhase('failed')
      setError(detection.reason || 'Project type not supported')
      setHint('Use a static HTML/CSS/JS project for now.')
      setBusy(false)
      finishTimer()
      return
    }

    if (!configured) {
      setPhase('failed')
      setError('Deployment backend is not configured.')
      setHint(
        'Set VITE_DEPLOY_API_URL to your Worker origin and ensure CF_API_TOKEN + CF_ACCOUNT_ID secrets are set.'
      )
      setBusy(false)
      finishTimer()
      return
    }

    try {
      const pkg = await services.deployment.packageProject(project, env)

      if (typeof services.deployment.startStream === 'function') {
        try {
          const final = await services.deployment.startStream(
            { package: pkg },
            handleStreamEvent
          )
          deploymentIdRef.current = final.id
          return
        } catch (streamErr) {
          const id = deploymentIdRef.current
          if (id) {
            await recoverStatus(id)
            return
          }
          throw streamErr
        }
      }

      // Legacy path
      const started = await services.deployment.start({ package: pkg })
      if (started.record) {
        handleStreamEvent({ type: 'done', record: started.record })
        return
      }
      const id = started.deploymentId
      deploymentIdRef.current = id
      if (started.stages) {
        for (const s of started.stages) {
          applyStageEvent(s.id, s.status, s.detail)
        }
      }
      if (
        started.status === 'ready' ||
        started.status === 'failed' ||
        started.status === 'cancelled'
      ) {
        handleStreamEvent({
          type: 'done',
          record: {
            id,
            projectId: project.id,
            projectName: project.name,
            environment: env,
            status: started.status,
            framework: detection.framework,
            provider: 'cloudflare-pages',
            createdAt: new Date().toISOString(),
            stages: started.stages,
            error: started.message,
          },
        })
        return
      }
      const poll = window.setInterval(async () => {
        const next = await services.deployment.getStatus(id)
        if (next) {
          if (next.stages) setStages(next.stages)
          if (next.logs) setLogs(next.logs)
          if (
            next.status === 'ready' ||
            next.status === 'failed' ||
            next.status === 'cancelled'
          ) {
            window.clearInterval(poll)
            handleStreamEvent({ type: 'done', record: next })
          }
        }
      }, 1500)
    } catch (e) {
      setPhase('failed')
      setError(e instanceof Error ? e.message : String(e))
      setBusy(false)
      finishTimer()
    }
  }

  const copyText = (text: string) => {
    void navigator.clipboard?.writeText(text)
  }

  if (!open) return null

  const frameworkLabel =
    detection.framework === 'static'
      ? 'Static'
      : detection.framework === 'react-ts'
        ? 'React + TS'
        : detection.framework

  return (
    <div
      className="dp-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Deploy project"
    >
      <div className="dp-shell" tabIndex={-1}>
        <header className="dp-header">
          <div className="dp-header-left">
            <button
              type="button"
              className="dp-back"
              onClick={busy ? undefined : onClose}
              disabled={busy}
              aria-label="Close deploy"
            >
              <Icon name="chevronLeft" size={16} />
              <span>Editor</span>
            </button>
            <div className="dp-title-block">
              <h1 className="dp-title">{project.name}</h1>
              <div className="dp-badges">
                <span className="dp-badge">{frameworkLabel}</span>
                <span className="dp-badge dp-badge--muted">{fileCount} files</span>
              </div>
            </div>
          </div>
          {phase === 'running' && (
            <div className="dp-elapsed mono" aria-live="polite">
              {formatElapsed(elapsed)}
            </div>
          )}
        </header>

        {phase === 'running' && (
          <div className="dp-progress-bar" aria-hidden>
            <div className="dp-progress-fill" style={{ width: `${progressPct}%` }} />
          </div>
        )}

        <div className={`dp-body ${phase === 'running' ? 'dp-body--split' : ''}`}>
          {/* PRE-DEPLOY */}
          {phase === 'confirm' && (
            <div className="dp-panel dp-confirm">
              {!configured && (
                <div className="dp-setup-card">
                  <Icon name="info" size={18} />
                  <div>
                    <strong>Connect the deploy Worker</strong>
                    <p>
                      Set <code>VITE_DEPLOY_API_URL</code> to your Worker origin and
                      configure <code>CF_API_TOKEN</code> / <code>CF_ACCOUNT_ID</code>{' '}
                      secrets. Tokens never enter the browser.
                    </p>
                  </div>
                </div>
              )}

              <section className="dp-section">
                <span className="dp-label">Environment</span>
                <div className="dp-segment" role="group" aria-label="Environment">
                  <button
                    type="button"
                    className={env === 'production' ? 'active' : ''}
                    aria-pressed={env === 'production'}
                    onClick={() => setEnv('production')}
                  >
                    Production
                  </button>
                  <button
                    type="button"
                    className={env === 'preview' ? 'active' : ''}
                    aria-pressed={env === 'preview'}
                    onClick={() => setEnv('preview')}
                  >
                    Preview
                  </button>
                </div>
                <p className="dp-hint">
                  {env === 'production'
                    ? 'Published on your primary pages.dev host.'
                    : 'Preview builds are reserved for a future release; production is used today.'}
                </p>
              </section>

              <section className="dp-section">
                <span className="dp-label">Target</span>
                <div className="dp-target-card">
                  <span className="mono dp-target-host">{targetHost}</span>
                  <span className="dp-target-note">
                    Cloudflare may append a short suffix if the name is taken.
                  </span>
                </div>
              </section>

              {!detection.supported && detection.reason && (
                <div className="dp-notice warn">
                  <Icon name="warning" size={14} />
                  <p>{detection.reason}</p>
                </div>
              )}

              <section className="dp-section">
                <span className="dp-label">Or deploy a ZIP</span>
                <div
                  className="import-drop"
                  style={{ padding: '16px' }}
                  onDragOver={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                  }}
                  onDrop={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    void (async () => {
                      try {
                        const imported = await readDataTransfer(e.dataTransfer)
                        if (!imported.length) return
                        const det = detectProject(imported)
                        if (det.projectType !== 'html-css-js' && det.projectType !== 'tailwind' && det.projectType !== 'other') {
                          // still allow if has html
                          const hasHtml = imported.some((f) => f.path.endsWith('.html'))
                          if (!hasHtml) {
                            setError('ZIP must contain a static HTML entry (index.html) for deployment.')
                            setPhase('failed')
                            return
                          }
                        }
                        const files = pathsToProjectFiles(imported)
                        const name = project.name + ' (ZIP)'
                        const proj = projectStore.createFromImport(name, files, det.projectType)
                        // Replace in-memory package path by navigating is heavy —
                        // instead package and deploy these files directly via a temp project shape
                        const temp = { ...proj }
                        setError(null)
                        setBusy(true)
                        setPhase('running')
                        startTs.current = Date.now()
                        setElapsed(0)
                        timerRef.current = window.setInterval(() => {
                          setElapsed(Date.now() - startTs.current)
                        }, 250)
                        const pkg = await services.deployment.packageProject(temp, env)
                        if (typeof services.deployment.startStream === 'function') {
                          const final = await services.deployment.startStream(
                            { package: pkg },
                            handleStreamEvent
                          )
                          deploymentIdRef.current = final.id
                        } else {
                          const started = await services.deployment.start({ package: pkg })
                          if (started.record) handleStreamEvent({ type: 'done', record: started.record })
                        }
                      } catch (err) {
                        setPhase('failed')
                        setError(err instanceof Error ? err.message : String(err))
                        setBusy(false)
                        finishTimer()
                      }
                    })()
                  }}
                >
                  <p className="import-drop-title" style={{ fontSize: 13 }}>Drop a project ZIP here</p>
                  <p className="import-drop-sub">Static HTML/CSS/JS with assets supported</p>
                  <div style={{ marginTop: 10 }}>
                    <Button
                      variant="secondary"
                      type="button"
                      onClick={() => {
                        const input = document.createElement('input')
                        input.type = 'file'
                        input.accept = '.zip,application/zip'
                        input.onchange = () => {
                          const f = input.files?.[0]
                          if (!f) return
                          void (async () => {
                            try {
                              const imported = await readZipFile(f)
                              if (!imported.length) {
                                setError('ZIP contained no deployable files')
                                setPhase('failed')
                                return
                              }
                              const det = detectProject(imported)
                              const files = pathsToProjectFiles(imported)
                              const proj = projectStore.createFromImport(
                                project.name + ' (ZIP)',
                                files,
                                det.projectType
                              )
                              setBusy(true)
                              setPhase('running')
                              setStages(emptyStages())
                              setLogs([])
                              startTs.current = Date.now()
                              setElapsed(0)
                              timerRef.current = window.setInterval(() => {
                                setElapsed(Date.now() - startTs.current)
                              }, 250)
                              const pkg = await services.deployment.packageProject(proj, env)
                              if (typeof services.deployment.startStream === 'function') {
                                const final = await services.deployment.startStream(
                                  { package: pkg },
                                  handleStreamEvent
                                )
                                deploymentIdRef.current = final.id
                              } else {
                                const started = await services.deployment.start({ package: pkg })
                                if (started.record)
                                  handleStreamEvent({ type: 'done', record: started.record })
                              }
                            } catch (err) {
                              setPhase('failed')
                              setError(err instanceof Error ? err.message : String(err))
                              setBusy(false)
                              finishTimer()
                            }
                          })()
                        }
                        input.click()
                      }}
                    >
                      Upload ZIP
                    </Button>
                  </div>
                </div>
              </section>

              <div className="dp-actions">
                <Button variant="ghost" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={() => void startDeploy()}
                  disabled={!detection.supported || !configured}
                >
                  Deploy
                </Button>
              </div>
            </div>
          )}

          {/* RUNNING */}
          {phase === 'running' && (
            <>
              <div className="dp-stages-col">
                {connectionLost && (
                  <div className="dp-notice warn">
                    <Icon name="warning" size={14} />
                    <p>Connection lost — checking deployment status…</p>
                  </div>
                )}
                <ol className="dp-stage-list" aria-live="polite">
                  {stages.map((s, i) => {
                    const prevDone =
                      i === 0 ||
                      stages[i - 1].status === 'done' ||
                      stages[i - 1].status === 'skipped'
                    return (
                      <li
                        key={s.id}
                        className={`dp-stage-row dp-stage-row--${s.status}`}
                        aria-current={s.status === 'running' ? 'step' : undefined}
                      >
                        <div className="dp-stage-rail">
                          <StageRing status={s.status} reducedMotion={reducedMotion} />
                          {i < stages.length - 1 && (
                            <span
                              className={`dp-connector ${
                                s.status === 'done' || s.status === 'skipped'
                                  ? 'dp-connector--on'
                                  : ''
                              } ${prevDone ? '' : ''}`}
                            />
                          )}
                        </div>
                        <div className="dp-stage-main">
                          <div className="dp-stage-top">
                            <span className="dp-stage-label">{s.label}</span>
                            <span className="dp-stage-meta">
                              {s.status === 'done' || s.status === 'skipped'
                                ? formatDuration(s.durationMs)
                                : s.status === 'running'
                                  ? '…'
                                  : ''}
                            </span>
                          </div>
                          {s.detail && (
                            <p className="dp-stage-detail">{s.detail}</p>
                          )}
                        </div>
                      </li>
                    )
                  })}
                </ol>
              </div>
              <div className="dp-log-col">
                <div className="dp-log-head">
                  <span>Live logs</span>
                  <div className="dp-log-actions">
                    {logPaused && (
                      <button
                        type="button"
                        className="dp-link-btn"
                        onClick={() => {
                          setLogPaused(false)
                          if (logRef.current) {
                            logRef.current.scrollTop = logRef.current.scrollHeight
                          }
                        }}
                      >
                        Resume scroll
                      </button>
                    )}
                    <button
                      type="button"
                      className="dp-link-btn"
                      onClick={() => copyText(logs.join('\n'))}
                    >
                      Copy
                    </button>
                  </div>
                </div>
                <div
                  className="dp-log-term"
                  ref={logRef}
                  onScroll={onLogScroll}
                  role="log"
                >
                  {logs.length === 0 ? (
                    <div className="dp-log-empty">Waiting for output…</div>
                  ) : (
                    logs.map((line, idx) => (
                      <div key={idx} className="dp-log-line">
                        <span className="dp-log-ts mono">
                          {new Date().toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </span>
                        <span className="dp-log-text">{line}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}

          {/* SUCCESS */}
          {phase === 'ready' && record && (
            <div className="dp-panel dp-success">
              <div className="dp-success-glow" aria-hidden />
              <div className="dp-success-icon">
                <StageRing status="done" reducedMotion={reducedMotion} />
              </div>
              <h2>Your project is live</h2>
              <p className="dp-success-sub">
                Deployed in{' '}
                {formatDuration(
                  record.durationMs ??
                    (record.finishedAt && record.startedAt
                      ? new Date(record.finishedAt).getTime() -
                        new Date(record.startedAt).getTime()
                      : elapsed)
                )}
              </p>
              <div className="dp-url-card">
                <span className="mono dp-url">{record.url}</span>
                <div className="dp-url-actions">
                  <Button
                    variant="primary"
                    onClick={() =>
                      record.url && window.open(record.url, '_blank', 'noopener')
                    }
                  >
                    Visit
                  </Button>
                  <Button variant="ghost" onClick={() => record.url && copyText(record.url)}>
                    Copy URL
                  </Button>
                </div>
              </div>
              <div className="dp-actions">
                <Button variant="ghost" onClick={onClose}>
                  Back to editor
                </Button>
              </div>
            </div>
          )}

          {/* FAILURE */}
          {phase === 'failed' && (
            <div className="dp-panel dp-failed">
              <h2>Deployment failed</h2>
              <ol className="dp-stage-list dp-stage-list--readonly">
                {stages.map((s, i) => {
                  const isFail =
                    s.status === 'failed' ||
                    (failedStage === s.id && phase === 'failed')
                  const notRun =
                    failedStage &&
                    STAGE_ORDER.indexOf(s.id) > STAGE_ORDER.indexOf(failedStage) &&
                    s.status === 'pending'
                  return (
                    <li
                      key={s.id}
                      className={`dp-stage-row dp-stage-row--${
                        isFail ? 'failed' : notRun ? 'pending' : s.status
                      } ${isFail ? 'dp-stage-row--expanded' : ''}`}
                    >
                      <div className="dp-stage-rail">
                        <StageRing
                          status={
                            isFail
                              ? 'failed'
                              : notRun
                                ? 'pending'
                                : s.status
                          }
                          reducedMotion={reducedMotion}
                        />
                        {i < stages.length - 1 && (
                          <span
                            className={`dp-connector ${
                              s.status === 'done' ? 'dp-connector--on' : ''
                            }`}
                          />
                        )}
                      </div>
                      <div className="dp-stage-main">
                        <div className="dp-stage-top">
                          <span className="dp-stage-label">{s.label}</span>
                          <span className="dp-stage-meta">
                            {notRun
                              ? 'Not run'
                              : formatDuration(s.durationMs)}
                          </span>
                        </div>
                        {isFail && (
                          <div className="dp-fail-box">
                            <p className="dp-fail-msg">{error}</p>
                            {hint && (
                              <p className="dp-fail-hint">
                                <strong>What to try:</strong> {hint}
                              </p>
                            )}
                            {(s.logs?.length || logs.length > 0) && (
                              <pre className="dp-fail-logs">
                                {(s.logs && s.logs.length ? s.logs : logs)
                                  .slice(-12)
                                  .join('\n')}
                              </pre>
                            )}
                          </div>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ol>
              <div className="dp-actions">
                <Button
                  variant="primary"
                  onClick={() => void startDeploy()}
                >
                  Retry
                </Button>
                <Button variant="ghost" onClick={() => copyText(logs.join('\n') || error || '')}>
                  Copy logs
                </Button>
                <Button variant="ghost" onClick={onClose}>
                  Back to editor
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/** Thin wrapper so existing imports of DeployModal keep working */
export function DeployModal(props: DeployPageProps) {
  return <DeployPage {...props} />
}
