import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../lib/AuthProvider'

const READER_NAV = [
  { to: '/', label: 'Catalog' },
  { to: '/recommendations', label: 'For You' },
  { to: '/my-loans', label: 'My Loans' },
]

const LIBRARIAN_NAV = [
  { to: '/librarian', label: 'Dashboard' },
  { to: '/librarian/books', label: 'Books' },
  { to: '/librarian/members', label: 'Members' },
  { to: '/librarian/loans', label: 'Loans' },
]

export function AppShell() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, status, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)

  const inLibrarianArea = location.pathname.startsWith('/librarian')
  const nav = inLibrarianArea && user?.role === 'LIBRARIAN' ? LIBRARIAN_NAV : READER_NAV
  const initials = user
    ? `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase()
    : null

  async function onLogout() {
    setMenuOpen(false)
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-full flex flex-col">
      <header className="sticky top-0 z-10 bg-parchment-50/90 backdrop-blur border-b border-ink-100">
        <div className="mx-auto max-w-7xl px-6 h-14 flex items-center gap-6">
          <Link to="/" className="font-serif text-lg text-ink-900">
            <span className="text-amber-dark">❦</span> Pages
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            {nav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/' || item.to === '/librarian'}
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-md text-sm ${
                    isActive
                      ? 'bg-ink-100 text-ink-900 font-medium'
                      : 'text-ink-600 hover:text-ink-900 hover:bg-ink-50'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex-1" />
          {user?.role === 'LIBRARIAN' && (
            <Link
              to={inLibrarianArea ? '/' : '/librarian'}
              className="text-xs text-ink-500 hover:text-ink-800"
            >
              {inLibrarianArea ? 'View as reader' : 'Manage library →'}
            </Link>
          )}
          {status === 'authenticated' && user ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="h-8 w-8 rounded-full bg-ink-800 text-parchment-50 grid place-items-center text-xs font-medium hover:bg-ink-900"
                aria-label="Account menu"
              >
                {initials}
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-10 w-56 card p-3 shadow-lg z-20">
                  <div className="px-2 py-1">
                    <div className="text-sm font-medium text-ink-900 truncate">
                      {user.firstName} {user.lastName}
                    </div>
                    <div className="text-xs text-ink-500 truncate">{user.email}</div>
                    <div className="mt-1">
                      <span className={user.role === 'LIBRARIAN' ? 'chip-accent' : 'chip'}>
                        {user.role.toLowerCase()}
                      </span>
                    </div>
                  </div>
                  <div className="border-t border-ink-100 my-2" />
                  <button
                    type="button"
                    onClick={onLogout}
                    className="w-full text-left px-2 py-1.5 text-sm text-ink-700 hover:bg-ink-50 rounded"
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          ) : status === 'unauthenticated' ? (
            <Link to="/login" className="btn-secondary text-xs">
              Sign in
            </Link>
          ) : (
            <div className="h-8 w-8 rounded-full bg-ink-100 animate-pulse" />
          )}
        </div>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t border-ink-100 py-6 text-center text-xs text-ink-400">
        Pages · MAHAT project · {status === 'authenticated' ? 'logged in' : 'guest mode'}
      </footer>
    </div>
  )
}
