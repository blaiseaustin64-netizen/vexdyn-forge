/**
 * Session token storage for Forge.
 *
 * Matches the main website convention (key: vexdyn_session) so the same
 * browser patterns apply. Tokens are opaque and verified only by the backend.
 * Cross-origin cookies cannot be shared across product domains; the backend
 * therefore expects Authorization: Bearer / X-Session-Token headers.
 *
 * Note: localStorage is origin-scoped. Signing into vexdyn.tech does NOT
 * automatically authenticate forge.vexdyn.tech. Use the handoff endpoints
 * for secure SSO between products.
 */

import type { PublicUser } from './authApi'

const TOKEN_KEY = 'vexdyn_session'
const USER_KEY = 'vexdyn_user'
const EXPIRES_KEY = 'vexdyn_session_expires'

export function getSessionToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY) || null
  } catch {
    return null
  }
}

export function getCachedUser(): PublicUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY)
    if (!raw) return null
    return JSON.parse(raw) as PublicUser
  } catch {
    return null
  }
}

export function getSessionExpiresAt(): string | null {
  try {
    return localStorage.getItem(EXPIRES_KEY)
  } catch {
    return null
  }
}

/**
 * Persist session after successful login / verify / handoff exchange.
 * @param persist - true → localStorage (default); false → sessionStorage only
 */
export function setSession(
  token: string,
  user: PublicUser | null,
  expiresAt?: string | null,
  persist: boolean = true
): void {
  try {
    localStorage.removeItem(TOKEN_KEY)
    sessionStorage.removeItem(TOKEN_KEY)
    if (token) {
      ;(persist ? localStorage : sessionStorage).setItem(TOKEN_KEY, token)
    }
    if (user) {
      localStorage.setItem(USER_KEY, JSON.stringify(user))
    } else {
      localStorage.removeItem(USER_KEY)
    }
    if (expiresAt) {
      localStorage.setItem(EXPIRES_KEY, expiresAt)
    } else {
      localStorage.removeItem(EXPIRES_KEY)
    }
  } catch {
    /* quota / private mode */
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(TOKEN_KEY)
    sessionStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    localStorage.removeItem(EXPIRES_KEY)
  } catch {
    /* ignore */
  }
}

export function isSessionExpired(): boolean {
  const expires = getSessionExpiresAt()
  if (!expires) return false
  try {
    return new Date(expires).getTime() <= Date.now()
  } catch {
    return false
  }
}
