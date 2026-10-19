import { useState, FormEvent } from 'react'
import { Button } from '../components/Button'
import { Input } from '../components/Input'
import type { UseAuthReturn } from '../hooks/useAuth'

interface SignInProps {
  auth: UseAuthReturn
  onSuccess: () => void
  onGoSignUp: () => void
  onBack: () => void
}

export function SignIn({ auth, onSuccess, onGoSignUp, onBack }: SignInProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLocalError(null)
    auth.clearError()
    const em = email.trim()
    if (!em || !password) {
      setLocalError('Enter your email and password.')
      return
    }
    setBusy(true)
    try {
      const result = await auth.login(em, password)
      if (result.ok) {
        onSuccess()
      } else {
        setLocalError(result.error || 'Invalid email or password.')
      }
    } finally {
      setBusy(false)
    }
  }

  const message = localError || auth.error

  return (
    <section className="shell-page auth-page" aria-labelledby="signin-heading">
      <header className="shell-page-header">
        <button type="button" className="ws-back" onClick={onBack}>
          ← Back
        </button>
        <h1 id="signin-heading" className="shell-page-title">
          Sign in
        </h1>
      </header>

      <div className="shell-card auth-card">
        <p className="shell-note auth-lead">
          Use your VEXDYN account. Same credentials work on the main site and
          Forge.
        </p>

        {message && (
          <div className="auth-msg auth-msg-err" role="alert">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="create-field">
            <label className="label" htmlFor="si-email">
              Email
            </label>
            <Input
              id="si-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              disabled={busy}
            />
          </div>
          <div className="create-field">
            <label className="label" htmlFor="si-password">
              Password
            </label>
            <Input
              id="si-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={busy}
            />
          </div>
          <div className="shell-actions auth-actions-row">
            <Button type="submit" disabled={busy} className="auth-submit">
              {busy ? 'Signing in…' : 'Sign in'}
            </Button>
          </div>
        </form>

        <p className="auth-switch">
          No account yet?{' '}
          <button type="button" className="auth-link" onClick={onGoSignUp}>
            Create one
          </button>
        </p>
        <p className="shell-note auth-hint">
          Forgot password? Use the reset flow on{' '}
          <a
            href="https://vexdyn.pages.dev/#signin"
            target="_blank"
            rel="noopener noreferrer"
          >
            vexdyn.pages.dev
          </a>
          .
        </p>
      </div>
    </section>
  )
}
