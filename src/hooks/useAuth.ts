import { useCallback, useEffect, useState } from 'react'
import * as authApi from '../lib/authApi'
import type { PublicUser, Membership } from '../lib/authApi'
import {
  getSessionToken,
  getCachedUser,
  setSession,
  clearSession,
  isSessionExpired,
} from '../lib/authSession'

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'

export type AuthState = {
  status: AuthStatus
  user: PublicUser | null
  memberships: Membership[]
  error: string | null
}

export type UseAuthReturn = AuthState & {
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>
  register: (
    email: string,
    password: string,
    displayName?: string
  ) => Promise<{ ok: boolean; error?: string; message?: string; expiresInSeconds?: number }>
  verifyEmail: (
    email: string,
    code: string
  ) => Promise<{ ok: boolean; error?: string }>
  resendVerification: (
    email: string
  ) => Promise<{ ok: boolean; error?: string; message?: string }>
  logout: () => Promise<void>
  refresh: () => Promise<void>
  exchangeHandoff: (code: string) => Promise<{ ok: boolean; error?: string }>
  clearError: () => void
}

export function useAuth(): UseAuthReturn {
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [user, setUser] = useState<PublicUser | null>(() => getCachedUser())
  const [memberships, setMemberships] = useState<Membership[]>([])
  const [error, setError] = useState<string | null>(null)

  const applyAuthenticated = useCallback(
    (u: PublicUser, token: string, expiresAt?: string, mems?: Membership[]) => {
      setSession(token, u, expiresAt ?? null, true)
      setUser(u)
      setMemberships(mems ?? [])
      setStatus('authenticated')
      setError(null)
    },
    []
  )

  const applyUnauthenticated = useCallback(() => {
    clearSession()
    setUser(null)
    setMemberships([])
    setStatus('unauthenticated')
  }, [])

  const refresh = useCallback(async () => {
    const token = getSessionToken()
    if (!token || isSessionExpired()) {
      applyUnauthenticated()
      return
    }

    const result = await authApi.me(token)
    if (!result.ok) {
      if (result.status === 401 || result.data.code === 'unauthenticated') {
        applyUnauthenticated()
        return
      }
      // Network / server error: keep cached user if any, stay optimistic
      const cached = getCachedUser()
      if (cached) {
        setUser(cached)
        setStatus('authenticated')
      } else {
        setStatus('unauthenticated')
      }
      return
    }

    setUser(result.data.user)
    setMemberships(result.data.memberships ?? [])
    const expires =
      result.data.session?.expiresAt ??
      (typeof localStorage !== 'undefined'
        ? localStorage.getItem('vexdyn_session_expires')
        : null)
    setSession(token, result.data.user, expires, true)
    setStatus('authenticated')
    setError(null)
  }, [applyUnauthenticated])

  useEffect(() => {
    let cancelled = false

    async function bootstrap() {
      // Handoff from another product: ?handoff=<code> or ?code=<code>
      try {
        const params = new URLSearchParams(window.location.search)
        const handoff =
          params.get('handoff') || params.get('code') || params.get('handoffCode')
        if (handoff) {
          const result = await authApi.exchangeHandoff(handoff, 'forge')
          if (!cancelled && result.ok) {
            applyAuthenticated(
              result.data.user,
              result.data.sessionToken,
              result.data.expiresAt,
              result.data.memberships
            )
            // Clean URL without reload
            const url = new URL(window.location.href)
            url.searchParams.delete('handoff')
            url.searchParams.delete('code')
            url.searchParams.delete('handoffCode')
            window.history.replaceState({}, '', url.pathname + url.search + url.hash)
            return
          }
          if (!cancelled && !result.ok) {
            setError(result.data.error || 'Invalid or expired handoff code.')
          }
        }
      } catch {
        /* ignore handoff parse errors */
      }

      if (!cancelled) await refresh()
    }

    bootstrap()
    return () => {
      cancelled = true
    }
  }, [applyAuthenticated, refresh])

  const login = useCallback(
    async (email: string, password: string) => {
      setError(null)
      const result = await authApi.login(email, password)
      if (!result.ok) {
        const msg = result.data.error || 'Invalid email or password.'
        setError(msg)
        return { ok: false, error: msg }
      }
      applyAuthenticated(
        result.data.user,
        result.data.sessionToken,
        result.data.expiresAt,
        result.data.memberships
      )
      return { ok: true }
    },
    [applyAuthenticated]
  )

  const register = useCallback(
    async (email: string, password: string, displayName?: string) => {
      setError(null)
      const result = await authApi.register(email, password, displayName)
      if (!result.ok) {
        const msg = result.data.error || 'Registration failed.'
        setError(msg)
        return { ok: false, error: msg }
      }
      return {
        ok: true,
        message: result.data.message,
        expiresInSeconds: result.data.expiresInSeconds,
      }
    },
    []
  )

  const verifyEmail = useCallback(
    async (email: string, code: string) => {
      setError(null)
      const result = await authApi.verifyEmail(email, code)
      if (!result.ok) {
        const msg = result.data.error || 'Verification failed.'
        setError(msg)
        return { ok: false, error: msg }
      }
      applyAuthenticated(
        result.data.user,
        result.data.sessionToken,
        result.data.expiresAt,
        result.data.memberships
      )
      return { ok: true }
    },
    [applyAuthenticated]
  )

  const resendVerification = useCallback(async (email: string) => {
    setError(null)
    const result = await authApi.resendVerification(email)
    if (!result.ok) {
      const msg = result.data.error || 'Could not resend code.'
      setError(msg)
      return { ok: false, error: msg }
    }
    return { ok: true, message: result.data.message }
  }, [])

  const logout = useCallback(async () => {
    const token = getSessionToken()
    try {
      if (token) await authApi.logout(token)
    } catch {
      /* still clear locally */
    }
    applyUnauthenticated()
  }, [applyUnauthenticated])

  const exchangeHandoffFn = useCallback(
    async (code: string) => {
      setError(null)
      const result = await authApi.exchangeHandoff(code, 'forge')
      if (!result.ok) {
        const msg = result.data.error || 'Invalid or expired handoff code.'
        setError(msg)
        return { ok: false, error: msg }
      }
      applyAuthenticated(
        result.data.user,
        result.data.sessionToken,
        result.data.expiresAt,
        result.data.memberships
      )
      return { ok: true }
    },
    [applyAuthenticated]
  )

  return {
    status,
    user,
    memberships,
    error,
    login,
    register,
    verifyEmail,
    resendVerification,
    logout,
    refresh,
    exchangeHandoff: exchangeHandoffFn,
    clearError: () => setError(null),
  }
}
