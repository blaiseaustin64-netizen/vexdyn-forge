/**
 * Production update detection for Forge on Cloudflare Pages.
 *
 * Compares the build id baked into the current bundle with /version.json
 * from the origin (always fetched with cache: no-store). When a new
 * deployment is live, callers can show a non-blocking reload prompt.
 *
 * Does not force-reload mid-edit. Safe for offline: network errors are ignored.
 */

export type UpdateStatus = {
  available: boolean
  currentBuildId: string
  remoteBuildId: string | null
}

const CHECK_INTERVAL_MS = 60_000

export function getCurrentBuildId(): string {
  const id = (import.meta.env.VITE_APP_BUILD_ID as string | undefined) || ''
  return id || 'dev'
}

export async function checkForUpdate(): Promise<UpdateStatus> {
  const currentBuildId = getCurrentBuildId()
  if (!currentBuildId || currentBuildId === 'dev') {
    return { available: false, currentBuildId, remoteBuildId: null }
  }

  try {
    const res = await fetch(`/version.json?t=${Date.now()}`, {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) {
      return { available: false, currentBuildId, remoteBuildId: null }
    }
    const data = (await res.json()) as { buildId?: string }
    const remoteBuildId = typeof data.buildId === 'string' ? data.buildId : null
    if (!remoteBuildId) {
      return { available: false, currentBuildId, remoteBuildId: null }
    }
    return {
      available: remoteBuildId !== currentBuildId,
      currentBuildId,
      remoteBuildId,
    }
  } catch {
    // Offline or blocked — do not treat as update
    return { available: false, currentBuildId, remoteBuildId: null }
  }
}

/**
 * Start periodic + visibility-based update checks.
 * Returns a cleanup function.
 */
export function startUpdatePolling(
  onUpdate: (status: UpdateStatus) => void,
  intervalMs: number = CHECK_INTERVAL_MS
): () => void {
  let cancelled = false
  let timer: ReturnType<typeof setInterval> | null = null

  const run = async () => {
    if (cancelled) return
    const status = await checkForUpdate()
    if (!cancelled && status.available) onUpdate(status)
  }

  const onVisible = () => {
    if (document.visibilityState === 'visible') void run()
  }

  void run()
  timer = setInterval(() => void run(), intervalMs)
  document.addEventListener('visibilitychange', onVisible)
  window.addEventListener('focus', onVisible)

  return () => {
    cancelled = true
    if (timer) clearInterval(timer)
    document.removeEventListener('visibilitychange', onVisible)
    window.removeEventListener('focus', onVisible)
  }
}
