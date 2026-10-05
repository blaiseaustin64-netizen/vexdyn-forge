/**
 * Import existing project: files, folder, ZIP, drag & drop.
 * Mobile-friendly native file pickers.
 */

import { useCallback, useRef, useState } from 'react'
import { Modal } from './Modal'
import { Button } from './Button'
import { Input } from './Input'
import { Icon } from './ui/Icon'
import {
  detectProject,
  pathsToProjectFiles,
  readFileList,
  type ImportedPath,
  type ProjectDetection,
} from '../lib/importProject'

interface ImportProjectModalProps {
  open: boolean
  onClose: () => void
  onImport: (
    name: string,
    files: ReturnType<typeof pathsToProjectFiles>,
    detection: ProjectDetection
  ) => void
  isImporting?: boolean
}

type Phase = 'pick' | 'review'

export function ImportProjectModal({
  open,
  onClose,
  onImport,
  isImporting = false,
}: ImportProjectModalProps) {
  const [phase, setPhase] = useState<Phase>('pick')
  const [name, setName] = useState('')
  const [paths, setPaths] = useState<ImportedPath[]>([])
  const [detection, setDetection] = useState<ProjectDetection | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [busy, setBusy] = useState(false)

  const fileRef = useRef<HTMLInputElement>(null)
  const folderRef = useRef<HTMLInputElement>(null)
  const zipRef = useRef<HTMLInputElement>(null)

  const reset = () => {
    setPhase('pick')
    setName('')
    setPaths([])
    setDetection(null)
    setError(null)
    setDragOver(false)
    setBusy(false)
  }

  const handleClose = () => {
    if (isImporting || busy) return
    reset()
    onClose()
  }

  const ingest = useCallback(async (list: FileList | File[]) => {
    setBusy(true)
    setError(null)
    try {
      const imported = await readFileList(list)
      if (!imported.length) {
        setError(
          'No readable text files found. Try a ZIP or folder with HTML/CSS/JS source files.'
        )
        setBusy(false)
        return
      }
      const det = detectProject(imported)
      setPaths(imported)
      setDetection(det)
      // Suggest name from common root or first html
      if (!name.trim()) {
        const hint =
          imported.find((f) => f.path === 'package.json') ||
          imported.find((f) => f.path === 'index.html') ||
          imported[0]
        const base = hint.path.split('/')[0].replace(/\.[^.]+$/, '') || 'Imported Project'
        setName(base === 'package' || base === 'index' ? 'Imported Project' : base)
      }
      setPhase('review')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to read files')
    } finally {
      setBusy(false)
    }
  }, [name])

  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const items = e.dataTransfer.files
    if (items?.length) await ingest(items)
  }

  const submit = () => {
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Enter a project name')
      return
    }
    if (!paths.length || !detection) {
      setError('No files loaded')
      return
    }
    const files = pathsToProjectFiles(paths)
    onImport(trimmed, files, detection)
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={phase === 'pick' ? 'Import project' : 'Review import'}
    >
      <div className="import-form">
        {phase === 'pick' && (
          <>
            <p className="import-lead">
              Bring an existing project into Forge. Files stay in your browser —
              nothing is uploaded to a server during import.
            </p>

            <div
              className={`import-drop ${dragOver ? 'import-drop--over' : ''}`}
              onDragEnter={(e) => {
                e.preventDefault()
                setDragOver(true)
              }}
              onDragOver={(e) => {
                e.preventDefault()
                setDragOver(true)
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => void onDrop(e)}
            >
              <Icon name="upload" size={22} />
              <p className="import-drop-title">Drop files or a ZIP here</p>
              <p className="import-drop-sub">
                Or use the buttons below. On phones, use Upload File or Upload ZIP.
              </p>
            </div>

            <div className="import-actions-grid">
              <Button
                variant="secondary"
                type="button"
                disabled={busy}
                onClick={() => fileRef.current?.click()}
              >
                Upload File
              </Button>
              <Button
                variant="secondary"
                type="button"
                disabled={busy}
                onClick={() => folderRef.current?.click()}
              >
                Upload Folder
              </Button>
              <Button
                variant="secondary"
                type="button"
                disabled={busy}
                onClick={() => zipRef.current?.click()}
              >
                Upload ZIP
              </Button>
            </div>

            <input
              ref={fileRef}
              type="file"
              multiple
              className="sr-only"
              accept=".html,.css,.js,.jsx,.ts,.tsx,.json,.md,.txt,.svg,.py,.sql,.zip,text/*"
              onChange={(e) => {
                if (e.target.files?.length) void ingest(e.target.files)
                e.target.value = ''
              }}
            />
            <input
              ref={folderRef}
              type="file"
              className="sr-only"
              // @ts-expect-error webkitdirectory is non-standard but widely supported
              webkitdirectory=""
              directory=""
              multiple
              onChange={(e) => {
                if (e.target.files?.length) void ingest(e.target.files)
                e.target.value = ''
              }}
            />
            <input
              ref={zipRef}
              type="file"
              className="sr-only"
              accept=".zip,application/zip"
              onChange={(e) => {
                if (e.target.files?.length) void ingest(e.target.files)
                e.target.value = ''
              }}
            />

            {busy && <p className="import-status">Reading files…</p>}
            {error && <p className="import-error">{error}</p>}
          </>
        )}

        {phase === 'review' && detection && (
          <>
            <div className="import-field">
              <label className="label" htmlFor="import-project-name">
                Project name
              </label>
              <Input
                id="import-project-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>

            <div className="import-detect">
              <p className="import-detect-summary">{detection.summary}</p>
              <div className="import-detect-tags">
                {detection.labels.map((l) => (
                  <span key={l} className="import-tag">
                    {l}
                  </span>
                ))}
              </div>
              <p className="import-detect-meta">
                {paths.length} file{paths.length === 1 ? '' : 's'} ready
                {detection.hasPackageJson
                  ? ' · package.json found (packages are not installed automatically)'
                  : ''}
              </p>
            </div>

            <details className="import-file-list">
              <summary>Show files</summary>
              <ul>
                {paths.slice(0, 80).map((f) => (
                  <li key={f.path} className="mono">
                    {f.path}
                  </li>
                ))}
                {paths.length > 80 && (
                  <li className="muted">…and {paths.length - 80} more</li>
                )}
              </ul>
            </details>

            {error && <p className="import-error">{error}</p>}

            <div className="modal-footer create-footer">
              <Button
                variant="ghost"
                onClick={() => {
                  setPhase('pick')
                  setPaths([])
                  setDetection(null)
                  setError(null)
                }}
                disabled={isImporting}
              >
                Back
              </Button>
              <Button
                variant="primary"
                onClick={submit}
                disabled={isImporting || !name.trim()}
              >
                {isImporting ? 'Importing…' : 'Open in Forge'}
              </Button>
            </div>
          </>
        )}

        {phase === 'pick' && (
          <div className="modal-footer create-footer">
            <Button variant="ghost" onClick={handleClose} disabled={busy}>
              Cancel
            </Button>
          </div>
        )}
      </div>
    </Modal>
  )
}
