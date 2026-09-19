import type { View } from '../App'
import { Button } from './Button'
import { loadProfile } from '../lib/accountStore'

interface NavProps {
  currentView: View
  onNavigate: (view: View) => void
  onCreate: () => void
}

export function Nav({ currentView, onNavigate, onCreate }: NavProps) {
  const profile = loadProfile()
  const initial = (profile.displayName.trim()[0] || 'U').toUpperCase()

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
              fill="#3BA7FF"
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
        <button
          className="nav-avatar"
          aria-label="Open profile"
          title={profile.displayName}
          type="button"
          onClick={() => onNavigate('profile')}
        >
          {initial}
        </button>
      </div>
    </header>
  )
}
