/**
 * VEXDYN FORGE — Service registry
 * Local implementations now; backend-backed implementations later.
 */

import type {
  ProjectService,
  RuntimeService,
  TerminalService,
  BuildService,
  DeploymentService,
  AiService,
  DiagnosticsService,
  FileSystemService,
} from './types'
import { localProjectService } from './localProjectService'
import { localRuntimeService } from './localRuntimeService'
import { stubTerminalService } from './stubTerminalService'
import { stubBuildService } from './stubBuildService'
import { stubDeploymentService } from './stubDeploymentService'
import { stubAiService } from './stubAiService'
import { localDiagnosticsService } from './localDiagnosticsService'
import { localFileSystemService } from './localFileSystemService'

export const services = {
  projects: localProjectService as ProjectService,
  files: localFileSystemService as FileSystemService,
  runtime: localRuntimeService as RuntimeService,
  terminal: stubTerminalService as TerminalService,
  build: stubBuildService as BuildService,
  deployment: stubDeploymentService as DeploymentService,
  ai: stubAiService as AiService,
  diagnostics: localDiagnosticsService as DiagnosticsService,
}

export type Services = typeof services
