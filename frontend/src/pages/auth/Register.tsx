import { Link } from 'react-router-dom'

export function RegisterPage() {
  return (
    <div className="min-h-full flex items-center justify-center p-8 bg-parchment-50">
      <div className="card w-full max-w-md p-8 space-y-6">
        <div>
          <h2 className="text-2xl text-ink-900">Create your account</h2>
          <p className="text-sm text-ink-500 mt-1">
            Three short fields. Your librarian will activate your card on first visit.
          </p>
        </div>
        <form className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-ink-600">First name</label>
              <input className="input mt-1" placeholder="Yael" />
            </div>
            <div>
              <label className="text-xs font-medium text-ink-600">Last name</label>
              <input className="input mt-1" placeholder="Shalev" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-ink-600">Email</label>
            <input className="input mt-1" placeholder="yael@example.com" />
          </div>
          <div>
            <label className="text-xs font-medium text-ink-600">Password</label>
            <input className="input mt-1" type="password" placeholder="At least 8 characters" />
            <p className="text-[11px] text-ink-400 mt-1">
              Stored with bcrypt (cost 12). We don't see your password.
            </p>
          </div>
          <button className="btn-primary w-full" type="button">Create account</button>
        </form>
        <p className="text-xs text-center text-ink-500">
          Already a member?{' '}
          <Link to="/login" className="text-ink-800 underline">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
