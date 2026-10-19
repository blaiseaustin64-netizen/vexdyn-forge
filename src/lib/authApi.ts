/**
 * VEXDYN shared auth API client.
 * Talks only to the existing vexdyn-backend Worker.
 * Contracts match src/routes/auth.ts in the backend — do not invent endpoints.
 */

const DEFAULT_API = 'https://vexdyn-backend.blaisepatrick556.workers.dev'

export function getAuthApiBase(): string {
  const fromEnv = (import.meta.env.VITE_AUTH_API_URL as string | undefined)?.trim()
  if (fromEnv) return fromEnv.replace(/\/$/, '')
  return DEFAULT_API
}

export type PublicUser = {
  id: string
  email: string
  emailVerified: boolean
  displayName: string | null
  createdAt: string
}

export type Membership = {
  product: string
  role: string
}

export type AuthSuccess = {
  ok: true
  user: PublicUser
  sessionToken: string
  expiresAt: string
  memberships?: Membership[]
  message?: string
}

export type AuthError = {
  ok: false
  error: string
  code?: string
}

export type AuthResult<T = AuthSuccess> =
  | { ok: true; status: number; data: T }
  | { ok: false; status: number; data: AuthError }

type RequestOpts = {
  method?: string
  body?: Record<string, unknown>
  token?: string | null
}

async function request<T extends Record<string, unknown>>(
  path: string,
  opts: RequestOpts = {}
): Promise<AuthResult<T & { ok: true }>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  const token = opts.token
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
    headers['X-Session-Token'] = token
  }

  let res: Response
  try {
    res = await fetch(`${getAuthApiBase()}${path}`, {
      method: opts.method || 'GET',
      headers,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      // Cross-origin: session is carried via Bearer / X-Session-Token, not cookies
      credentials: 'omit',
    })
  } catch {
    return {
      ok: false,
      status: 0,
      data: { ok: false, error: 'Could not reach the authentication server. Check your connection.' },
    }
  }

  let data: unknown
  try {
    data = await res.json()
  } catch {
    return {
      ok: false,
      status: res.status,
      data: { ok: false, error: 'Unexpected response from the authentication server.' },
    }
  }

  const body = data as Record<string, unknown>
  if (!res.ok || body.ok === false) {
    return {
      ok: false,
      status: res.status,
      data: {
        ok: false,
        error: typeof body.error === 'string' ? body.error : 'Request failed.',
        code: typeof body.code === 'string' ? body.code : undefined,
      },
    }
  }

  return {
    ok: true,
    status: res.status,
    data: body as T & { ok: true },
  }
}

/** POST /auth/login { email, password } */
export async function login(
  email: string,
  password: string
): Promise<AuthResult<AuthSuccess>> {
  return request<AuthSuccess>('/auth/login', {
    method: 'POST',
    body: { email, password },
  })
}

/** POST /auth/register { email, password, displayName? } */
export async function register(
  email: string,
  password: string,
  displayName?: string
): Promise<
  AuthResult<{ ok: true; message: string; expiresInSeconds?: number }>
> {
  return request('/auth/register', {
    method: 'POST',
    body: {
      email,
      password,
      ...(displayName ? { displayName } : {}),
    },
  })
}

/** POST /auth/verify-email { email, code } — issues session on success */
export async function verifyEmail(
  email: string,
  code: string
): Promise<AuthResult<AuthSuccess>> {
  return request<AuthSuccess>('/auth/verify-email', {
    method: 'POST',
    body: { email, code },
  })
}

/** POST /auth/resend-verification { email } */
export async function resendVerification(
  email: string
): Promise<AuthResult<{ ok: true; message: string; expiresInSeconds?: number }>> {
  return request('/auth/resend-verification', {
    method: 'POST',
    body: { email },
  })
}

/** POST /auth/logout — revoke session */
export async function logout(token: string | null): Promise<AuthResult<{ ok: true; message: string }>> {
  return request('/auth/logout', { method: 'POST', token })
}

/** GET /auth/me */
export async function me(
  token: string
): Promise<
  AuthResult<{
    ok: true
    user: PublicUser
    memberships?: Membership[]
    session?: { id: string; expiresAt: string }
  }>
> {
  return request('/auth/me', { token })
}

/** POST /auth/forgot-password { email } */
export async function forgotPassword(
  email: string
): Promise<AuthResult<{ ok: true; message: string }>> {
  return request('/auth/forgot-password', {
    method: 'POST',
    body: { email },
  })
}

/**
 * POST /auth/handoff/exchange { code, targetProduct }
 * Used when arriving from another VEXDYN product with a one-time handoff code.
 */
export async function exchangeHandoff(
  code: string,
  targetProduct: string = 'forge'
): Promise<AuthResult<AuthSuccess>> {
  return request<AuthSuccess>('/auth/handoff/exchange', {
    method: 'POST',
    body: { code, targetProduct },
  })
}

/**
 * POST /auth/handoff/create { targetProduct }
 * Authenticated user requests a short-lived code for another product domain.
 */
export async function createHandoff(
  token: string,
  targetProduct: string
): Promise<
  AuthResult<{
    ok: true
    code: string
    targetProduct: string
    expiresAt: string
    expiresInSeconds: number
  }>
> {
  return request('/auth/handoff/create', {
    method: 'POST',
    token,
    body: { targetProduct },
  })
}
