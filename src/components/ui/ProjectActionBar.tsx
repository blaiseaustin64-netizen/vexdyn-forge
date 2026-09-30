/**
 * Project action bar — Run / Stop / Preview / Deploy / Download
 */

import { IconButton } from './IconButton'
import { Button } from '../Button'
import { Icon } from './Icon'

export type RunState = 'idle' | 'starting' | 'running' | 'error'

interface ProjectActionBarProps {
  runState: RunState
  onRun: () => void
  onStop: () => void
  onDownload: () => void
  onDeploy: () => void
  onCheckSite?: () => void
  downloading?: boolean
  compact?: boolean
}

export function ProjectActionBar({
  runState,
  onRun,
  onStop,
  onDownload,
  onDeploy,
  onCheckSite,
  downloading,
  compact,
}: ProjectActionBarProps) {
  const isBusy = runState === 'starting' || runState === 'running'

  if (compact) {
    return (
      <div className="project-action-bar compact">
        {isBusy ? (
          <IconButton
            icon="stop"
            label="Stop"
            variant="subtle"
            onClick={onStop}
          />
        ) : (
          <IconButton
            icon="run"
            label="Run"
            variant="primary"
            onClick={onRun}
          />
        )}
        <IconButton
          icon="download"
          label="Download ZIP"
          onClick={onDownload}
          disabled={downloading}
        />
        <IconButton icon="deploy" label="Deploy" onClick={onDeploy} />
      </div>
    )
  }

  return (
    <div className="project-action-bar">
      <div className="action-group primary-actions">
        {isBusy ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={onStop}
            className="action-run-btn running"
          >
            <Icon name="stop" size={14} />
            {runState === 'starting' ? 'Starting…' : 'Stop'}
          </Button>
        ) : (
          <Button
            variant="primary"
            size="sm"
            onClick={onRun}
            className="action-run-btn"
          >
            <Icon name="run" size={14} />
            Run
          </Button>
        )}
        {onCheckSite && (
          <Button variant="ghost" size="sm" onClick={onCheckSite}>
            <Icon name="search" size={14} />
            Check My Site
          </Button>
        )}
        <Button variant="secondary" size="sm" onClick={onDeploy}>
          <Icon name="deploy" size={14} />
          Deploy
        </Button>
      </div>
      <div className="action-group secondary-actions">
        <Button
          variant="ghost"
          size="sm"
          onClick={onDownload}
          disabled={downloading}
        >
          <Icon name="download" size={14} />
          {downloading ? 'Preparing…' : 'Download'}
        </Button>
      </div>
    </div>
  )
}
