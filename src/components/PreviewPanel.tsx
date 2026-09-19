import { useEffect, useMemo } from 'react'
import type { ProjectFile } from '../types/project'
import { buildPreviewDocument } from '../lib/preview'

interface PreviewPanelProps {
  files: ProjectFile[]
  nonce: number
  error: string | null
  onRefresh: () => void
  onClearError: () => void
}

export function PreviewPanel({
  files,
  nonce,
  error,
  onRefresh,
  onClearError,
}: PreviewPanelProps) {
  const srcDoc = useMemo(() => buildPreviewDocument(files), [files, nonce])

  useEffect(() => {
    onClearError()
    // nonce change = new run
  }, [nonce, onClearError])

  return (
    <aside className="preview-panel" aria-label="Project preview">
      <div className="preview-header">
        <span className="files-title">Preview</span>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onRefresh}>
          Refresh
        </button>
      </div>
      <div className="preview-frame-wrap">
        {error && (
          <div className="preview-error" role="alert">
            <strong>Preview error</strong>
            <p>{error}</p>
            <button type="button" className="btn btn-secondary btn-sm" onClick={onClearError}>
              Dismiss
            </button>
          </div>
        )}
        <iframe
          key={nonce}
          className="preview-frame"
          title="Project preview"
          sandbox="allow-scripts allow-modals allow-forms"
          srcDoc={srcDoc}
        />
      </div>
    </aside>
  )
}
