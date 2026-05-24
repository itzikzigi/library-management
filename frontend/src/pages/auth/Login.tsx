import { Link } from 'react-router-dom'

export function LoginPage() {
  return (
    <div className="min-h-full grid md:grid-cols-2">
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
          <form className="space-y-4">
            <div>
              <label className="text-xs font-medium text-ink-600">Email</label>
              <input className="input mt-1" placeholder="you@library.org" />
            </div>
            <div>
              <div className="flex justify-between">
                <label className="text-xs font-medium text-ink-600">Password</label>
                <a className="text-xs text-ink-500 hover:text-ink-800">Forgot?</a>
              </div>
              <input className="input mt-1" type="password" placeholder="••••••••" />
            </div>
            <button className="btn-primary w-full" type="button">Sign in</button>
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
        </div>
      </div>
    </div>
  )
}
