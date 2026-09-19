import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Project, ProjectFile } from '../types/project'
import { isTextFile } from '../types/project'
import { projectStore } from '../lib/projectStore'

export type SaveState = 'saved' | 'unsaved' | 'saving'

export function useWorkspace(initial: Project) {
  const [project, setProject] = useState<Project>(() => {
    return projectStore.get(initial.id) ?? initial
  })
  const [activeFileId, setActiveFileId] = useState<string | null>(() => {
    const files = (projectStore.get(initial.id) ?? initial).files
    const html = files.find((f) => f.kind === 'file' && f.name === 'index.html')
    const first = files.find((f) => f.kind === 'file')
    return html?.id ?? first?.id ?? null
  })
  const [openTabs, setOpenTabs] = useState<string[]>(() => {
    const id = (() => {
      const files = (projectStore.get(initial.id) ?? initial).files
      const html = files.find((f) => f.kind === 'file' && f.name === 'index.html')
      const first = files.find((f) => f.kind === 'file')
      return html?.id ?? first?.id ?? null
    })()
    return id ? [id] : []
  })
  const [dirtyIds, setDirtyIds] = useState<Set<string>>(new Set())
  const [saveState, setSaveState] = useState<SaveState>('saved')
  const [previewNonce, setPreviewNonce] = useState(0)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const timer = useRef<number | null>(null)

  const files = project.files
  const activeFile = useMemo(
    () => files.find((f) => f.id === activeFileId) ?? null,
    [files, activeFileId]
  )

  const persist = useCallback(
    (next: Project) => {
      const saved = projectStore.saveProject(next)
      setProject(saved)
      setSaveState('saved')
      setDirtyIds(new Set())
      return saved
    },
    []
  )

  const scheduleSave = useCallback(
    (next: Project) => {
      setProject(next)
      setSaveState('unsaved')
      if (timer.current) window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => {
        setSaveState('saving')
        projectStore.saveProject(next)
        setSaveState('saved')
        setDirtyIds(new Set())
      }, 500)
    },
    []
  )

  useEffect(() => {
    return () => {
      if (timer.current) window.clearTimeout(timer.current)
    }
  }, [])

  const saveNow = useCallback(() => {
    if (timer.current) window.clearTimeout(timer.current)
    setSaveState('saving')
    persist(project)
  }, [persist, project])

  const updateContent = useCallback(
    (fileId: string, content: string) => {
      const next: Project = {
        ...project,
        files: project.files.map((f) =>
          f.id === fileId
            ? { ...f, content, updatedAt: new Date().toISOString() }
            : f
        ),
        status: 'unsaved',
        updatedAt: new Date().toISOString(),
      }
      setDirtyIds((prev) => new Set(prev).add(fileId))
      scheduleSave(next)
    },
    [project, scheduleSave]
  )

  const openFile = useCallback((file: ProjectFile) => {
    if (file.kind !== 'file') return
    if (!isTextFile(file.name)) return
    setActiveFileId(file.id)
    setOpenTabs((tabs) => (tabs.includes(file.id) ? tabs : [...tabs, file.id]))
  }, [])

  const closeTab = useCallback(
    (fileId: string) => {
      setOpenTabs((tabs) => {
        const next = tabs.filter((id) => id !== fileId)
        if (activeFileId === fileId) {
          setActiveFileId(next[next.length - 1] ?? null)
        }
        return next
      })
    },
    [activeFileId]
  )

  const addFile = useCallback(
    (file: ProjectFile) => {
      const next: Project = {
        ...project,
        files: [...project.files, file],
        updatedAt: new Date().toISOString(),
      }
      persist(next)
      if (file.kind === 'file' && isTextFile(file.name)) {
        setActiveFileId(file.id)
        setOpenTabs((tabs) => [...tabs, file.id])
      }
    },
    [project, persist]
  )

  const renameNode = useCallback(
    (fileId: string, name: string) => {
      const saved = projectStore.renameFile(project.id, fileId, name)
      if (saved) setProject(saved)
    },
    [project.id]
  )

  const deleteNode = useCallback(
    (fileId: string) => {
      const saved = projectStore.deleteFile(project.id, fileId)
      if (!saved) return
      setProject(saved)
      setOpenTabs((tabs) => tabs.filter((id) => id !== fileId))
      if (activeFileId === fileId) {
        const first = saved.files.find((f) => f.kind === 'file')
        setActiveFileId(first?.id ?? null)
      }
    },
    [project.id, activeFileId]
  )

  const toggleFolder = useCallback((id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const runPreview = useCallback(() => {
    if (timer.current) {
      window.clearTimeout(timer.current)
      persist(project)
    }
    setPreviewError(null)
    setPreviewNonce((n) => n + 1)
  }, [persist, project])

  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.data?.source === 'vexdyn-forge-preview' && e.data.type === 'error') {
        setPreviewError(String(e.data.message || 'Preview error'))
      }
    }
    window.addEventListener('message', onMsg)
    return () => window.removeEventListener('message', onMsg)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        saveNow()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [saveNow])

  const isDirty = dirtyIds.size > 0 || saveState === 'unsaved' || saveState === 'saving'

  return {
    project,
    files,
    activeFile,
    activeFileId,
    openTabs,
    dirtyIds,
    saveState,
    isDirty,
    previewNonce,
    previewError,
    setPreviewError,
    collapsed,
    openFile,
    closeTab,
    updateContent,
    addFile,
    renameNode,
    deleteNode,
    toggleFolder,
    runPreview,
    saveNow,
  }
}
