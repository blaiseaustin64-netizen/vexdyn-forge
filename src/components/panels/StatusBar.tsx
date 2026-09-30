/**
 * Status bar — bottom edge of IDE
 */

import type { SaveState } from '../../hooks/useWorkspace'
import type { RuntimeStatus } from '../../services/types'

interface StatusBarProps {
  saveState: SaveState
  language?: string
  line?: number
  column?: number
  runtime?: RuntimeStatus
  fileCount: number
  projectName: string
}

export function StatusBar({
  saveState,
  language,
  line,
  column,
  runtime,
  fileCount,
  projectName,
}: StatusBarProps) {
  const saveLabel =
    saveState === 'saving'
      ? 'Saving…'
      : saveState === 'unsaved'
        ? 'Unsaved'
        : 'Saved'

  return (
    <footer className="status-bar" role="status">
      <div className="status-left">
        <span className="status-item" data-state={saveState}>
          {saveLabel}
        </span>
        <span className="status-item muted">{projectName}</span>
        <span className="status-item muted">{fileCount} files</span>
      </div>
      <div className="status-right">
        {runtime && (
          <span className={`status-item runtime-${runtime.state}`}>
            {runtime.state === 'running' ? '● Preview' : runtime.state}
          </span>
        )}
        {language && language !== 'text' && (
          <span className="status-item">{language.toUpperCase()}</span>
        )}
        {line != null && (
          <span className="status-item">
            Ln {line}
            {column != null ? `, Col ${column}` : ''}
          </span>
        )}
      </div>
    </footer>
  )
}
