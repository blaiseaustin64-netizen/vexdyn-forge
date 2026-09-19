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

interface ProfileProps {
  onBack: () => void
}

/**
 * Professional account center — local V1 identity.
 * Prepared for future VEXDYN Core; does not claim cloud auth.
 */
export function Profile({ onBack }: ProfileProps) {
  const [profile, setProfile] = useState<LocalProfile>(() => loadProfile())
  const [form, setForm] = useState({
    displayName: profile.displayName,
    username: profile.username,
    email: profile.email,
  })
  const [saved, setSaved] = useState(false)
  const projectCount = projectStore.list().length
  const initials = profileInitials(form.displayName || profile.displayName)

  const update = (key: keyof typeof form, value: string) => {
    setForm((f) => ({ ...f, [key]: value }))
  }

  const handleSave = () => {
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
          <h2 className="profile-name">{form.displayName || 'Forge Developer'}</h2>
          <p className="profile-handle">@{form.username || 'forge-dev'}</p>
          <p className="profile-email">
            {form.email || 'No email set · local identity only'}
          </p>
        </div>
      </div>

      <div className="shell-card">
        <h2 className="shell-section-title">Account</h2>
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
            Email
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
          Avatar uses initials in V1. Profile images will connect through VEXDYN Core later.
        </p>
      </div>

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
          <div>
            <dt>Local ID</dt>
            <dd className="mono profile-id">{profile.localId}</dd>
          </div>
        </dl>
      </div>

      <div className="shell-card">
        <h2 className="shell-section-title">Account & security</h2>
        <p className="shell-note">
          Authentication and cloud project ownership will connect through{' '}
          <strong>VEXDYN Core</strong>. V1 does not include login or cloud sync.
        </p>
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
            <dd className="mono">1.0.0</dd>
          </div>
          <div>
            <dt>Stack</dt>
            <dd>HTML / CSS / JavaScript</dd>
          </div>
        </dl>
      </div>

      <div className="shell-actions">
        <Button variant="primary" onClick={handleSave}>
          {saved ? 'Saved' : 'Save locally'}
        </Button>
        <Button variant="ghost" onClick={onBack}>
          Back
        </Button>
      </div>
    </section>
  )
}
