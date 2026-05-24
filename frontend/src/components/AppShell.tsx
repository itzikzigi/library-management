import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'

type Role = 'reader' | 'librarian'

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
  const role: Role = location.pathname.startsWith('/librarian') ? 'librarian' : 'reader'
  const nav = role === 'librarian' ? LIBRARIAN_NAV : READER_NAV
  const switchTo = role === 'librarian' ? '/' : '/librarian'
  const switchLabel = role === 'librarian' ? 'View as reader' : 'View as librarian'

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
          <Link to={switchTo} className="text-xs text-ink-500 hover:text-ink-800">
            {switchLabel}
          </Link>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-ink-800 text-parchment-50 grid place-items-center text-xs font-medium">
              YS
            </div>
          </div>
        </div>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t border-ink-100 py-6 text-center text-xs text-ink-400">
        Pages · MAHAT project · static design preview
      </footer>
    </div>
  )
}
