import { useEffect, useMemo } from 'react'
import type { ProjectFile } from '../types/project'
import { buildPreviewDocument } from '../lib/preview'

interface PreviewPanelProps {
  files: ProjectFile[]
  nonce: number
  error: string | null
  onRefresh: () => void
  onClearError: () => void
  onPreviewMessage?: (msg: {
    type: string
    level?: string
    message: string
  }) => void
}

export function PreviewPanel({
  files,
  nonce,
  error,
  onRefresh,
  onClearError,
  onPreviewMessage,
}: PreviewPanelProps) {
  const srcDoc = useMemo(() => buildPreviewDocument(files), [files, nonce])

  useEffect(() => {
    onClearError()
  }, [nonce, onClearError])

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const data = event.data
      if (!data || data.source !== 'vexdyn-forge-preview') return
      onPreviewMessage?.({
        type: data.type,
        level: data.level,
        message: data.message,
      })
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [onPreviewMessage])

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
