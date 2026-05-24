import { Link } from 'react-router-dom'
import { findBook } from '../../mock/books'
import { BookCover } from '../../components/BookCover'

type Loan = {
  bookId: string
  borrowed: string
  due: string
  status: 'on-loan' | 'overdue' | 'returned' | 'reserved'
  renewable?: boolean
}

const CURRENT: Loan[] = [
  { bookId: 'b-002', borrowed: '2026-05-10', due: '2026-05-31', status: 'on-loan', renewable: true },
  { bookId: 'b-008', borrowed: '2026-04-25', due: '2026-05-16', status: 'overdue' },
]
const RESERVED: Loan[] = [
  { bookId: 'b-006', borrowed: '—', due: 'queue #2', status: 'reserved' },
]
const HISTORY: Loan[] = [
  { bookId: 'b-005', borrowed: '2026-03-02', due: '2026-03-23', status: 'returned' },
  { bookId: 'b-010', borrowed: '2026-02-01', due: '2026-02-22', status: 'returned' },
  { bookId: 'b-001', borrowed: '2025-12-14', due: '2026-01-04', status: 'returned' },
]

const FINE = 4.5

export function MyLoansPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-8 space-y-8">
      <header>
        <h1 className="text-3xl text-ink-900">My loans</h1>
        <p className="text-sm text-ink-500 mt-1">
          Current borrows, reservations, and your borrowing history.
        </p>
      </header>

      <div className="grid sm:grid-cols-3 gap-4">
        <Stat label="On loan" value={CURRENT.length} />
        <Stat label="Reserved" value={RESERVED.length} />
        <Stat
          label="Outstanding fines"
          value={`₪${FINE.toFixed(2)}`}
          tone={FINE > 0 ? 'warn' : 'neutral'}
        />
      </div>

      <Section title={`Currently borrowed (${CURRENT.length})`}>
        {CURRENT.map((l) => (
          <LoanRow key={l.bookId} loan={l} />
        ))}
      </Section>

      <Section title={`Reservations (${RESERVED.length})`}>
        {RESERVED.map((l) => (
          <LoanRow key={l.bookId} loan={l} />
        ))}
      </Section>

      <Section title={`History (${HISTORY.length})`} muted>
        {HISTORY.map((l) => (
          <LoanRow key={l.bookId + l.borrowed} loan={l} />
        ))}
      </Section>
    </div>
  )
}

function Section({
  title,
  children,
  muted,
}: {
  title: string
  children: React.ReactNode
  muted?: boolean
}) {
  return (
    <section>
      <h2 className={`text-lg mb-3 ${muted ? 'text-ink-500' : 'text-ink-900'}`}>{title}</h2>
      <div className="card divide-y divide-ink-100">{children}</div>
    </section>
  )
}

function Stat({
  label,
  value,
  tone = 'neutral',
}: {
  label: string
  value: string | number
  tone?: 'neutral' | 'warn'
}) {
  return (
    <div className="card p-5">
      <div className="text-xs text-ink-500">{label}</div>
      <div className={`text-2xl mt-1 ${tone === 'warn' ? 'text-amber-dark' : 'text-ink-900'}`}>
        {value}
      </div>
    </div>
  )
}

function LoanRow({ loan }: { loan: Loan }) {
  const book = findBook(loan.bookId)
  if (!book) return null
  const statusChip =
    loan.status === 'overdue'
      ? 'chip-danger'
      : loan.status === 'on-loan'
      ? 'chip-success'
      : loan.status === 'reserved'
      ? 'chip-warn'
      : 'chip'
  return (
    <div className="flex items-center gap-4 p-4">
      <Link to={`/book/${book.id}`}>
        <BookCover book={book} size="sm" />
      </Link>
      <div className="flex-1 min-w-0">
        <Link to={`/book/${book.id}`} className="font-serif text-ink-900 hover:underline">
          {book.title}
        </Link>
        <p className="text-xs text-ink-500">{book.author}</p>
        <p className="text-xs text-ink-500 mt-1">
          Borrowed {loan.borrowed} · Due {loan.due}
        </p>
      </div>
      <span className={statusChip}>{loan.status.replace('-', ' ')}</span>
      <div className="flex gap-2">
        {loan.status === 'on-loan' && loan.renewable && (
          <button className="btn-secondary">Renew</button>
        )}
        {loan.status === 'on-loan' && <button className="btn-ghost">Return</button>}
        {loan.status === 'overdue' && <button className="btn-primary">Return now</button>}
        {loan.status === 'reserved' && <button className="btn-ghost">Cancel</button>}
        {loan.status === 'returned' && <button className="btn-ghost">Rate</button>}
      </div>
    </div>
  )
}
