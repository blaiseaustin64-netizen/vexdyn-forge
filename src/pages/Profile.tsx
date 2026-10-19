import { useState } from 'react'
import { Button } from '../components/Button'
import { Input } from '../components/Input'
import {
  loadProfile,
  saveProfile,
  profileInitials,
  type LocalProfile,
} from '../lib/accountStore'
import { projectStore } from '../lib/projectStore'
import type { PublicUser, Membership } from '../lib/authApi'
import type { AuthStatus } from '../hooks/useAuth'

interface ProfileProps {
  onBack: () => void
  authStatus: AuthStatus
  user: PublicUser | null
  memberships: Membership[]
  onSignIn: () => void
  onSignOut: () => void
}

/**
 * Account center — shows VEXDYN Core session when signed in,
 * plus optional local workspace identity for device-only profile fields.
 */
export function Profile({
  onBack,
  authStatus,
  user,
  memberships,
  onSignIn,
  onSignOut,
}: ProfileProps) {
  const [profile, setProfile] = useState<LocalProfile>(() => loadProfile())
  const [form, setForm] = useState({
    displayName: profile.displayName,
    username: profile.username,
    email: profile.email,
  })
  const [saved, setSaved] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const projectCount = projectStore.list().length
  const authed = authStatus === 'authenticated' && user

  const displayName = authed
    ? user.displayName || user.email.split('@')[0] || 'VEXDYN user'
    : form.displayName || profile.displayName
  const initials = profileInitials(displayName)

  const update = (key: keyof typeof form, value: string) => {
    setForm((f) => ({ ...f, [key]: value }))
  }

  const handleSaveLocal = () => {
    const next: LocalProfile = {
      ...profile,
      displayName: form.displayName.trim() || 'Forge Developer',
      username: form.username.trim().replace(/^@/, '') || 'forge-dev',
      email: form.email.trim(),
    }
    saveProfile(next)
    setProfile(next)
    setForm({
      displayName: next.displayName,
      username: next.username,
      email: next.email,
    })
    setSaved(true)
    window.setTimeout(() => setSaved(false), 1500)
  }

  const handleSignOut = async () => {
    setSigningOut(true)
    try {
      await onSignOut()
    } finally {
      setSigningOut(false)
    }
  }

  return (
    <section className="shell-page profile-page" aria-labelledby="profile-heading">
      <header className="shell-page-header">
        <button type="button" className="ws-back" onClick={onBack}>
          ← Back
        </button>
        <h1 id="profile-heading" className="shell-page-title">
          Account
        </h1>
      </header>

      <div className="profile-hero glass-surface">
        <div className="profile-avatar" aria-hidden>
          {initials}
        </div>
        <div className="profile-hero-text">
          <h2 className="profile-name">{displayName}</h2>
          {authed ? (
            <>
              <p className="profile-email">{user.email}</p>
              <p className="profile-handle">
                {user.emailVerified ? 'Email verified' : 'Email not verified'} · VEXDYN Core
              </p>
            </>
          ) : (
            <>
              <p className="profile-handle">@{form.username || 'forge-dev'}</p>
              <p className="profile-email">
                {form.email || 'Not signed in · local identity only'}
              </p>
            </>
          )}
        </div>
      </div>

      <div className="shell-card">
        <h2 className="shell-section-title">VEXDYN account</h2>
        {authStatus === 'loading' ? (
          <p className="shell-note">Checking session…</p>
        ) : authed ? (
          <>
            <dl className="profile-meta">
              <div>
                <dt>Email</dt>
                <dd>{user.email}</dd>
              </div>
              <div>
                <dt>User ID</dt>
                <dd className="mono profile-id">{user.id}</dd>
              </div>
              <div>
                <dt>Member since</dt>
                <dd>
                  {(() => {
                    try {
                      return new Date(user.createdAt).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })
                    } catch {
                      return user.createdAt
                    }
                  })()}
                </dd>
              </div>
              {memberships.length > 0 && (
                <div>
                  <dt>Product memberships</dt>
                  <dd>
                    {memberships
                      .map((m) => `${m.product} (${m.role})`)
                      .join(', ')}
                  </dd>
                </div>
              )}
            </dl>
            <div className="shell-actions">
              <Button
                variant="secondary"
                onClick={handleSignOut}
                disabled={signingOut}
              >
                {signingOut ? 'Signing out…' : 'Sign out'}
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="shell-note">
              Sign in with your VEXDYN account to use the same identity across
              the main website and Forge. Local projects on this device stay
              available either way.
            </p>
            <div className="shell-actions">
              <Button onClick={onSignIn}>Sign in</Button>
            </div>
          </>
        )}
      </div>

      {!authed && (
        <div className="shell-card">
          <h2 className="shell-section-title">Local identity</h2>
          <div className="create-field">
            <label className="label" htmlFor="full-name">
              Full name
            </label>
            <Input
              id="full-name"
              value={form.displayName}
              onChange={(e) => update('displayName', e.target.value)}
              placeholder="Your name"
            />
          </div>
          <div className="create-field">
            <label className="label" htmlFor="username">
              Username
            </label>
            <Input
              id="username"
              value={form.username}
              onChange={(e) => update('username', e.target.value)}
              placeholder="username"
            />
          </div>
          <div className="create-field">
            <label className="label" htmlFor="email">
              Email (local only)
            </label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <p className="shell-note">
            These fields stay on this browser until you sign in with VEXDYN Core.
          </p>
          <div className="shell-actions">
            <Button onClick={handleSaveLocal}>
              {saved ? 'Saved' : 'Save local profile'}
            </Button>
          </div>
        </div>
      )}

      <div className="shell-card">
        <h2 className="shell-section-title">Workspace</h2>
        <dl className="profile-meta">
          <div>
            <dt>Projects on this device</dt>
            <dd className="mono">{projectCount}</dd>
          </div>
          <div>
            <dt>Persistence</dt>
            <dd>Local browser storage</dd>
          </div>
          {!authed && (
            <div>
              <dt>Local ID</dt>
              <dd className="mono profile-id">{profile.localId}</dd>
            </div>
          )}
        </dl>
      </div>

      <div className="shell-card">
        <h2 className="shell-section-title">About</h2>
        <dl className="profile-meta">
          <div>
            <dt>Product</dt>
            <dd>VEXDYN FORGE</dd>
          </div>
          <div>
            <dt>Version</dt>
            <dd className="mono">1.6.7</dd>
          </div>
          <div>
            <dt>Auth</dt>
            <dd>VEXDYN Core (shared backend)</dd>
          </div>
        </dl>
      </div>
    </section>
  )
}
