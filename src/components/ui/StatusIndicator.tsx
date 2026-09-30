/**
 * Deployment / runtime status indicator
 */

export type StatusKind =
  | 'ready'
  | 'building'
  | 'queued'
  | 'deploying'
  | 'failed'
  | 'cancelled'
  | 'stopped'
  | 'running'
  | 'idle'
  | 'local'
  | 'cloud'

const LABELS: Record<StatusKind, string> = {
  ready: 'Ready',
  building: 'Building',
  queued: 'Queued',
  deploying: 'Deploying',
  failed: 'Failed',
  cancelled: 'Cancelled',
  stopped: 'Stopped',
  running: 'Running',
  idle: 'Ready',
  local: 'Local',
  cloud: 'Cloud',
}

interface StatusIndicatorProps {
  status: StatusKind
  label?: string
  size?: 'sm' | 'md'
}

export function StatusIndicator({ status, label, size = 'sm' }: StatusIndicatorProps) {
  return (
    <span className={`status-indicator status-${status} size-${size}`}>
      <span className="status-dot" aria-hidden />
      <span className="status-label">{label ?? LABELS[status]}</span>
    </span>
  )
}
