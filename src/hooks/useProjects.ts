import { useState, useCallback, useEffect, useMemo } from 'react'
import type { Project, CreateProjectInput } from '../types/project'
import { projectStore } from '../lib/projectStore'

export type SortMode = 'recent' | 'name'

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>(() => projectStore.list())
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortMode>('recent')

  const refresh = useCallback(() => {
    setProjects(projectStore.list())
  }, [])

  // Keep in sync if another tab mutates storage
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'vexdyn-forge-projects-v1') refresh()
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [refresh])

  const create = useCallback((input: CreateProjectInput) => {
    const project = projectStore.create(input)
    refresh()
    return project
  }, [refresh])

  const rename = useCallback((id: string, name: string) => {
    const project = projectStore.rename(id, name)
    refresh()
    return project
  }, [refresh])

  const duplicate = useCallback((id: string) => {
    const project = projectStore.duplicate(id)
    refresh()
    return project
  }, [refresh])

  const remove = useCallback((id: string) => {
    projectStore.remove(id)
    refresh()
  }, [refresh])

  const filtered = useMemo(() => {
    let list = [...projects]
    const q = query.trim().toLowerCase()
    if (q) {
      list = list.filter((p) => p.name.toLowerCase().includes(q))
    }
    if (sort === 'name') {
      list.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
    } else {
      list.sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      )
    }
    return list
  }, [projects, query, sort])

  return {
    projects,
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
    hasProjects: projects.length > 0,
  }
}
