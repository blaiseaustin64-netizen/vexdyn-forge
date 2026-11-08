import { useEffect, useState } from 'react'
import { startUpdatePolling } from '../lib/updateCheck'

/**
 * Non-blocking banner when a new production build is available.
 * Does not auto-reload — user chooses when to refresh so active work is safe.
 */
export function UpdateBanner() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    // Only in production builds with a real build id
    if (import.meta.env.DEV) return
    const stop = startUpdatePolling((status) => {
      if (status.available) setShow(true)
    })
    return stop
  }, [])

  if (!show) return null

  return (
    <div className="update-banner" role="status" aria-live="polite">
      <span className="update-banner-text">A new version of Forge is available.</span>
      <button
        type="button"
        className="update-banner-btn"
        onClick={() => {
          // Full reload picks up new index.html + assets
          window.location.reload()
        }}
      >
        Refresh
      </button>
      <button
        type="button"
        className="update-banner-dismiss"
        aria-label="Dismiss"
        onClick={() => setShow(false)}
      >
        ×
      </button>
    </div>
  )
}
