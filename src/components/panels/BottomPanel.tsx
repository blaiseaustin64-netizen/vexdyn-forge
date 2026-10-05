/**
 * Bottom panel: Problems | Terminal | Output | Debug
 */

import type { Diagnostic } from '../../services/types'
import { services } from '../../services'
import { Icon } from '../ui/Icon'

export type BottomTab = 'problems' | 'terminal' | 'output' | 'debug'

interface BottomPanelProps {
  active: BottomTab
  onChange: (tab: BottomTab) => void
  diagnostics: Diagnostic[]
  outputLines: string[]
  debugLines?: string[]
  collapsed: boolean
  onToggleCollapse: () => void
  onGoToDiagnostic?: (d: Diagnostic) => void
}

export function BottomPanel({
  active,
  onChange,
  diagnostics,
  outputLines,
  debugLines = [],
  collapsed,
  onToggleCollapse,
  onGoToDiagnostic,
}: BottomPanelProps) {
  const errorCount = diagnostics.filter((d) => d.severity === 'error').length
  const warnCount = diagnostics.filter((d) => d.severity === 'warning').length
  const terminalAvailable = services.terminal.isAvailable()

  if (collapsed) {
    return (
      <div className="bottom-panel collapsed">
        <button
          type="button"
          className="bottom-panel-toggle"
          onClick={onToggleCollapse}
          aria-label="Expand panel"
        >
          <Icon name="problems" size={12} />
          Problems
          {errorCount > 0 && <span className="badge error">{errorCount}</span>}
          {warnCount > 0 && <span className="badge warn">{warnCount}</span>}
          <span className="sep">|</span>
          <Icon name="terminal" size={12} />
          Terminal
          <span className="sep">|</span>
          <Icon name="output" size={12} />
          Output
        </button>
      </div>
    )
  }

  return (
    <div className="bottom-panel">
      <div className="bottom-panel-tabs">
        <button
          type="button"
          className={active === 'problems' ? 'active' : ''}
          onClick={() => onChange('problems')}
        >
          <Icon name="problems" size={13} />
          Problems
          {(errorCount > 0 || warnCount > 0) && (
            <span className="tab-count">{errorCount + warnCount}</span>
          )}
        </button>
        <button
          type="button"
          className={active === 'terminal' ? 'active' : ''}
          onClick={() => onChange('terminal')}
        >
          <Icon name="terminal" size={13} />
          Terminal
        </button>
        <button
          type="button"
          className={active === 'output' ? 'active' : ''}
          onClick={() => onChange('output')}
        >
          <Icon name="output" size={13} />
          Output
        </button>
        <button
          type="button"
          className={active === 'debug' ? 'active' : ''}
          onClick={() => onChange('debug')}
        >
          <Icon name="debug" size={13} />
          Debug Console
        </button>
        <div className="bottom-panel-actions">
          <button
            type="button"
            className="panel-icon-btn"
            onClick={onToggleCollapse}
            aria-label="Collapse panel"
            title="Collapse"
          >
            <Icon name="chevronDown" size={14} />
          </button>
        </div>
      </div>

      <div className="bottom-panel-body">
        {active === 'problems' && (
          <div className="problems-list">
            {diagnostics.length === 0 ? (
              <p className="panel-empty">No problems detected.</p>
            ) : (
              diagnostics.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  className={`problem-row severity-${d.severity}`}
                  onClick={() => onGoToDiagnostic?.(d)}
                >
                  <Icon
                    name={
                      d.severity === 'error'
                        ? 'error'
                        : d.severity === 'warning'
                          ? 'warning'
                          : 'info'
                    }
                    size={13}
                  />
                  <span className="problem-msg">{d.message}</span>
                  <span className="problem-loc">
                    {d.path}
                    {d.line != null ? `:${d.line}` : ''}
                  </span>
                </button>
              ))
            )}
          </div>
        )}

        {active === 'terminal' && (
          <div className="terminal-pane">
            {terminalAvailable ? (
              <p className="panel-empty">Terminal session ready.</p>
            ) : (
              <div className="terminal-stub">
                <p className="panel-empty">Terminal interface is ready.</p>
                <p className="panel-hint">
                  Real command execution requires a secure backend sandbox.
                  Architecture and UI contracts are in place — no fake output.
                </p>
              </div>
            )}
          </div>
        )}

        {active === 'output' && (
          <div className="output-pane">
            {outputLines.length === 0 ? (
              <p className="panel-empty">No output yet. Run or build to see logs.</p>
            ) : (
              <pre className="output-log">{outputLines.join('\n')}</pre>
            )}
          </div>
        )}

        {active === 'debug' && (
          <div className="debug-pane">
            {debugLines.length === 0 ? (
              <p className="panel-empty">
                Preview console.log / warn / error appear here when the preview runs.
              </p>
            ) : (
              <pre className="output-log">{debugLines.join('\n')}</pre>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
