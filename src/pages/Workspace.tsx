import { useState, useCallback, useEffect } from 'react'
import { Button } from '../components/Button'
import { Input } from '../components/Input'
import { Modal } from '../components/Modal'
import { FileTree } from '../components/FileTree'
import { CodeEditor } from '../components/CodeEditor'
import { PreviewPanel } from '../components/PreviewPanel'
import { useWorkspace } from '../hooks/useWorkspace'
import type { Project, ProjectFile } from '../types/project'
import { isTextFile } from '../types/project'
import { validateFilename } from '../lib/filenames'
import { downloadProject } from '../lib/download'

type MobilePane = 'files' | 'code' | 'preview'

interface WorkspaceProps {
  project: Project
  onBack: () => void
}

export function Workspace({ project: initial, onBack }: WorkspaceProps) {
  const ws = useWorkspace(initial)
  const [running, setRunning] = useState(false)
  const [runOverlay, setRunOverlay] = useState(false)
  const [runSuccess, setRunSuccess] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [mobilePane, setMobilePane] = useState<MobilePane>('code')

  const [createKind, setCreateKind] = useState<'file' | 'folder' | null>(null)
  const [createParent, setCreateParent] = useState<string | null>(null)
  const [createName, setCreateName] = useState('')
  const [createError, setCreateError] = useState<string | null>(null)

  const [renameTarget, setRenameTarget] = useState<ProjectFile | null>(null)
  const [renameName, setRenameName] = useState('')
  const [renameError, setRenameError] = useState<string | null>(null)

  const [deleteTarget, setDeleteTarget] = useState<ProjectFile | null>(null)
  const [leaveOpen, setLeaveOpen] = useState(false)

  const startCreate = (kind: 'file' | 'folder', parentId: string | null) => {
    setCreateKind(kind)
    setCreateParent(parentId)
    setCreateName('')
    setCreateError(null)
  }

  const confirmCreate = () => {
    if (!createKind) return
    const err = validateFilename(createName, createKind)
    if (err) {
      setCreateError(err)
      return
    }
    const name = createName.trim()
    const parent = ws.files.find((f) => f.id === createParent)
    const path = parent ? `${parent.path}/${name}` : name
    if (ws.files.some((f) => f.path.toLowerCase() === path.toLowerCase())) {
      setCreateError('A file or folder already exists at that path')
      return
    }
    const now = new Date().toISOString()
    const node: ProjectFile = {
      id: crypto.randomUUID(),
      name,
      path,
      kind: createKind,
      content: createKind === 'file' ? '' : undefined,
      parentId: createParent,
      createdAt: now,
      updatedAt: now,
    }
    ws.addFile(node)
    setCreateKind(null)
    if (node.kind === 'file') setMobilePane('code')
  }

  const confirmRename = () => {
    if (!renameTarget) return
    const err = validateFilename(renameName, renameTarget.kind)
    if (err) {
      setRenameError(err)
      return
    }
    ws.renameNode(renameTarget.id, renameName.trim())
    setRenameTarget(null)
  }

  const handleBack = () => {
    if (ws.isDirty && ws.saveState !== 'saved') {
      setLeaveOpen(true)
      return
    }
    ws.saveNow()
    onBack()
  }

  const handleRun = useCallback(() => {
    setRunning(true)
    setRunOverlay(true)
    setRunSuccess(false)
    // Execute immediately — animation is visual only
    ws.runPreview()
    setMobilePane('preview')
    const reduced =
      typeof document !== 'undefined' &&
      (document.documentElement.dataset.reduceMotion === 'true' ||
        window.matchMedia('(prefers-reduced-motion: reduce)').matches)
    const duration = reduced ? 120 : 720
    window.setTimeout(() => {
      setRunOverlay(false)
      setRunning(false)
      setRunSuccess(true)
      window.setTimeout(() => setRunSuccess(false), 600)
    }, duration)
  }, [ws])


  useEffect(() => {
    if (ws.previewError) setRunSuccess(false)
  }, [ws.previewError])

  const handleDownload = async () => {
    setDownloading(true)
    try {
      ws.saveNow()
      await downloadProject(ws.project)
    } finally {
      window.setTimeout(() => setDownloading(false), 200)
    }
  }

  const handleOpenFile = (file: ProjectFile) => {
    ws.openFile(file)
    setMobilePane('code')
  }

  const saveLabel =
    ws.saveState === 'saving'
      ? 'Saving…'
      : ws.saveState === 'unsaved'
        ? 'Unsaved'
        : '✓ Saved'

  return (
    <section className="workspace" aria-label="Forge workspace">
      <header className="ws-bar">
        <div className="ws-bar-left">
          <button type="button" className="ws-back" onClick={handleBack}>
            ← Projects
          </button>
          <span className="ws-sep" aria-hidden />
          <h1 className="ws-project-name">{ws.project.name}</h1>
        </div>
        <div className="ws-save-state" data-state={ws.saveState} aria-live="polite">
          {saveLabel}
        </div>
        <div className="ws-bar-right">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleDownload}
            disabled={downloading}
            className="hide-mobile"
          >
            {downloading ? 'Preparing…' : 'Download'}
          </Button>
          <Button variant="primary" size="sm" onClick={handleRun} disabled={running}>
            {running ? 'Running…' : 'Run'}
          </Button>
        </div>
      </header>

      <div className={`ws-body mobile-pane-${mobilePane}`}>
        <div className="ws-pane ws-pane-files">
          <FileTree
            files={ws.files}
            activeFileId={ws.activeFileId}
            collapsed={ws.collapsed}
            onOpen={handleOpenFile}
            onToggle={ws.toggleFolder}
            onNewFile={(pid) => startCreate('file', pid)}
            onNewFolder={(pid) => startCreate('folder', pid)}
            onRename={(f) => {
              setRenameTarget(f)
              setRenameName(f.name)
              setRenameError(null)
            }}
            onDelete={setDeleteTarget}
          />
        </div>

        <div className="ws-pane ws-pane-code editor-panel">
          <div className="editor-tabs" role="tablist">
            {ws.openTabs.map((id) => {
              const f = ws.files.find((x) => x.id === id)
              if (!f) return null
              const active = id === ws.activeFileId
              const dirty = ws.dirtyIds.has(id)
              return (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  className={`editor-tab ${active ? 'active' : ''}`}
                  onClick={() => ws.openFile(f)}
                >
                  <span>
                    {f.name}
                    {dirty ? ' •' : ''}
                  </span>
                  <span
                    className="tab-close"
                    role="button"
                    tabIndex={0}
                    aria-label={`Close ${f.name}`}
                    onClick={(e) => {
                      e.stopPropagation()
                      ws.closeTab(id)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.stopPropagation()
                        ws.closeTab(id)
                      }
                    }}
                  >
                    ×
                  </span>
                </button>
              )
            })}
          </div>
          <div className="editor-stage">
            {ws.activeFile && isTextFile(ws.activeFile.name) ? (
              <CodeEditor
                fileId={ws.activeFile.id}
                filename={ws.activeFile.name}
                value={ws.activeFile.content ?? ''}
                onChange={(v) => ws.updateContent(ws.activeFile!.id, v)}
                onSave={ws.saveNow}
              />
            ) : ws.activeFile ? (
              <div className="editor-empty">
                <p>This file type cannot be edited as text in V1.</p>
              </div>
            ) : (
              <div className="editor-empty">
                <p>Select a file to edit, or create one with +</p>
              </div>
            )}
          </div>
        </div>

        <div className="ws-pane ws-pane-preview">
          <PreviewPanel
            files={ws.files}
            nonce={ws.previewNonce}
            error={ws.previewError}
            onRefresh={handleRun}
            onClearError={() => ws.setPreviewError(null)}
          />
        </div>
      </div>

      <nav className="ws-mobile-nav" aria-label="Workspace sections">
        <button
          type="button"
          className={mobilePane === 'files' ? 'active' : ''}
          onClick={() => setMobilePane('files')}
        >
          Files
        </button>
        <button
          type="button"
          className={mobilePane === 'code' ? 'active' : ''}
          onClick={() => setMobilePane('code')}
        >
          Code
        </button>
        <button
          type="button"
          className={mobilePane === 'preview' ? 'active' : ''}
          onClick={() => setMobilePane('preview')}
        >
          Preview
        </button>
        <button
          type="button"
          className="mobile-download"
          onClick={handleDownload}
          disabled={downloading}
        >
          {downloading ? '…' : 'ZIP'}
        </button>
      </nav>


      {(runOverlay || runSuccess) && (
        <div
          className={`run-overlay ${runOverlay ? 'active' : ''} ${runSuccess ? 'success' : ''}`}
          aria-hidden={!runOverlay}
        >
          <div className="run-wave run-wave-1" />
          <div className="run-wave run-wave-2" />
          <div className="run-wave run-wave-3" />
          <div className="run-success-glow" />
        </div>
      )}

      <Modal
        open={!!createKind}
        onClose={() => setCreateKind(null)}
        title={createKind === 'folder' ? 'New folder' : 'New file'}
      >
        <label className="label" htmlFor="new-node-name">
          {createKind === 'folder' ? 'Folder name' : 'Filename'}
        </label>
        <Input
          id="new-node-name"
          value={createName}
          onChange={(e) => setCreateName(e.target.value)}
          placeholder={createKind === 'folder' ? 'assets' : 'about.html'}
          autoFocus
          error={!!createError}
          onKeyDown={(e) => e.key === 'Enter' && confirmCreate()}
        />
        {createError && (
          <p className="field-error" role="alert">
            {createError}
          </p>
        )}
        <div className="modal-footer create-footer">
          <Button variant="ghost" onClick={() => setCreateKind(null)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={confirmCreate}>
            Create
          </Button>
        </div>
      </Modal>

      <Modal open={!!renameTarget} onClose={() => setRenameTarget(null)} title="Rename">
        <label className="label" htmlFor="rename-node">
          Name
        </label>
        <Input
          id="rename-node"
          value={renameName}
          onChange={(e) => setRenameName(e.target.value)}
          autoFocus
          error={!!renameError}
          onKeyDown={(e) => e.key === 'Enter' && confirmRename()}
        />
        {renameError && (
          <p className="field-error" role="alert">
            {renameError}
          </p>
        )}
        <div className="modal-footer create-footer">
          <Button variant="ghost" onClick={() => setRenameTarget(null)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={confirmRename}>
            Save changes
          </Button>
        </div>
      </Modal>

      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title={deleteTarget?.kind === 'folder' ? 'Delete folder?' : 'Delete file?'}
      >
        <p className="delete-message">
          {deleteTarget?.kind === 'folder'
            ? `This will permanently remove ${deleteTarget?.name} and everything inside it.`
            : `This will permanently remove ${deleteTarget?.name} from this project.`}
        </p>
        <div className="modal-footer create-footer">
          <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              if (deleteTarget) ws.deleteNode(deleteTarget.id)
              setDeleteTarget(null)
            }}
          >
            Delete
          </Button>
        </div>
      </Modal>

      <Modal open={leaveOpen} onClose={() => setLeaveOpen(false)} title="Unsaved changes">
        <p className="delete-message">
          There are unsaved changes. Leave anyway? Unsaved edits may be lost if save failed.
        </p>
        <div className="modal-footer create-footer">
          <Button variant="ghost" onClick={() => setLeaveOpen(false)}>
            Stay
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              setLeaveOpen(false)
              onBack()
            }}
          >
            Leave
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              ws.saveNow()
              setLeaveOpen(false)
              onBack()
            }}
          >
            Save and leave
          </Button>
        </div>
      </Modal>
    </section>
  )
}
