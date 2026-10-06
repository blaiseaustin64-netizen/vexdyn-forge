import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { Button } from '../components/Button'
import { Input } from '../components/Input'
import { Modal } from '../components/Modal'
import { FileTree } from '../components/FileTree'
import { CodeEditor, type CodeEditorHandle } from '../components/CodeEditor'
import { PreviewPanel } from '../components/PreviewPanel'
import { ActivityBar, type ActivityView } from '../components/panels/ActivityBar'
import { BottomPanel, type BottomTab } from '../components/panels/BottomPanel'
import { StatusBar } from '../components/panels/StatusBar'
import { Breadcrumbs } from '../components/panels/Breadcrumbs'
import { SearchPanel } from '../components/panels/SearchPanel'
import { CommandPalette, type CommandItem } from '../components/ui/CommandPalette'
import { GoToLine } from '../components/ui/GoToLine'
import { ProjectActionBar, type RunState } from '../components/ui/ProjectActionBar'
import { DeployModal } from '../components/deploy/DeployModal'
import { DeploymentsPanel } from '../components/deploy/DeploymentsPanel'
import { Icon } from '../components/ui/Icon'
import { IconButton } from '../components/ui/IconButton'
import { FileTypeIcon } from '../components/ui/Icon'
import { useWorkspace } from '../hooks/useWorkspace'
import type { Project, ProjectFile } from '../types/project'
import { isTextFile, languageFromFilename } from '../types/project'
import { validateFilename } from '../lib/filenames'
import { downloadProject } from '../lib/download'
import { runBasicDiagnostics } from '../services/localDiagnosticsService'
import { services } from '../services'
import type { Diagnostic } from '../services/types'

type MobilePane = 'files' | 'code' | 'preview'

interface WorkspaceProps {
  project: Project
  onBack: () => void
}

export function Workspace({ project: initial, onBack }: WorkspaceProps) {
  const ws = useWorkspace(initial)
  const [runState, setRunState] = useState<RunState>('idle')
  const [downloading, setDownloading] = useState(false)
  const [mobilePane, setMobilePane] = useState<MobilePane>('code')

  const [activity, setActivity] = useState<ActivityView>('explorer')
  const [bottomTab, setBottomTab] = useState<BottomTab>('problems')
  const [bottomCollapsed, setBottomCollapsed] = useState(true)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [previewCollapsed, setPreviewCollapsed] = useState(false)
  const [outputLines, setOutputLines] = useState<string[]>([])
  const [debugLines, setDebugLines] = useState<string[]>([])
  const [fullscreenEditor, setFullscreenEditor] = useState(false)

  // Command palette / go-to
  const [cmdOpen, setCmdOpen] = useState(false)
  const [cmdMode, setCmdMode] = useState<'commands' | 'files'>('commands')
  const [gotoOpen, setGotoOpen] = useState(false)
  const [deployOpen, setDeployOpen] = useState(false)
  const [deployRefresh, setDeployRefresh] = useState(0)
  const [showDeployments, setShowDeployments] = useState(false)

  // Closed tabs stack for reopen
  const [closedTabs, setClosedTabs] = useState<string[]>([])
  const editorRef = useRef<CodeEditorHandle | null>(null)
  const [splitMode, setSplitMode] = useState<'none' | 'right'>('none')
  const [secondaryFileId, setSecondaryFileId] = useState<string | null>(null)
  const [activeGroup, setActiveGroup] = useState<'primary' | 'secondary'>('primary')
  const [secondaryTabs, setSecondaryTabs] = useState<string[]>([])

  const [createKind, setCreateKind] = useState<'file' | 'folder' | null>(null)
  const [createParent, setCreateParent] = useState<string | null>(null)
  const [createName, setCreateName] = useState('')
  const [createError, setCreateError] = useState<string | null>(null)

  const [renameTarget, setRenameTarget] = useState<ProjectFile | null>(null)
  const [renameName, setRenameName] = useState('')
  const [renameError, setRenameError] = useState<string | null>(null)

  const [deleteTarget, setDeleteTarget] = useState<ProjectFile | null>(null)
  const [leaveOpen, setLeaveOpen] = useState(false)

  // Tab context menu
  const [tabMenu, setTabMenu] = useState<{
    open: boolean
    x: number
    y: number
    fileId: string | null
  }>({ open: false, x: 0, y: 0, fileId: null })

  const diagnostics = useMemo(
    () => runBasicDiagnostics(ws.project.id, ws.files),
    [ws.project.id, ws.files]
  )

  // Auto-run preview once when opening a project that has HTML (templates)
  const autoPreviewDone = useRef(false)
  useEffect(() => {
    if (autoPreviewDone.current) return
    const hasHtml = ws.files.some(
      (f) => f.kind === 'file' && (f.name === 'index.html' || f.name.endsWith('.html'))
    )
    if (hasHtml) {
      autoPreviewDone.current = true
      // Defer so preview panel is mounted
      const t = window.setTimeout(() => {
        ws.runPreview()
        setRunState('running')
      }, 120)
      return () => window.clearTimeout(t)
    }
  }, [ws.files, ws])

  const activeLang = ws.activeFile
    ? languageFromFilename(ws.activeFile.name)
    : undefined

  const textFiles = useMemo(
    () =>
      ws.files
        .filter((f) => f.kind === 'file' && isTextFile(f.name))
        .map((f) => ({ id: f.id, path: f.path, name: f.name })),
    [ws.files]
  )

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
    if (node.kind === 'file') {
      setMobilePane('code')
      // After modal unmount/focus-restore, put caret in the editor
      window.setTimeout(() => {
        editorRef.current?.focus()
      }, 0)
      window.setTimeout(() => {
        editorRef.current?.focus()
      }, 50)
    }
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
    setRunState('starting')
    setOutputLines((prev) => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] Starting preview…`,
    ])
    ws.runPreview()
    setMobilePane('preview')
    if (previewCollapsed) setPreviewCollapsed(false)
    void services.runtime.start(ws.project).then((status) => {
      if (status.state === 'error') {
        setRunState('error')
        setOutputLines((prev) => [
          ...prev,
          `[error] ${status.message ?? 'Runtime error'}`,
        ])
        setBottomCollapsed(false)
        setBottomTab('output')
      } else {
        setRunState('running')
        setOutputLines((prev) => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] Preview running`,
        ])
      }
    })
  }, [ws, previewCollapsed])

  const handleStop = useCallback(() => {
    void services.runtime.stop(ws.project.id)
    setRunState('idle')
    setOutputLines((prev) => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] Preview stopped`,
    ])
  }, [ws.project.id])

  useEffect(() => {
    if (ws.previewError) {
      setRunState('error')
      setOutputLines((prev) => [...prev, `[error] ${ws.previewError}`])
      setBottomCollapsed(false)
      setBottomTab('output')
    }
  }, [ws.previewError])

  const handleDownload = async () => {
    setDownloading(true)
    try {
      ws.saveNow()
      await downloadProject(ws.project)
      setOutputLines((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] Project ZIP downloaded`,
      ])
    } finally {
      window.setTimeout(() => setDownloading(false), 200)
    }
  }

  const handleOpenFile = (file: ProjectFile) => {
    ws.openFile(file)
    setMobilePane('code')
  }

  const handleOpenFileById = (fileId: string, line?: number, column?: number) => {
    const f = ws.files.find((x) => x.id === fileId)
    if (f) {
      handleOpenFile(f)
      if (line != null) {
        requestAnimationFrame(() => {
          editorRef.current?.goToLine(line, column ?? 1)
        })
      }
    }
  }

  const handleCloseTab = (fileId: string) => {
    setClosedTabs((prev) => [fileId, ...prev].slice(0, 20))
    ws.closeTab(fileId)
  }

  const handleReopenTab = () => {
    const id = closedTabs[0]
    if (!id) return
    const f = ws.files.find((x) => x.id === id)
    if (f) {
      handleOpenFile(f)
      setClosedTabs((prev) => prev.slice(1))
    }
  }

  const handleDuplicateFile = (file: ProjectFile) => {
    if (file.kind !== 'file') return
    const base = file.name.replace(/(\.[^.]+)?$/, '')
    const ext = file.name.includes('.') ? '.' + file.name.split('.').pop() : ''
    let name = `${base} copy${ext}`
    let n = 2
    while (ws.files.some((f) => f.path === (file.parentId ? `${ws.files.find((x) => x.id === file.parentId)?.path}/${name}` : name))) {
      name = `${base} copy ${n}${ext}`
      n++
    }
    const parent = file.parentId ? ws.files.find((f) => f.id === file.parentId) : null
    const path = parent ? `${parent.path}/${name}` : name
    const now = new Date().toISOString()
    ws.addFile({
      id: crypto.randomUUID(),
      name,
      path,
      kind: 'file',
      content: file.content ?? '',
      parentId: file.parentId,
      createdAt: now,
      updatedAt: now,
    })
  }

  const handleGoToLine = (line: number, column?: number) => {
    editorRef.current?.goToLine(line, column)
    setOutputLines((prev) => [
      ...prev,
      `[goto] Line ${line}${column ? `:${column}` : ''}`,
    ])
  }

  const handleGoToDiagnostic = (d: Diagnostic) => {
    handleOpenFileById(d.fileId)
    // Defer so editor mounts for the file
    requestAnimationFrame(() => {
      if (d.line != null) {
        editorRef.current?.goToLine(d.line, d.column ?? 1)
      }
    })
  }

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      // Never intercept while typing a filename, search, etc.
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable ||
          target.closest('.modal') ||
          target.closest('.modal-overlay'))
      ) {
        return
      }

      const mod = e.metaKey || e.ctrlKey
      const shift = e.shiftKey

      // Command palette
      if (mod && shift && (e.key === 'P' || e.key === 'p')) {
        e.preventDefault()
        setCmdMode('commands')
        setCmdOpen(true)
        return
      }
      // Go to file
      if (mod && !shift && (e.key === 'P' || e.key === 'p')) {
        e.preventDefault()
        setCmdMode('files')
        setCmdOpen(true)
        return
      }
      // Go to line
      if (mod && (e.key === 'G' || e.key === 'g')) {
        e.preventDefault()
        setGotoOpen(true)
        return
      }
      if (mod && e.key === 'b') {
        e.preventDefault()
        setSidebarCollapsed((c) => !c)
      }
      if (mod && e.key === 'j') {
        e.preventDefault()
        setBottomCollapsed((c) => !c)
      }
      if (mod && shift && (e.key === 'E' || e.key === 'e')) {
        e.preventDefault()
        setActivity('explorer')
        setSidebarCollapsed(false)
      }
      if (e.key === 'F11') {
        e.preventDefault()
        setFullscreenEditor((f) => !f)
      }
      // Find in file — CodeMirror handles Mod-f
      // Save — CodeEditor handles Mod-s
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const commands: CommandItem[] = useMemo(
    () => [
      { id: 'go-to-file', label: 'Go to File…', category: 'Navigation', icon: 'goToFile', shortcut: '⌘P', action: () => { setCmdMode('files'); setCmdOpen(true) } },
      { id: 'go-to-line', label: 'Go to Line…', category: 'Navigation', icon: 'goToLine', shortcut: '⌘G', action: () => setGotoOpen(true) },
      { id: 'find', label: 'Find', category: 'Edit', icon: 'find', shortcut: '⌘F', action: () => { /* CM handles */ } },
      { id: 'find-in-files', label: 'Find in Files', category: 'Edit', icon: 'search', shortcut: '⌘⇧F', action: () => { setActivity('search'); setSidebarCollapsed(false) } },
      { id: 'save', label: 'Save', category: 'File', icon: 'save', shortcut: '⌘S', action: () => ws.saveNow() },
      { id: 'save-all', label: 'Save All', category: 'File', icon: 'save', action: () => ws.saveNow() },
      { id: 'close-tab', label: 'Close Tab', category: 'View', icon: 'close', action: () => { if (ws.activeFileId) handleCloseTab(ws.activeFileId) } },
      { id: 'close-others', label: 'Close Other Tabs', category: 'View', icon: 'close', action: () => {
        if (!ws.activeFileId) return
        ws.openTabs.filter((id) => id !== ws.activeFileId).forEach((id) => handleCloseTab(id))
      }},
      { id: 'close-all', label: 'Close All Tabs', category: 'View', icon: 'close', action: () => {
        ws.openTabs.forEach((id) => handleCloseTab(id))
      }},
      { id: 'reopen-tab', label: 'Reopen Closed Tab', category: 'View', icon: 'undo', action: handleReopenTab },
      { id: 'toggle-sidebar', label: 'Toggle Sidebar', category: 'View', icon: 'panelLeft', shortcut: '⌘B', action: () => setSidebarCollapsed((c) => !c) },
      { id: 'toggle-panel', label: 'Toggle Bottom Panel', category: 'View', icon: 'panelBottom', shortcut: '⌘J', action: () => setBottomCollapsed((c) => !c) },
      { id: 'toggle-preview', label: 'Toggle Preview', category: 'View', icon: 'preview', action: () => setPreviewCollapsed((c) => !c) },
      { id: 'toggle-terminal', label: 'Toggle Terminal', category: 'View', icon: 'terminal', action: () => { setBottomCollapsed(false); setBottomTab('terminal') } },
      { id: 'toggle-fullscreen', label: 'Toggle Fullscreen Editor', category: 'View', icon: 'fullscreen', shortcut: 'F11', action: () => setFullscreenEditor((f) => !f) },
      { id: 'format', label: 'Format Document', category: 'Edit', icon: 'file', shortcut: '⇧⌥F', action: () => { void editorRef.current?.format().then((r) => {
        if (!r.ok) setOutputLines((p) => [...p, `[format] ${r.reason ?? 'Failed'}`])
        else setOutputLines((p) => [...p, '[format] Document formatted'])
      }) } },
      { id: 'split-right', label: 'Split Editor Right', category: 'View', icon: 'splitRight', action: () => {
        setSplitMode('right')
        if (ws.activeFileId) {
          setSecondaryFileId(ws.activeFileId)
          setSecondaryTabs((tabs) =>
            tabs.includes(ws.activeFileId!) ? tabs : [...tabs, ws.activeFileId!]
          )
        }
      }},
      { id: 'move-tab-next', label: 'Move Editor to Next Group', category: 'View', icon: 'splitRight', action: () => {
        if (!ws.activeFileId) return
        setSplitMode('right')
        setSecondaryFileId(ws.activeFileId)
        setSecondaryTabs((tabs) =>
          tabs.includes(ws.activeFileId!) ? tabs : [...tabs, ws.activeFileId!]
        )
        setActiveGroup('secondary')
      }},
      { id: 'move-tab-prev', label: 'Move Editor to Previous Group', category: 'View', icon: 'panelLeft', action: () => {
        if (activeGroup === 'secondary' && secondaryFileId) {
          handleOpenFileById(secondaryFileId)
          setActiveGroup('primary')
        }
      }},
      { id: 'close-split', label: 'Close Editor Group', category: 'View', icon: 'close', action: () => {
        setSplitMode('none')
        setSecondaryFileId(null)
        setSecondaryTabs([])
        setActiveGroup('primary')
      }},
      { id: 'run', label: 'Run Project', category: 'Run', icon: 'run', action: handleRun },
      { id: 'stop', label: 'Stop Project', category: 'Run', icon: 'stop', action: handleStop },
      { id: 'download', label: 'Download Project', category: 'File', icon: 'download', action: () => void handleDownload() },
      { id: 'deploy', label: 'Deploy Project', category: 'Deploy', icon: 'deploy', action: () => setDeployOpen(true) },
      { id: 'deployments', label: 'Show Deployments', category: 'Deploy', icon: 'history', action: () => { setShowDeployments(true); setActivity('extensions'); setSidebarCollapsed(false) } },
      { id: 'new-file', label: 'New File', category: 'File', icon: 'newFile', action: () => startCreate('file', null) },
      { id: 'new-folder', label: 'New Folder', category: 'File', icon: 'newFolder', action: () => startCreate('folder', null) },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ws, handleRun, handleStop, closedTabs]
  )

  const saveLabel =
    ws.saveState === 'saving'
      ? 'Saving…'
      : ws.saveState === 'unsaved'
        ? 'Unsaved'
        : 'Saved'

  const runtimeStatus = services.runtime.getStatus(ws.project.id)

  const sidebarContent = () => {
    if (showDeployments || activity === 'extensions') {
      // Tools + optional deployments
      if (showDeployments) {
        return (
          <DeploymentsPanel
            projectId={ws.project.id}
            projectName={ws.project.name}
            onDeploy={() => setDeployOpen(true)}
            refreshKey={deployRefresh}
          />
        )
      }
      return (
        <div className="side-panel-stub">
          <p className="panel-empty">Tools & Integrations</p>
          <ul className="tools-list">
            <li>
              <button type="button" className="tools-list-btn" onClick={() => setShowDeployments(true)}>
                <Icon name="deploy" size={14} />
                <span>
                  <strong>Deployments</strong>
                  <span className="tools-desc">Deploy, monitor and manage your live projects.</span>
                </span>
              </button>
            </li>
            <li>
              <div className="tools-list-item">
                <Icon name="search" size={14} />
                <span>
                  <strong>X-Ray</strong>
                  <span className="tools-desc">Check My Site — architecture ready</span>
                </span>
              </div>
            </li>
            <li>
              <div className="tools-list-item">
                <Icon name="zap" size={14} />
                <span>
                  <strong>Nyven AI</strong>
                  <span className="tools-desc">Project-aware actions — prepared</span>
                </span>
              </div>
            </li>
            <li>
              <div className="tools-list-item">
                <Icon name="package" size={14} />
                <span>
                  <strong>Brand-in-a-Box</strong>
                  <span className="tools-desc">Import brand kit — boundary ready</span>
                </span>
              </div>
            </li>
          </ul>
        </div>
      )
    }
    if (activity === 'search') {
      return (
        <SearchPanel
          files={ws.files}
          onOpenFile={handleOpenFileById}
          onReplaceInFile={(fileId, content) => ws.updateContent(fileId, content)}
        />
      )
    }
    if (activity === 'source') {
      return (
        <div className="side-panel-stub">
          <p className="panel-empty">Source Control</p>
          <p className="panel-hint">
            Git integration is planned. Local projects remain fully editable.
          </p>
        </div>
      )
    }
    return (
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
        onDuplicate={handleDuplicateFile}
      />
    )
  }

  return (
    <section
      className={`workspace ide-layout ${fullscreenEditor ? 'fullscreen-editor' : ''} ${sidebarCollapsed ? 'sidebar-collapsed' : ''} ${previewCollapsed ? 'preview-collapsed' : ''}`}
      aria-label="Forge workspace"
    >
      <header className="ws-bar">
        <div className="ws-bar-left">
          <button type="button" className="ws-back" onClick={handleBack}>
            <Icon name="back" size={14} />
            Projects
          </button>
          <span className="ws-sep" aria-hidden />
          <h1 className="ws-project-name">{ws.project.name}</h1>
        </div>
        <div className="ws-save-state" data-state={ws.saveState} aria-live="polite">
          {ws.saveState === 'saved' && <Icon name="check" size={12} />}
          {saveLabel}
        </div>
        <div className="ws-bar-right">
          <ProjectActionBar
            runState={runState}
            onRun={handleRun}
            onStop={handleStop}
            onDownload={() => void handleDownload()}
            onDeploy={() => setDeployOpen(true)}
            downloading={downloading}
            compact={typeof window !== 'undefined' && window.innerWidth < 900}
          />
          <IconButton
            icon={fullscreenEditor ? 'exitFullscreen' : 'fullscreen'}
            label={fullscreenEditor ? 'Exit Fullscreen' : 'Fullscreen Editor'}
            shortcut="F11"
            onClick={() => setFullscreenEditor((f) => !f)}
            className="hide-mobile"
          />
        </div>
      </header>

      <div className={`ws-body mobile-pane-${mobilePane}`}>
        <div className="ws-sidebar-rail">
          <ActivityBar
            active={activity}
            onChange={(v) => {
              setActivity(v)
              setShowDeployments(false)
              setSidebarCollapsed(false)
            }}
          />
          {!sidebarCollapsed && (
            <div className="ws-pane ws-pane-files">
              <div className="side-panel-title">
                {activity === 'explorer' && !showDeployments && 'Explorer'}
                {activity === 'search' && 'Search'}
                {activity === 'source' && 'Source Control'}
                {(activity === 'extensions' || showDeployments) &&
                  (showDeployments ? 'Deployments' : 'Tools')}
                <button
                  type="button"
                  className="panel-icon-btn"
                  onClick={() => setSidebarCollapsed(true)}
                  aria-label="Collapse sidebar"
                  title="Collapse (⌘B)"
                >
                  <Icon name="chevronLeft" size={14} />
                </button>
              </div>
              {sidebarContent()}
            </div>
          )}
          {sidebarCollapsed && (
            <button
              type="button"
              className="sidebar-expand-btn"
              onClick={() => setSidebarCollapsed(false)}
              aria-label="Expand sidebar"
            >
              <Icon name="chevronRight" size={14} />
            </button>
          )}
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
                  onContextMenu={(e) => {
                    e.preventDefault()
                    setTabMenu({ open: true, x: e.clientX, y: e.clientY, fileId: id })
                  }}
                >
                  <FileTypeIcon name={f.name} size={13} />
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
                      handleCloseTab(id)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.stopPropagation()
                        handleCloseTab(id)
                      }
                    }}
                  >
                    <Icon name="close" size={12} />
                  </span>
                </button>
              )
            })}
          </div>
          {ws.activeFile && <Breadcrumbs path={ws.activeFile.path} />}
          <div className="editor-stage">
            {ws.activeFile && isTextFile(ws.activeFile.name) ? (
              <div className={`editor-groups ${splitMode === 'right' ? 'split-right' : ''}`}>
                <div className={`editor-group primary ${activeGroup === 'primary' ? 'focused' : ''}`} onMouseDown={() => setActiveGroup('primary')}>
                  <CodeEditor
                    ref={editorRef}
                    fileId={ws.activeFile.id}
                    filename={ws.activeFile.name}
                    value={ws.activeFile.content ?? ''}
                    onChange={(v) => ws.updateContent(ws.activeFile!.id, v)}
                    onSave={ws.saveNow}
                    onFormatResult={(msg) =>
                      setOutputLines((p) => [...p, `[format] ${msg}`])
                    }
                  />
                </div>
                {splitMode === 'right' && (() => {
                  const secId = secondaryFileId
                  const sec = secId ? ws.files.find((f) => f.id === secId) : null
                  const tabs = secondaryTabs.length
                    ? secondaryTabs
                    : secId
                      ? [secId]
                      : []
                  return (
                    <div
                      className={`editor-group secondary ${activeGroup === 'secondary' ? 'focused' : ''}`}
                      onMouseDown={() => setActiveGroup('secondary')}
                    >
                      <div className="editor-group-bar">
                        <div className="editor-group-tabs">
                          {tabs.map((tid) => {
                            const tf = ws.files.find((x) => x.id === tid)
                            if (!tf) return null
                            const dirty = ws.dirtyIds.has(tid)
                            return (
                              <button
                                key={tid}
                                type="button"
                                className={`editor-group-tab ${tid === secId ? 'active' : ''}`}
                                onClick={() => setSecondaryFileId(tid)}
                              >
                                {tf.name}{dirty ? ' •' : ''}
                              </button>
                            )
                          })}
                        </div>
                        <button
                          type="button"
                          className="panel-icon-btn"
                          aria-label="Close split"
                          title="Close Editor Group"
                          onClick={() => {
                            setSplitMode('none')
                            setSecondaryFileId(null)
                            setSecondaryTabs([])
                            setActiveGroup('primary')
                          }}
                        >
                          <Icon name="close" size={12} />
                        </button>
                      </div>
                      {sec && isTextFile(sec.name) ? (
                        <CodeEditor
                          fileId={sec.id}
                          filename={sec.name}
                          value={sec.content ?? ''}
                          onChange={(v) => ws.updateContent(sec.id, v)}
                          onSave={ws.saveNow}
                        />
                      ) : (
                        <div className="editor-empty">
                          <p>Open a file or use “Move Editor to Next Group”</p>
                        </div>
                      )}
                    </div>
                  )
                })()}
              </div>
            ) : ws.activeFile ? (
              <div className="editor-empty">
                <p>This file type cannot be edited as text.</p>
              </div>
            ) : (
              <div className="editor-empty empty-workspace">
                {ws.files.filter((f) => f.kind === 'file').length === 0 ? (
                  <>
                    <p className="empty-title">Your workspace is empty</p>
                    <p className="panel-hint">
                      Create a file or folder to get started. Build any structure you want —
                      nothing is assumed.
                    </p>
                    <div className="empty-actions">
                      <Button variant="primary" size="sm" onClick={() => startCreate('file', null)}>
                        New File
                      </Button>
                      <Button variant="secondary" size="sm" onClick={() => startCreate('folder', null)}>
                        New Folder
                      </Button>
                    </div>
                    <p className="panel-hint" style={{ marginTop: 16 }}>
                      Shortcuts: ⌘⇧P Command Palette · ⌘B Sidebar
                    </p>
                  </>
                ) : (
                  <>
                    <p>Select a file to edit, or create one</p>
                    <p className="panel-hint">
                      ⌘⇧P Command Palette · ⌘P Go to File · ⌘G Go to Line · ⌘B Sidebar · ⌘J Panel
                    </p>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {!previewCollapsed && (
          <div className="ws-pane ws-pane-preview">
            <div className="preview-toolbar">
              <span className="preview-label">
                <Icon name="preview" size={12} />
                Preview
                {runState === 'running' && (
                  <span className="preview-running-badge">Running</span>
                )}
                {runState === 'starting' && (
                  <span className="preview-running-badge starting">Starting</span>
                )}
                {runState === 'error' && (
                  <span className="preview-running-badge error">Error</span>
                )}
              </span>
              <div className="preview-toolbar-actions">
                <IconButton
                  icon="refresh"
                  label="Refresh Preview"
                  size={14}
                  onClick={handleRun}
                />
                <IconButton
                  icon="chevronRight"
                  label="Collapse Preview"
                  size={14}
                  onClick={() => setPreviewCollapsed(true)}
                />
              </div>
            </div>
            <PreviewPanel
              files={ws.files}
              nonce={ws.previewNonce}
              error={ws.previewError}
              onRefresh={handleRun}
              onClearError={() => ws.setPreviewError(null)}
              onPreviewMessage={(m) => {
                const line = `[${m.level || m.type}] ${m.message}`
                setDebugLines((prev) => [...prev.slice(-200), line])
                if (m.type === 'error') {
                  setOutputLines((prev) => [...prev, line])
                }
              }}
            />
          </div>
        )}
        {previewCollapsed && (
          <button
            type="button"
            className="preview-expand-btn"
            onClick={() => setPreviewCollapsed(false)}
            aria-label="Expand preview"
          >
            <Icon name="preview" size={14} />
          </button>
        )}
      </div>

      <BottomPanel
        active={bottomTab}
        onChange={setBottomTab}
        diagnostics={diagnostics}
        outputLines={outputLines}
        debugLines={debugLines}
        collapsed={bottomCollapsed}
        onToggleCollapse={() => setBottomCollapsed((c) => !c)}
        onGoToDiagnostic={handleGoToDiagnostic}
      />

      <StatusBar
        saveState={ws.saveState}
        language={activeLang}
        runtime={runtimeStatus}
        fileCount={ws.files.filter((f) => f.kind === 'file').length}
        projectName={ws.project.name}
      />

      <nav className="ws-mobile-nav" aria-label="Workspace sections">
        <button
          type="button"
          className={mobilePane === 'files' ? 'active' : ''}
          onClick={() => setMobilePane('files')}
        >
          <Icon name="explorer" size={16} />
          Files
        </button>
        <button
          type="button"
          className={mobilePane === 'code' ? 'active' : ''}
          onClick={() => setMobilePane('code')}
        >
          <Icon name="file" size={16} />
          Code
        </button>
        <button
          type="button"
          className={mobilePane === 'preview' ? 'active' : ''}
          onClick={() => setMobilePane('preview')}
        >
          <Icon name="preview" size={16} />
          Preview
        </button>
        <button
          type="button"
          className="mobile-download"
          onClick={() => void handleDownload()}
          disabled={downloading}
        >
          <Icon name="download" size={16} />
          {downloading ? '…' : 'ZIP'}
        </button>
      </nav>

      {/* Command Palette */}
      <CommandPalette
        open={cmdOpen}
        onClose={() => setCmdOpen(false)}
        commands={commands}
        mode={cmdMode}
        files={textFiles}
        onOpenFile={handleOpenFileById}
      />

      <GoToLine
        open={gotoOpen}
        onClose={() => setGotoOpen(false)}
        onGo={handleGoToLine}
      />

      <DeployModal
        open={deployOpen}
        onClose={() => setDeployOpen(false)}
        project={ws.project}
        onDeployed={() => {
          setDeployRefresh((n) => n + 1)
          setShowDeployments(true)
          setActivity('extensions')
          setSidebarCollapsed(false)
        }}
      />

      {/* Tab context menu */}
      {tabMenu.open && (
        <div
          className="context-menu"
          style={{ left: tabMenu.x, top: tabMenu.y }}
          role="menu"
        >
          <button
            type="button"
            className="context-menu-item"
            onClick={() => {
              if (tabMenu.fileId) handleCloseTab(tabMenu.fileId)
              setTabMenu((s) => ({ ...s, open: false }))
            }}
          >
            <Icon name="close" size={14} />
            <span>Close</span>
          </button>
          <button
            type="button"
            className="context-menu-item"
            onClick={() => {
              if (!tabMenu.fileId) return
              ws.openTabs
                .filter((id) => id !== tabMenu.fileId)
                .forEach((id) => handleCloseTab(id))
              setTabMenu((s) => ({ ...s, open: false }))
            }}
          >
            <Icon name="close" size={14} />
            <span>Close Others</span>
          </button>
          <button
            type="button"
            className="context-menu-item"
            onClick={() => {
              ws.openTabs.forEach((id) => handleCloseTab(id))
              setTabMenu((s) => ({ ...s, open: false }))
            }}
          >
            <Icon name="close" size={14} />
            <span>Close All</span>
          </button>
          <div className="context-menu-sep" />
          <button
            type="button"
            className="context-menu-item"
            onClick={() => {
              handleReopenTab()
              setTabMenu((s) => ({ ...s, open: false }))
            }}
            disabled={closedTabs.length === 0}
          >
            <Icon name="undo" size={14} />
            <span>Reopen Closed Tab</span>
          </button>
          <div className="context-menu-sep" />
          <button
            type="button"
            className="context-menu-item"
            onClick={() => {
              const id = tabMenu.fileId
              if (!id) return
              setSplitMode('right')
              setSecondaryFileId(id)
              setSecondaryTabs((tabs) => (tabs.includes(id) ? tabs : [...tabs, id]))
              setActiveGroup('secondary')
              setTabMenu((s) => ({ ...s, open: false }))
            }}
          >
            <Icon name="splitRight" size={14} />
            <span>Move to Split Group</span>
          </button>
        </div>
      )}
      {tabMenu.open && (
        <div
          className="context-menu-backdrop"
          onMouseDown={() => setTabMenu((s) => ({ ...s, open: false }))}
        />
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
          name="new-node-name"
          value={createName}
          onChange={(e) => {
            setCreateName(e.target.value)
            if (createError) setCreateError(null)
          }}
          placeholder={createKind === 'folder' ? 'assets' : 'about.html'}
          autoFocus
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          error={!!createError}
          onKeyDown={(e) => {
            e.stopPropagation()
            if (e.key === 'Enter') {
              e.preventDefault()
              confirmCreate()
            }
          }}
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
onKeyDown={(e) => {
            e.stopPropagation()
            if (e.key === 'Enter') {
              e.preventDefault()
              confirmRename()
            }
          }}
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
          There are unsaved changes. Leave anyway?
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
