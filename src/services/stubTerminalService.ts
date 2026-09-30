/**
 * Terminal service stub.
 * Frontend interface is real; execution requires secure backend sandbox.
 * Do not fake command output.
 */

import type { TerminalService, TerminalSession } from './types'

const sessions = new Map<string, TerminalSession>()

export const stubTerminalService: TerminalService = {
  isAvailable() {
    return false
  },

  async createSession(projectId) {
    const session: TerminalSession = {
      id: crypto.randomUUID(),
      projectId,
      cwd: '/',
      status: 'ready',
    }
    sessions.set(session.id, session)
    return session
  },

  async write(_sessionId, _data) {
    // No-op: real execution requires backend
    throw new Error(
      'Terminal execution requires a secure backend sandbox. The UI is ready for connection.'
    )
  },

  async resize(_sessionId, _cols, _rows) {
    // No-op until backend
  },

  async destroy(sessionId) {
    sessions.delete(sessionId)
  },
}
