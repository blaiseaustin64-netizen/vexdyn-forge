import { useState, useCallback, useEffect } from 'react'
import { Nav } from './components/Nav'
import { EntryExperience } from './pages/EntryExperience'
import { Dashboard } from './pages/Dashboard'
import { Workspace } from './pages/Workspace'
import { Profile } from './pages/Profile'
import { Settings } from './pages/Settings'
import { CreateProjectModal } from './components/CreateProjectModal'
import { ImportProjectModal } from './components/ImportProjectModal'
import { RenameProjectModal } from './components/RenameProjectModal'
import { DeleteProjectModal } from './components/DeleteProjectModal'
import { useProjects } from './hooks/useProjects'
import { projectStore } from './lib/projectStore'
import type { ProjectDetection } from './lib/importProject'
import { loadSettings } from './lib/settingsStore'
import type { Project } from './types/project'
import type { StarterTemplate } from './types/project'

export type View =
  | 'entry'
  | 'dashboard'
  | 'workspace'
  | 'profile'
  | 'settings'

/**
 * VEXDYN FORGE V1 — Finalization
 */
export default function App() {
  const {
    filtered,
    query,
    setQuery,
    sort,
    setSort,
    create,
    rename,
    duplicate,
    remove,
    refresh,
    hasProjects,
  } = useProjects()

  const [view, setView] = useState<View>(() =>
    hasProjects ? 'dashboard' : 'entry'
  )
  const [activeProject, setActiveProject] = useState<Project | null>(null)
  const [opening, setOpening] = useState(false)

  const [createOpen, setCreateOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [isImporting, setIsImporting] = useState(false)

  const [renameTarget, setRenameTarget] = useState<Project | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null)

  useEffect(() => {
    const s = loadSettings()
    document.documentElement.dataset.reduceMotion = s.reduceMotion
      ? 'true'
      : 'false'
  }, [])

  const openCreate = useCallback(() => setCreateOpen(true), [])
  const openImport = useCallback(() => setImportOpen(true), [])

  const handleImport = useCallback(
    (
      name: string,
      files: import('./types/project').ProjectFile[],
      detection: ProjectDetection
    ) => {
      setIsImporting(true)
      window.setTimeout(() => {
        try {
          const project = projectStore.createFromImport(
            name,
            files,
            detection.projectType
          )
          refresh()
          setImportOpen(false)
          setIsImporting(false)
          setActiveProject(project)
          setView('workspace')
        } catch (e) {
          setIsImporting(false)
          console.error(e)
          window.alert(e instanceof Error ? e.message : 'Import failed')
        }
      }, 120)
    },
    [refresh]
  )

  const handleCreate = useCallback(
    (name: string, starter: StarterTemplate) => {
      setIsCreating(true)
      window.setTimeout(() => {
        const project = create({ name, starter })
        setIsCreating(false)
        setCreateOpen(false)
        setActiveProject(project)
        setView('workspace')
      }, 280)
    },
    [create]
  )

  const handleOpen = useCallback((project: Project) => {
    setOpening(true)
    const fresh = projectStore.get(project.id) ?? project
    window.setTimeout(() => {
      setActiveProject(fresh)
      setView('workspace')
      setOpening(false)
    }, 160)
  }, [])

  const handleBackToDashboard = useCallback(() => {
    refresh()
    setActiveProject(null)
    setView('dashboard')
  }, [refresh])

  const handleRename = useCallback(
    (id: string, name: string) => {
      const updated = rename(id, name)
      if (activeProject?.id === id) setActiveProject(updated)
      setRenameTarget(null)
    },
    [rename, activeProject]
  )

  const handleDuplicate = useCallback(
    (project: Project) => {
      duplicate(project.id)
    },
    [duplicate]
  )

  const handleDelete = useCallback(
    (id: string) => {
      remove(id)
      setDeleteTarget(null)
      if (activeProject?.id === id) {
        setActiveProject(null)
        setView('dashboard')
      }
    },
    [remove, activeProject]
  )

  const handleNav = useCallback(
    (v: View) => {
      if (v === 'dashboard' || v === 'entry') {
        refresh()
        setActiveProject(null)
        setView(hasProjects ? 'dashboard' : 'entry')
        return
      }
      if (v === 'profile' || v === 'settings') {
        setActiveProject(null)
        setView(v)
        return
      }
      setView(v)
    },
    [hasProjects, refresh]
  )

  const showEntry = view === 'entry' && !hasProjects
  const inWorkspace = view === 'workspace' && activeProject

  return (
    <>
      {!inWorkspace && (
        <Nav
          currentView={view}
          onNavigate={handleNav}
          onCreate={openCreate}
        />
      )}

      <main className={inWorkspace ? 'page page-workspace' : 'page'}>
        {opening ? (
          <div className="state-container">
            <span className="spinner" aria-hidden />
            <p className="loading-text">Opening project…</p>
          </div>
        ) : showEntry ? (
          <EntryExperience
            onCreate={openCreate}
            onImport={openImport}
          />
        ) : inWorkspace ? (
          <Workspace
            project={activeProject}
            onBack={handleBackToDashboard}
          />
        ) : view === 'profile' ? (
          <Profile onBack={() => setView(hasProjects ? 'dashboard' : 'entry')} />
        ) : view === 'settings' ? (
          <Settings onBack={() => setView(hasProjects ? 'dashboard' : 'entry')} />
        ) : (
          <Dashboard
            filtered={filtered}
            query={query}
            onQueryChange={setQuery}
            sort={sort}
            onSortChange={setSort}
            onCreate={openCreate}
            onImport={openImport}
            onOpen={handleOpen}
            onRename={setRenameTarget}
            onDuplicate={handleDuplicate}
            onDelete={setDeleteTarget}
            hasProjects={hasProjects}
          />
        )}
      </main>

      <CreateProjectModal
        open={createOpen}
        onClose={() => !isCreating && setCreateOpen(false)}
        onCreate={handleCreate}
        isCreating={isCreating}
      />
      <ImportProjectModal
        open={importOpen}
        onClose={() => !isImporting && setImportOpen(false)}
        onImport={handleImport}
        isImporting={isImporting}
      />

      <RenameProjectModal
        open={!!renameTarget}
        project={renameTarget}
        onClose={() => setRenameTarget(null)}
        onSave={handleRename}
      />

      <DeleteProjectModal
        open={!!deleteTarget}
        project={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </>
  )
}
