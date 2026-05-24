import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { BookCover } from '../../components/BookCover'
import { listLoans, type Loan } from '../../api/loans'

type Stat = {
  label: string
  value: number
  delta: string
  trend: 'up' | 'down'
  spark: number[]
  icon: JSX.Element
  scheme: 'emerald' | 'coral' | 'berry' | 'amber'
}

const ICONS = {
  loans: (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="2">
      <path d="M4 19V6a2 2 0 0 1 2-2h8l4 4v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" />
      <path d="M14 4v4h4" />
    </svg>
  ),
  overdue: (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  ),
  members: (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="2">
      <circle cx="9" cy="8" r="3.5" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M15 20c0-2.8 2.2-5 4-5" />
    </svg>
  ),
  books: (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="2">
      <path d="M4 5a2 2 0 0 1 2-2h11v18H6a2 2 0 0 1-2-2V5Z" />
      <path d="M17 3v18M8 7h6M8 11h6" />
    </svg>
  ),
}

const SCHEMES = {
  emerald: {
    bg: 'linear-gradient(135deg, #0d4d3e 0%, #1f9a72 100%)',
    chip: 'rgba(174, 229, 207, 0.25)',
    spark: '#aee5cf',
  },
  coral: {
    bg: 'linear-gradient(135deg, #7c1d2e 0%, #ef5350 100%)',
    chip: 'rgba(254, 226, 226, 0.25)',
    spark: '#fecaca',
  },
  berry: {
    bg: 'linear-gradient(135deg, #5b21b6 0%, #d6336c 100%)',
    chip: 'rgba(251, 207, 232, 0.25)',
    spark: '#fbcfe8',
  },
  amber: {
    bg: 'linear-gradient(135deg, #b96a05 0%, #f0a830 100%)',
    chip: 'rgba(255, 237, 213, 0.3)',
    spark: '#fed7aa',
  },
}

const ACTION_STYLE: Record<string, { bg: string; color: string; dot: string }> = {
  borrow: { bg: 'rgba(31, 154, 114, 0.15)', color: '#0e604a', dot: '#1f9a72' },
  return: { bg: 'rgba(56, 189, 248, 0.18)', color: '#075985', dot: '#0ea5e9' },
  late: { bg: 'rgba(239, 83, 80, 0.18)', color: '#b71c1c', dot: '#ef5350' },
}

const CATEGORIES = [
  { label: 'Fiction', pct: 32, color: '#1f9a72' },
  { label: 'ספרות ישראלית', pct: 22, color: '#d6336c' },
  { label: 'Non-fiction', pct: 18, color: '#f0a830' },
  { label: 'שירה', pct: 12, color: '#7c3aed' },
  { label: 'Sci-Fi', pct: 10, color: '#0ea5e9' },
  { label: 'Other', pct: 6, color: '#94a3b8' },
]

export function LibrarianDashboard() {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  const activeQuery = useQuery({
    queryKey: ['loans', { status: 'active', sort: 'recent', limit: 100 }],
    queryFn: () => listLoans({ status: 'active', limit: 100, sort: 'recent' }),
  })
  const overdueQuery = useQuery({
    queryKey: ['loans', { status: 'overdue', sort: 'due-soonest', limit: 10 }],
    queryFn: () => listLoans({ status: 'overdue', limit: 10, sort: 'due-soonest' }),
  })
  const recentQuery = useQuery({
    queryKey: ['loans', { status: 'all', sort: 'recent', limit: 10 }],
    queryFn: () => listLoans({ status: 'all', limit: 10, sort: 'recent' }),
  })

  const activeLoans = activeQuery.data ?? []
  const overdue = overdueQuery.data ?? []
  const overdueTotalFines = overdue.reduce((s, l) => s + l.fine, 0)
  const recent = recentQuery.data ?? []

  const stats: Stat[] = [
    {
      label: 'Active loans',
      value: activeLoans.length,
      delta: `${overdue.length} overdue`,
      trend: 'up',
      spark: spreadSpark(activeLoans.length, 12),
      icon: ICONS.loans,
      scheme: 'emerald',
    },
    {
      label: 'Overdue',
      value: overdue.length,
      delta: `₪${overdueTotalFines.toFixed(0)} in fines`,
      trend: 'down',
      spark: spreadSpark(overdue.length, 12),
      icon: ICONS.overdue,
      scheme: 'coral',
    },
    {
      label: 'Members',
      value: 8,
      delta: 'seeded today',
      trend: 'up',
      spark: [2, 3, 4, 5, 5, 6, 6, 7, 7, 8, 8, 8],
      icon: ICONS.members,
      scheme: 'berry',
    },
    {
      label: 'Books in catalog',
      value: 12,
      delta: '34 copies',
      trend: 'up',
      spark: [2, 4, 6, 7, 8, 9, 10, 10, 11, 11, 12, 12],
      icon: ICONS.books,
      scheme: 'amber',
    },
  ]

  return (
    <div className="mx-auto max-w-7xl px-6 py-8 space-y-8">
      <header
        className="rounded-2xl p-8 text-parchment-50 relative overflow-hidden"
        style={{
          background:
            'linear-gradient(120deg, #04221b 0%, #0d4d3e 40%, #5b21b6 85%, #d6336c 130%)',
        }}
      >
        <div className="absolute -right-24 -top-20 w-96 h-96 rounded-full bg-amber/30 blur-3xl" />
        <div className="absolute -left-20 -bottom-24 w-80 h-80 rounded-full bg-ink-400/30 blur-3xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.18em] text-parchment-100/70">
              {today}
            </div>
            <h1 className="text-4xl mt-1">Good morning, Sara</h1>
            <p className="text-parchment-100/80 mt-2 max-w-xl">
              <span className="text-amber font-medium">3 overdue notices</span> ready to send and{' '}
              <span className="text-amber font-medium">2 holds</span> waiting on returns this week.
            </p>
          </div>
          <div className="flex gap-2 self-start lg:self-end">
            <button className="btn-secondary bg-white/10 border-white/20 text-parchment-50 hover:bg-white/20 hover:text-parchment-50">
              Export report
            </button>
            <Link to="/librarian/books" className="btn-accent">
              + New book
            </Link>
          </div>
        </div>
      </header>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => {
          const scheme = SCHEMES[s.scheme]
          return (
            <div
              key={s.label}
              className="rounded-2xl p-5 text-parchment-50 relative overflow-hidden shadow-card hover:scale-[1.02] transition-transform"
              style={{ background: scheme.bg }}
            >
              <div className="flex items-start justify-between">
                <div
                  className="h-10 w-10 grid place-items-center rounded-xl"
                  style={{ background: scheme.chip }}
                >
                  {s.icon}
                </div>
                <span
                  className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                  style={{ background: scheme.chip }}
                >
                  {s.trend === 'up' ? '↑' : '↓'} {s.delta}
                </span>
              </div>
              <div className="mt-6">
                <div className="text-4xl font-serif">{s.value.toLocaleString()}</div>
                <div className="text-xs text-parchment-100/80 mt-1">{s.label}</div>
              </div>
              <Sparkline values={s.spark} stroke={scheme.spark} />
            </div>
          )
        })}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <section className="card p-6 lg:col-span-2">
          <div className="flex items-end justify-between mb-6">
            <div>
              <h2 className="text-xl text-ink-900">Loans · last 30 days</h2>
              <p className="text-xs text-ink-500 mt-1">
                Daily borrows. Peak <strong className="text-ink-800">80</strong> on day 14.
              </p>
            </div>
            <select className="input w-36 text-xs">
              <option>30 days</option>
              <option>90 days</option>
              <option>This year</option>
            </select>
          </div>
          <GradientBarChart />
        </section>

        <section className="card p-6">
          <div className="flex items-end justify-between mb-4">
            <h2 className="text-xl text-ink-900">Top categories</h2>
            <span className="text-xs text-ink-500">share of loans</span>
          </div>
          <ul className="space-y-4">
            {CATEGORIES.map((c) => (
              <li key={c.label}>
                <div className="flex justify-between text-xs text-ink-700 mb-1">
                  <span className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ background: c.color }}
                    />
                    {c.label}
                  </span>
                  <span className="font-medium text-ink-900">{c.pct}%</span>
                </div>
                <div className="h-2.5 bg-ink-50 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${c.pct}%`,
                      background: `linear-gradient(90deg, ${c.color}, ${c.color}cc)`,
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <section className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl text-ink-900">Recent activity</h2>
            <span className="chip-success">live</span>
          </div>
          <ul className="space-y-3">
            {recent.length === 0 && (
              <li className="text-sm text-ink-400 py-4">No recent activity.</li>
            )}
            {recent.map((l) => {
              const action: keyof typeof ACTION_STYLE = l.returnedAt
                ? l.status === 'overdue'
                  ? 'late'
                  : 'return'
                : 'borrow'
              const verb = l.returnedAt
                ? l.status === 'overdue' ? 'returned late' : 'returned'
                : 'borrowed'
              const when = relativeTime(l.returnedAt ?? l.borrowedAt)
              const who = l.borrower
                ? `${l.borrower.firstName} ${l.borrower.lastName}`
                : 'Someone'
              const style = ACTION_STYLE[action]!
              return (
                <li
                  key={l.id}
                  className="flex items-center gap-3 p-3 -mx-3 rounded-lg hover:bg-parchment-50 transition-colors"
                >
                  <div
                    className="h-10 w-10 rounded-xl grid place-items-center text-xs font-semibold flex-shrink-0 relative"
                    style={{ background: style.bg, color: style.color }}
                  >
                    {who.split(' ').map((s) => s[0]).join('').slice(0, 2)}
                    <span
                      className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white"
                      style={{ background: style.dot }}
                    />
                  </div>
                  <div className="flex-1 text-sm min-w-0">
                    <div className="text-ink-900">
                      <span className="font-medium">{who}</span>{' '}
                      <span style={{ color: style.color }}>{verb}</span>
                    </div>
                    <Link
                      to={`/book/${l.book.id}`}
                      className="text-xs text-ink-500 hover:text-ink-800 truncate block"
                    >
                      {l.book.title}
                    </Link>
                  </div>
                  <span className="text-xs text-ink-400 flex-shrink-0">{when}</span>
                </li>
              )
            })}
          </ul>
        </section>

        <section className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl text-ink-900">Overdue</h2>
              <p className="text-xs text-ink-500 mt-0.5">3 readers, ₪32 in fines</p>
            </div>
            <Link
              to="/librarian/loans"
              className="text-xs text-ink-500 hover:text-ink-800 font-medium"
            >
              See all →
            </Link>
          </div>
          <ul className="space-y-3">
            {overdue.length === 0 && (
              <li className="py-4 text-center text-sm text-ink-400">No overdue loans 🎉</li>
            )}
            {overdue.map((l: Loan) => {
              const intensity = l.daysOverdue >= 7 ? 'high' : l.daysOverdue >= 4 ? 'mid' : 'low'
              const intensityStyle = {
                high: { bg: 'linear-gradient(135deg, #ef5350, #b71c1c)', text: '#fff' },
                mid: { bg: 'linear-gradient(135deg, #f0a830, #b96a05)', text: '#fff' },
                low: { bg: 'rgba(240, 168, 48, 0.2)', text: '#b96a05' },
              }[intensity]
              const who = l.borrower
                ? `${l.borrower.firstName} ${l.borrower.lastName}`
                : 'Member'
              return (
                <li
                  key={l.id}
                  className="flex items-center gap-3 p-3 -mx-3 rounded-lg hover:bg-parchment-50 transition-colors"
                >
                  <div className="relative">
                    <BookCover
                      book={{
                        id: l.book.id,
                        title: l.book.title,
                        author: l.book.author,
                        language: l.book.language,
                      }}
                      size="sm"
                    />
                    <span
                      className="absolute -top-2 -right-2 text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{ background: intensityStyle.bg, color: intensityStyle.text }}
                    >
                      {l.daysOverdue}d
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-serif text-sm text-ink-900 truncate">
                      {l.book.title}
                    </div>
                    <div className="text-xs text-ink-500 mt-0.5">{who}</div>
                    <div className="text-xs text-coral-dark font-medium mt-1">
                      ₪{l.fine} accrued
                    </div>
                  </div>
                  <button className="btn-ghost text-xs">Remind</button>
                </li>
              )
            })}
          </ul>
        </section>
      </div>
    </div>
  )
}

function Sparkline({ values, stroke }: { values: number[]; stroke: string }) {
  const w = 200
  const h = 36
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w
    const y = h - ((v - min) / range) * h
    return `${x},${y}`
  })
  const path = `M${pts.join(' L')}`
  const area = `${path} L${w},${h} L0,${h} Z`
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-9 mt-3" preserveAspectRatio="none">
      <path d={area} fill={stroke} opacity="0.25" />
      <path d={path} fill="none" stroke={stroke} strokeWidth="2" strokeLinejoin="round" />
    </svg>
  )
}

function spreadSpark(latest: number, length: number): number[] {
  // Build a gentle climb from 0 to `latest` so the sparkline isn't flat
  // until we wire real time-series data.
  return Array.from({ length }, (_, i) =>
    Math.max(0, Math.round((latest * (i + 1)) / length)),
  )
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-CA')
}

function GradientBarChart() {
  const bars = [30, 42, 38, 50, 47, 60, 55, 48, 62, 70, 65, 78, 73, 80, 76, 72, 68, 74, 78, 82, 79, 84, 80, 86, 82, 88, 85, 90, 87, 92]
  const max = Math.max(...bars)
  return (
    <div className="space-y-2">
      <div className="h-56 flex items-end gap-[3px]">
        {bars.map((v, i) => (
          <div key={i} className="flex-1 group relative flex items-end h-full">
            <div
              className="w-full rounded-t-sm transition-all hover:opacity-90"
              style={{
                height: `${(v / max) * 100}%`,
                background:
                  'linear-gradient(180deg, #1f9a72 0%, #0d4d3e 100%)',
              }}
            />
            <div className="absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-ink-900 text-parchment-50 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
              {v} loans · day {i + 1}
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-ink-400 px-1">
        <span>Apr 25</span>
        <span>May 4</span>
        <span>May 14</span>
        <span>May 24</span>
      </div>
    </div>
  )
}
