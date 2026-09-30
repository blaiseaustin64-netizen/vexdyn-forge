/**
 * Build service stub.
 * Architecture ready; real builds need isolated execution environment.
 */

import type { Project } from '../types/project'
import type { BuildService, BuildResult } from './types'

const statusMap = new Map<string, 'idle' | 'building' | 'success' | 'failed'>()

export const stubBuildService: BuildService = {
  async build(project: Project): Promise<BuildResult> {
    statusMap.set(project.id, 'building')
    // Honest: no fake success
    statusMap.set(project.id, 'failed')
    return {
      success: false,
      logs: [
        '[forge] Build system architecture is ready.',
        '[forge] Real builds require a secure isolated execution environment.',
        '[forge] Static projects can use Preview + ZIP download today.',
      ],
      error: 'Backend build runtime not connected',
    }
  },

  getStatus(projectId) {
    return statusMap.get(projectId) ?? 'idle'
  },
}
