/**
 * Local project service — wraps existing projectStore.
 * Preserves all current behavior; provides clean interface for future cloud backend.
 */

import type { Project, CreateProjectInput, StarterTemplate } from '../types/project'
import { projectStore } from '../lib/projectStore'
import type { ProjectService } from './types'
import { starterToProjectType } from '../types/project'

export const localProjectService: ProjectService = {
  async list() {
    return projectStore.list()
  },

  async get(id: string) {
    return projectStore.get(id) ?? null
  },

  async create(name: string, starter: string) {
    const input: CreateProjectInput = {
      name,
      starter: starter as StarterTemplate,
    }
    const project = projectStore.create(input)
    // Ensure type is set from starter
    if (project.type === 'html-css-js') {
      const typed = {
        ...project,
        type: starterToProjectType(input.starter),
      }
      return projectStore.saveProject(typed)
    }
    return project
  },

  async rename(id: string, name: string) {
    return projectStore.rename(id, name)
  },

  async duplicate(id: string) {
    return projectStore.duplicate(id)
  },

  async remove(id: string) {
    projectStore.remove(id)
  },

  async save(project: Project) {
    return projectStore.saveProject(project)
  },

  // Cloud path prepared but not implemented
  async uploadToCloud(_id: string) {
    throw new Error(
      'Cloud upload requires VEXDYN Core backend. Local projects remain fully usable.'
    )
  },
}
