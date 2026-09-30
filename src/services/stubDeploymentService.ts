/**
 * Deployment service stub.
 * Target: Cloudflare Pages API → later Workers for Platforms.
 * Do not implement fake deployment.
 */

import type { DeploymentService, DeploymentRecord } from './types'

export const stubDeploymentService: DeploymentService = {
  isConfigured() {
    return false
  },

  async deploy(_projectId) {
    throw new Error(
      'Deployment requires Cloudflare Pages API configuration and Forge backend. UI and contracts are prepared.'
    )
  },

  async list(_projectId) {
    return [] as DeploymentRecord[]
  },

  async getStatus(_deploymentId) {
    return null
  },
}
