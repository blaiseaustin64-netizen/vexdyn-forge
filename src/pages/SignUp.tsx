import { useState, FormEvent } from 'react'
import { Button } from '../components/Button'
import { Input } from '../components/Input'
import type { UseAuthReturn } from '../hooks/useAuth'

interface SignUpProps {
  auth: UseAuthReturn
  onSuccess: () => void
  onGoSignIn: () => void
  onBack: () => void
}

type Step = 'register' | 'verify'

export function SignUp({ auth, onSuccess, onGoSignIn, onBack }: SignUpProps) {
  const [step, setStep] = useState<Step>('register')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault()
    setLocalError(null)
    setInfo(null)
    auth.clearError()
    const em = email.trim()
    if (!em || !password) {
      setLocalError('Enter email and password.')
      return
    }
    if (password.length < 8) {
      setLocalError('Password must be at least 8 characters with a letter and a number.')
      return
    }
    setBusy(true)
    try {
      const result = await auth.register(em, password, displayName.trim() || undefined)
      if (result.ok) {
        setInfo(
          result.message ||
            'If an account exists for that email, a verification message has been sent.'
        )
        setStep('verify')
      } else {
        setLocalError(result.error || 'Registration failed.')
      }
    } finally {
      setBusy(false)
    }
  }

  const handleVerify = async (e: FormEvent) => {
    e.preventDefault()
    setLocalError(null)
    setInfo(null)
    auth.clearError()
    const c = code.trim()
    if (!/^\d{6}$/.test(c)) {
      setLocalError('Enter the 6-digit code from your email.')
      return
    }
    setBusy(true)
    try {
      const result = await auth.verifyEmail(email.trim(), c)
      if (result.ok) {
        onSuccess()
      } else {
        setLocalError(result.error || 'That code is wrong or has expired.')
      }
    } finally {
      setBusy(false)
    }
  }

  const handleResend = async () => {
    setLocalError(null)
    setInfo(null)
    setBusy(true)
    try {
      const result = await auth.resendVerification(email.trim())
      if (result.ok) {
        setInfo(result.message || 'A new code was sent if the account is eligible.')
      } else {
        setLocalError(result.error || 'Could not resend.')
      }
    } finally {
      setBusy(false)
    }
  }

  const message = localError || auth.error

  return (
    <section className="shell-page auth-page" aria-labelledby="signup-heading">
      <header className="shell-page-header">
        <button type="button" className="ws-back" onClick={onBack}>
          ← Back
        </button>
        <h1 id="signup-heading" className="shell-page-title">
          {step === 'register' ? 'Create account' : 'Verify email'}
        </h1>
      </header>

      <div className="shell-card auth-card">
        {step === 'register' ? (
          <>
            <p className="shell-note auth-lead">
              Creates a shared VEXDYN account. You will verify your email before
              signing in.
            </p>
            {message && (
              <div className="auth-msg auth-msg-err" role="alert">
                {message}
              </div>
            )}
            <form onSubmit={handleRegister} noValidate>
              <div className="create-field">
                <label className="label" htmlFor="su-name">
                  Display name (optional)
                </label>
                <Input
                  id="su-name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name"
                  disabled={busy}
                />
              </div>
              <div className="create-field">
                <label className="label" htmlFor="su-email">
                  Email
                </label>
                <Input
                  id="su-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  disabled={busy}
                />
              </div>
              <div className="create-field">
                <label className="label" htmlFor="su-password">
                  Password
                </label>
                <Input
                  id="su-password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="8+ chars, letter and number"
                  disabled={busy}
                />
              </div>
              <div className="shell-actions auth-actions-row">
                <Button type="submit" disabled={busy} className="auth-submit">
                  {busy ? 'Creating…' : 'Create account'}
                </Button>
              </div>
            </form>
            <p className="auth-switch">
              Already have an account?{' '}
              <button type="button" className="auth-link" onClick={onGoSignIn}>
                Sign in
              </button>
            </p>
          </>
        ) : (
          <>
            <p className="shell-note auth-lead">
              Enter the 6-digit code sent to <strong>{email}</strong>.
            </p>
            {info && (
              <div className="auth-msg auth-msg-ok" role="status">
                {info}
              </div>
            )}
            {message && (
              <div className="auth-msg auth-msg-err" role="alert">
                {message}
              </div>
            )}
            <form onSubmit={handleVerify} noValidate>
              <div className="create-field">
                <label className="label" htmlFor="su-code">
                  Verification code
                </label>
                <Input
                  id="su-code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  disabled={busy}
                />
              </div>
              <div className="shell-actions auth-actions-row">
                <Button type="submit" disabled={busy} className="auth-submit">
                  {busy ? 'Verifying…' : 'Verify & sign in'}
                </Button>
              </div>
            </form>
            <p className="auth-switch">
              <button
                type="button"
                className="auth-link"
                onClick={handleResend}
                disabled={busy}
              >
                Resend code
              </button>
              {' · '}
              <button
                type="button"
                className="auth-link"
                onClick={() => {
                  setStep('register')
                  setCode('')
                  setInfo(null)
                  setLocalError(null)
                }}
              >
                Change email
              </button>
            </p>
          </>
        )}
      </div>
    </section>
  )
}
