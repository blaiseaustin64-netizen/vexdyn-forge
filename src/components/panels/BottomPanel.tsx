/**
 * Bottom panel: Problems | Terminal | Output | Debug
 * Terminal is architectural — no fake command execution.
 */

import type { Diagnostic } from '../../services/types'
import { services } from '../../services'

export type BottomTab = 'problems' | 'terminal' | 'output' | 'debug'

interface BottomPanelProps {
  active: BottomTab
  onChange: (tab: BottomTab) => void
  diagnostics: Diagnostic[]
  outputLines: string[]
  collapsed: boolean
  onToggleCollapse: () => void
  onGoToDiagnostic?: (d: Diagnostic) => void
}

export function BottomPanel({
  active,
  onChange,
  diagnostics,
  outputLines,
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
          Problems
          {errorCount > 0 && <span className="badge error">{errorCount}</span>}
          {warnCount > 0 && <span className="badge warn">{warnCount}</span>}
          <span className="sep">|</span>
          Terminal
          <span className="sep">|</span>
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
          Problems
          {(errorCount > 0 || warnCount > 0) && (
            <span className="tab-count">
              {errorCount + warnCount}
            </span>
          )}
        </button>
        <button
          type="button"
          className={active === 'terminal' ? 'active' : ''}
          onClick={() => onChange('terminal')}
        >
          Terminal
        </button>
        <button
          type="button"
          className={active === 'output' ? 'active' : ''}
          onClick={() => onChange('output')}
        >
          Output
        </button>
        <button
          type="button"
          className={active === 'debug' ? 'active' : ''}
          onClick={() => onChange('debug')}
        >
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
            ▾
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
                  <span className="problem-sev">{d.severity}</span>
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
                <p className="panel-empty">
                  Terminal interface is ready.
                </p>
                <p className="panel-hint">
                  Real command execution (npm, python, build scripts) requires a
                  secure backend sandbox. Architecture and UI contracts are in
                  place — no fake output.
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
              <pre className="output-log">
                {outputLines.join('\n')}
              </pre>
            )}
          </div>
        )}

        {active === 'debug' && (
          <div className="debug-pane">
            <p className="panel-empty">
              Debug console — runtime messages and preview errors appear here.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
