import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { isAxiosError } from 'axios'
import { useAuth } from '../../lib/AuthProvider'

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await login({ email, password })
      navigate(from, { replace: true })
    } catch (err) {
      setError(extractError(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      <div
        className="hidden md:flex flex-col justify-between p-12 text-parchment-50 relative overflow-hidden"
        style={{
          background:
            'linear-gradient(135deg, #0a3a2f 0%, #0d4d3e 35%, #5b21b6 100%)',
        }}
      >
        <div className="font-serif text-2xl">
          <span className="text-amber">❦</span> Pages
        </div>
        <div className="space-y-4 relative z-10">
          <h1 className="text-5xl leading-tight">
            Every reader finds<br />
            <span className="text-amber">their next book.</span>
          </h1>
          <p className="text-parchment-100/80 max-w-md text-lg">
            A small-library catalog with a recommendation engine that learns
            from what your community reads.
          </p>
        </div>
        <div className="text-xs text-parchment-100/60">MAHAT final project · 2026</div>
        <div className="absolute -right-32 -bottom-32 w-[28rem] h-[28rem] rounded-full bg-amber/30 blur-3xl" />
        <div className="absolute -left-20 top-20 w-72 h-72 rounded-full bg-berry/30 blur-3xl" />
      </div>
      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-sm space-y-6">
          <div>
            <h2 className="text-2xl text-ink-900">Welcome back</h2>
            <p className="text-sm text-ink-500 mt-1">Sign in to your library account.</p>
          </div>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div>
              <label className="text-xs font-medium text-ink-600">Email</label>
              <input
                className="input mt-1"
                type="email"
                autoComplete="email"
                required
                placeholder="you@library.org"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <div className="flex justify-between">
                <label className="text-xs font-medium text-ink-600">Password</label>
                <a className="text-xs text-ink-500 hover:text-ink-800">Forgot?</a>
              </div>
              <input
                className="input mt-1"
                type="password"
                autoComplete="current-password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error && (
              <div className="text-xs text-coral-dark bg-coral/10 border border-coral/30 rounded-md px-3 py-2">
                {error}
              </div>
            )}
            <button className="btn-primary w-full" type="submit" disabled={submitting}>
              {submitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
          <div className="flex items-center gap-3 text-xs text-ink-400">
            <div className="flex-1 border-t border-ink-100" />
            <span>or</span>
            <div className="flex-1 border-t border-ink-100" />
          </div>
          <Link to="/" className="btn-secondary w-full">Continue as guest</Link>
          <p className="text-xs text-center text-ink-500">
            New here?{' '}
            <Link to="/register" className="text-ink-800 underline">Create an account</Link>
          </p>
          <p className="text-[11px] text-center text-ink-400">
            Try <code className="bg-ink-50 px-1 rounded">sara@library.org / library123</code> or{' '}
            <code className="bg-ink-50 px-1 rounded">yael@example.com / reader123</code>
          </p>
        </div>
      </div>
    </div>
  )
}

function extractError(err: unknown): string {
  if (isAxiosError(err)) {
    const code = err.response?.data?.error?.code
    const message = err.response?.data?.error?.message
    if (code === 'INVALID_CREDENTIALS') return 'Email or password is incorrect.'
    if (code === 'TOO_MANY_REQUESTS') return 'Too many attempts. Try again in a few minutes.'
    if (typeof message === 'string') return message
  }
  return 'Something went wrong. Please try again.'
}
