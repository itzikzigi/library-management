import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BookCover } from '../../components/BookCover'
import { listMyLoans, renewLoan, type Loan } from '../../api/loans'
import {
  cancelReservation,
  listMyReservations,
  type Reservation,
} from '../../api/reservations'

export function MyLoansPage() {
  const queryClient = useQueryClient()
  const { data: loans = [], isLoading, isError } = useQuery({
    queryKey: ['me', 'loans'],
    queryFn: () => listMyLoans('all'),
  })
  const { data: reservations = [] } = useQuery({
    queryKey: ['me', 'reservations'],
    queryFn: () => listMyReservations('all'),
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['me', 'loans'] })
    queryClient.invalidateQueries({ queryKey: ['me', 'reservations'] })
    queryClient.invalidateQueries({ queryKey: ['books'] })
    queryClient.invalidateQueries({ queryKey: ['book'] })
  }

  const renewMutation = useMutation({ mutationFn: renewLoan, onSuccess: invalidate })
  const cancelHoldMutation = useMutation({
    mutationFn: cancelReservation,
    onSuccess: invalidate,
  })

  const active = loans.filter((l) => l.status !== 'returned')
  const history = loans.filter((l) => l.status === 'returned')
  const activeHolds = reservations.filter((r) => r.status === 'PENDING')
  const readyHolds = reservations.filter((r) => r.status === 'FULFILLED')

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 space-y-8">
      <header>
        <h1 className="text-3xl text-ink-900">My loans</h1>
        <p className="text-sm text-ink-500 mt-1">
          Current borrows and your full borrowing history.
        </p>
      </header>

      <div className="grid sm:grid-cols-2 gap-4">
        <Stat label="On loan" value={active.filter((l) => l.status === 'on-loan').length} />
        <Stat label="Overdue" value={active.filter((l) => l.status === 'overdue').length} tone={active.some((l) => l.status === 'overdue') ? 'warn' : 'neutral'} />
      </div>

      {isLoading && <div className="text-sm text-ink-500">Loading…</div>}
      {isError && (
        <div className="card p-6 text-sm text-coral-dark">Couldn't load your loans.</div>
      )}

      {active.length > 0 && (
        <Section title={`Currently borrowed (${active.length})`}>
          {active.map((l) => (
            <LoanRow
              key={l.id}
              loan={l}
              onRenew={() => renewMutation.mutate(l.id)}
              renewBusy={renewMutation.isPending && renewMutation.variables === l.id}
            />
          ))}
        </Section>
      )}

      {readyHolds.length > 0 && (
        <Section title={`Ready to pick up (${readyHolds.length})`}>
          {readyHolds.map((r) => (
            <HoldRow
              key={r.id}
              reservation={r}
              onCancel={() => cancelHoldMutation.mutate(r.id)}
              cancelBusy={
                cancelHoldMutation.isPending && cancelHoldMutation.variables === r.id
              }
            />
          ))}
        </Section>
      )}

      {activeHolds.length > 0 && (
        <Section title={`Active holds (${activeHolds.length})`}>
          {activeHolds.map((r) => (
            <HoldRow
              key={r.id}
              reservation={r}
              onCancel={() => cancelHoldMutation.mutate(r.id)}
              cancelBusy={
                cancelHoldMutation.isPending && cancelHoldMutation.variables === r.id
              }
            />
          ))}
        </Section>
      )}

      {history.length > 0 && (
        <Section title={`History (${history.length})`} muted>
          {history.map((l) => (
            <LoanRow key={l.id} loan={l} />
          ))}
        </Section>
      )}

      {!isLoading && loans.length === 0 && (
        <div className="card p-8 text-center text-sm text-ink-500">
          No loans yet.{' '}
          <Link to="/" className="text-ink-800 underline">Browse the catalog</Link> to get started.
        </div>
      )}
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

type RowProps = {
  loan: Loan
  onRenew?: () => void
  renewBusy?: boolean
}

function LoanRow({ loan, onRenew, renewBusy }: RowProps) {
  const statusChip =
    loan.status === 'overdue'
      ? 'chip-danger'
      : loan.status === 'on-loan'
      ? 'chip-success'
      : 'chip'

  const dueText =
    loan.status === 'returned'
      ? `Returned ${formatDate(loan.returnedAt!)}`
      : loan.status === 'overdue'
      ? `${loan.daysOverdue} days overdue`
      : `${loan.daysUntilDue} days remaining`

  return (
    <div className="flex items-center gap-4 p-4">
      <Link to={`/book/${loan.book.id}`}>
        <BookCover
          book={{
            id: loan.book.id,
            title: loan.book.title,
            author: loan.book.author,
            language: loan.book.language,
          }}
          size="sm"
        />
      </Link>
      <div className="flex-1 min-w-0">
        <Link
          to={`/book/${loan.book.id}`}
          className="font-serif text-ink-900 hover:underline"
        >
          {loan.book.title}
        </Link>
        <p className="text-xs text-ink-500">{loan.book.author}</p>
        <p className="text-xs text-ink-500 mt-1">
          Borrowed {formatDate(loan.borrowedAt)} · Due {formatDate(loan.dueAt)} ·{' '}
          {dueText}
        </p>
      </div>
      <span className={statusChip}>{loan.status.replace('-', ' ')}</span>
      <div className="flex gap-2">
        {loan.canRenew && onRenew && (
          <button
            type="button"
            className="btn-secondary"
            onClick={onRenew}
            disabled={renewBusy}
          >
            {renewBusy ? 'Renewing…' : `Renew (${loan.renewals}/2)`}
          </button>
        )}
      </div>
    </div>
  )
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-CA') // YYYY-MM-DD
}

function HoldRow({
  reservation,
  onCancel,
  cancelBusy,
}: {
  reservation: Reservation
  onCancel: () => void
  cancelBusy?: boolean
}) {
  const isReady = reservation.status === 'FULFILLED'
  const chip = isReady ? 'chip-success' : 'chip-accent'
  const chipLabel = isReady ? 'ready' : 'on hold'
  const detail = isReady
    ? `Ready as of ${formatDate(reservation.fulfilledAt ?? reservation.createdAt)} — please visit the library`
    : reservation.queuePosition !== null
    ? `Queue position #${reservation.queuePosition} · placed ${formatDate(reservation.createdAt)}`
    : `Placed ${formatDate(reservation.createdAt)}`

  return (
    <div className="flex items-center gap-4 p-4">
      <Link to={`/book/${reservation.book.id}`}>
        <BookCover
          book={{
            id: reservation.book.id,
            title: reservation.book.title,
            author: reservation.book.author,
            language: reservation.book.language,
          }}
          size="sm"
        />
      </Link>
      <div className="flex-1 min-w-0">
        <Link
          to={`/book/${reservation.book.id}`}
          className="font-serif text-ink-900 hover:underline"
        >
          {reservation.book.title}
        </Link>
        <p className="text-xs text-ink-500">{reservation.book.author}</p>
        <p className="text-xs text-ink-500 mt-1">{detail}</p>
      </div>
      <span className={chip}>{chipLabel}</span>
      <div className="flex gap-2">
        {isReady && (
          <Link className="btn-primary" to={`/book/${reservation.book.id}`}>
            Borrow now
          </Link>
        )}
        <button
          type="button"
          className="btn-ghost"
          onClick={onCancel}
          disabled={cancelBusy}
        >
          {cancelBusy ? 'Cancelling…' : 'Cancel hold'}
        </button>
      </div>
    </div>
  )
}
