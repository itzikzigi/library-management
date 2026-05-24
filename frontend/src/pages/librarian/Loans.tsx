import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BookCover } from '../../components/BookCover'
import {
  listLoans,
  returnLoan,
  type LibrarianLoansStatus,
  type Loan,
} from '../../api/loans'

const STATUS_TABS: Array<{ value: LibrarianLoansStatus; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'returned', label: 'Returned' },
]

export function LibrarianLoans() {
  const [status, setStatus] = useState<LibrarianLoansStatus>('all')
  const [q, setQ] = useState('')
  const queryClient = useQueryClient()

  const params = { status, q: q.trim() || undefined, sort: 'recent' as const, limit: 100 }
  const { data: loans = [], isLoading, isError } = useQuery({
    queryKey: ['loans', params],
    queryFn: () => listLoans(params),
  })

  const returnMutation = useMutation({
    mutationFn: returnLoan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans'] })
      queryClient.invalidateQueries({ queryKey: ['books'] })
    },
  })

  const activeCount = loans.filter((l) => l.status !== 'returned').length
  const overdueCount = loans.filter((l) => l.status === 'overdue').length

  return (
    <div className="mx-auto max-w-7xl px-6 py-8 space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl text-ink-900">Loans</h1>
          <p className="text-sm text-ink-500 mt-1">
            {activeCount} active · {overdueCount} overdue
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary">Send reminders</button>
        </div>
      </header>

      <div className="card p-4 flex gap-3 flex-wrap items-center">
        <input
          className="input flex-1 min-w-[220px]"
          placeholder="Search by member, book title…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="flex gap-1">
          {STATUS_TABS.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setStatus(t.value)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                status === t.value
                  ? 'bg-ink-800 text-parchment-50 border-ink-800'
                  : 'bg-white border-ink-200 text-ink-700 hover:border-ink-400'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {isError && (
        <div className="card p-6 text-sm text-coral-dark">Couldn't load loans.</div>
      )}

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-ink-50 text-ink-600 text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Book</th>
              <th className="text-left px-4 py-3 font-medium">Member</th>
              <th className="text-left px-4 py-3 font-medium">Borrowed</th>
              <th className="text-left px-4 py-3 font-medium">Due</th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
              <th className="text-left px-4 py-3 font-medium">Fine</th>
              <th className="text-right px-4 py-3 font-medium"> </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {isLoading && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-ink-400">
                  Loading…
                </td>
              </tr>
            )}
            {!isLoading && loans.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-ink-400">
                  No loans match these filters.
                </td>
              </tr>
            )}
            {loans.map((l) => (
              <LoanTr
                key={l.id}
                loan={l}
                onReturn={() => returnMutation.mutate(l.id)}
                returnBusy={returnMutation.isPending && returnMutation.variables === l.id}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function LoanTr({
  loan,
  onReturn,
  returnBusy,
}: {
  loan: Loan
  onReturn: () => void
  returnBusy?: boolean
}) {
  const statusChip =
    loan.status === 'overdue'
      ? 'chip-danger'
      : loan.status === 'on-loan'
      ? 'chip-success'
      : 'chip'

  return (
    <tr className="hover:bg-parchment-50">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <BookCover
            book={{
              id: loan.book.id,
              title: loan.book.title,
              author: loan.book.author,
              language: loan.book.language,
            }}
            size="sm"
          />
          <div className="font-serif text-ink-900">{loan.book.title}</div>
        </div>
      </td>
      <td className="px-4 py-3 text-ink-700">
        {loan.borrower
          ? `${loan.borrower.firstName} ${loan.borrower.lastName}`
          : '—'}
        {loan.borrower && (
          <div className="text-xs text-ink-400">{loan.borrower.email}</div>
        )}
      </td>
      <td className="px-4 py-3 text-ink-600">{formatDate(loan.borrowedAt)}</td>
      <td className="px-4 py-3 text-ink-600">{formatDate(loan.dueAt)}</td>
      <td className="px-4 py-3">
        <span className={statusChip}>{loan.status.replace('-', ' ')}</span>
      </td>
      <td className="px-4 py-3 text-ink-700">
        {loan.fine > 0 ? `₪${loan.fine.toFixed(2)}` : '—'}
      </td>
      <td className="px-4 py-3 text-right">
        {loan.status !== 'returned' && (
          <button className="btn-ghost text-xs" onClick={onReturn} disabled={returnBusy}>
            {returnBusy ? 'Returning…' : 'Mark returned'}
          </button>
        )}
      </td>
    </tr>
  )
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-CA')
}
