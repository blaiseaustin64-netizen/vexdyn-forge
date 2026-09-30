/**
 * AI / Nyven service stub.
 * Architecture for project-aware AI actions.
 * Does not pretend Nyven is fully integrated.
 */

import type { AiService, AiAction, AiContext } from './types'

export const stubAiService: AiService = {
  isAvailable() {
    return false
  },

  async request(_action: AiAction, _context: AiContext, _prompt?: string) {
    throw new Error(
      'Nyven AI integration is prepared. Project-aware actions (explain, fix, generate, refactor) will operate on the real filesystem once connected.'
    )
  },
}
