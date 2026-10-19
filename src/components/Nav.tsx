import type { View } from '../App'
import { Button } from './Button'
import type { PublicUser } from '../lib/authApi'
import type { AuthStatus } from '../hooks/useAuth'

interface NavProps {
  currentView: View
  onNavigate: (view: View) => void
  onCreate: () => void
  authStatus: AuthStatus
  user: PublicUser | null
  onSignIn: () => void
  onSignOut: () => void
}

function initials(user: PublicUser | null): string {
  if (!user) return '?'
  const name = (user.displayName || user.email || 'U').trim()
  const parts = name.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

export function Nav({
  currentView,
  onNavigate,
  onCreate,
  authStatus,
  user,
  onSignIn,
  onSignOut,
}: NavProps) {
  const authed = authStatus === 'authenticated' && user
  const loading = authStatus === 'loading'

  return (
    <header className="nav" role="banner">
      <a
        href="#"
        className="nav-brand"
        onClick={(e) => {
          e.preventDefault()
          onNavigate('dashboard')
        }}
        aria-label="VEXDYN FORGE home"
      >
        <span className="nav-logo" aria-hidden>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path
              d="M4 4h5.5v5.5H4V4zm6.5 0H16v5.5h-5.5V4zM4 10.5h5.5V16H4v-5.5zm6.5 0H16V16h-5.5v-5.5z"
              fill="#5B8DC7"
              opacity="0.9"
            />
            <path
              d="M6.5 6.5h2v2h-2v-2zm7 0h2v2h-2v-2zM6.5 13h2v2h-2v-2zm7 0h2v2h-2v-2z"
              fill="#D8E0E8"
              opacity="0.35"
            />
          </svg>
        </span>
        <span className="nav-title">VEXDYN FORGE</span>
      </a>

      <nav className="nav-links" aria-label="Primary">
        <a
          href="#"
          className={`nav-link ${
            currentView === 'dashboard' || currentView === 'workspace'
              ? 'active'
              : ''
          }`}
          onClick={(e) => {
            e.preventDefault()
            onNavigate('dashboard')
          }}
        >
          Projects
        </a>
        <a
          href="#"
          className={`nav-link ${currentView === 'settings' ? 'active' : ''}`}
          onClick={(e) => {
            e.preventDefault()
            onNavigate('settings')
          }}
        >
          Settings
        </a>
      </nav>

      <div className="nav-right">
        <Button
          variant="ghost"
          size="sm"
          onClick={onCreate}
          className="hide-mobile"
        >
          + New
        </Button>

        {loading ? (
          <span className="nav-auth-loading" aria-label="Checking session">
            …
          </span>
        ) : authed ? (
          <>
            <button
              className="nav-avatar"
              aria-label="Open account"
              title={user.email}
              type="button"
              onClick={() => onNavigate('profile')}
            >
              {initials(user)}
            </button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onSignOut}
              className="hide-mobile nav-signout"
            >
              Sign out
            </Button>
          </>
        ) : (
          <Button variant="secondary" size="sm" onClick={onSignIn}>
            Sign in
          </Button>
        )}
      </div>
    </header>
  )
}
