import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { isAxiosError } from 'axios'
import { useAuth } from '../../lib/AuthProvider'

export function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await register({ email, password, firstName, lastName })
      navigate('/', { replace: true })
    } catch (err) {
      setError(extractError(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-parchment-50">
      <div className="card w-full max-w-md p-8 space-y-6">
        <div>
          <h2 className="text-2xl text-ink-900">Create your account</h2>
          <p className="text-sm text-ink-500 mt-1">
            Three short fields. Your librarian will activate your card on first visit.
          </p>
        </div>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-ink-600">First name</label>
              <input
                className="input mt-1"
                required
                autoComplete="given-name"
                placeholder="Yael"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-ink-600">Last name</label>
              <input
                className="input mt-1"
                required
                autoComplete="family-name"
                placeholder="Shalev"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-ink-600">Email</label>
            <input
              className="input mt-1"
              type="email"
              required
              autoComplete="email"
              placeholder="yael@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-ink-600">Password</label>
            <input
              className="input mt-1"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <p className="text-[11px] text-ink-400 mt-1">
              Stored with bcrypt (cost 12). We don't see your password.
            </p>
          </div>
          {error && (
            <div className="text-xs text-coral-dark bg-coral/10 border border-coral/30 rounded-md px-3 py-2">
              {error}
            </div>
          )}
          <button className="btn-primary w-full" type="submit" disabled={submitting}>
            {submitting ? 'Creating account…' : 'Create account'}
          </button>
        </form>
        <p className="text-xs text-center text-ink-500">
          Already a member?{' '}
          <Link to="/login" className="text-ink-800 underline">Sign in</Link>
        </p>
      </div>
    </div>
  )
}

function extractError(err: unknown): string {
  if (isAxiosError(err)) {
    const code = err.response?.data?.error?.code
    const fieldErrors = err.response?.data?.error?.details?.fieldErrors
    if (code === 'EMAIL_TAKEN') return 'An account with this email already exists.'
    if (code === 'TOO_MANY_REQUESTS') return 'Too many attempts. Try again later.'
    if (code === 'VALIDATION_ERROR' && fieldErrors) {
      const firstField = Object.keys(fieldErrors)[0]
      const firstMessage = firstField && fieldErrors[firstField]?.[0]
      if (firstMessage) return `${firstField}: ${firstMessage}`
    }
    const message = err.response?.data?.error?.message
    if (typeof message === 'string') return message
  }
  return 'Something went wrong. Please try again.'
}
