/**
 * Service registry — swap implementations without rewriting UI
 */

import type {
  ProjectService,
  FileSystemService,
  RuntimeService,
  TerminalService,
  BuildService,
  DeploymentService,
  AiService,
  DiagnosticsService,
} from './types'
import { localProjectService } from './localProjectService'
import { localFileSystemService } from './localFileSystemService'
import { localRuntimeService } from './localRuntimeService'
import { stubTerminalService } from './stubTerminalService'
import { stubBuildService } from './stubBuildService'
import { cloudflareDeploymentService } from './cloudflareDeploymentService'
import { stubAiService } from './stubAiService'
import { localDiagnosticsService } from './localDiagnosticsService'

export const services = {
  projects: localProjectService as ProjectService,
  files: localFileSystemService as FileSystemService,
  runtime: localRuntimeService as RuntimeService,
  terminal: stubTerminalService as TerminalService,
  build: stubBuildService as BuildService,
  deployment: cloudflareDeploymentService as DeploymentService,
  ai: stubAiService as AiService,
  diagnostics: localDiagnosticsService as DiagnosticsService,
}

export type Services = typeof services
