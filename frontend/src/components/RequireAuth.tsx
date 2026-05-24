import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/AuthProvider'
import type { Role } from '../api/auth'

type Props = {
  role?: Role
  children: React.ReactNode
}

/**
 * Route guard. Redirects to /login when unauthenticated; to / when the
 * authed user lacks the required role. Renders a brief loading screen
 * while the boot-refresh resolves.
 */
export function RequireAuth({ role, children }: Props) {
  const { status, user } = useAuth()
  const location = useLocation()

  if (status === 'loading') return <BootSplash />
  if (status === 'unauthenticated') {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }
  if (role && user?.role !== role) {
    return <Navigate to="/" replace />
  }
  return <>{children}</>
}

function BootSplash() {
  return (
    <div className="min-h-screen grid place-items-center text-ink-400 text-sm">
      <div className="flex items-center gap-2">
        <span className="inline-block h-2 w-2 rounded-full bg-ink-300 animate-pulse" />
        Restoring session…
      </div>
    </div>
  )
}
