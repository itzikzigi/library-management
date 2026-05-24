import { findBook } from '../../mock/books'
import { BookCover } from '../../components/BookCover'

type LoanRow = {
  id: string
  bookId: string
  member: string
  borrowed: string
  due: string
  status: 'on-loan' | 'overdue' | 'returned'
}

const LOANS: LoanRow[] = [
  { id: 'l-101', bookId: 'b-002', member: 'Yael Shalev', borrowed: '2026-05-10', due: '2026-05-31', status: 'on-loan' },
  { id: 'l-102', bookId: 'b-008', member: 'Noa Adler', borrowed: '2026-04-25', due: '2026-05-16', status: 'overdue' },
  { id: 'l-103', bookId: 'b-002', member: 'Idan Peretz', borrowed: '2026-05-04', due: '2026-05-19', status: 'overdue' },
  { id: 'l-104', bookId: 'b-006', member: 'Tamar Hen', borrowed: '2026-05-08', due: '2026-05-21', status: 'overdue' },
  { id: 'l-105', bookId: 'b-005', member: 'Daniel Cohen', borrowed: '2026-05-12', due: '2026-06-02', status: 'on-loan' },
  { id: 'l-106', bookId: 'b-011', member: 'Eitan Bar', borrowed: '2026-05-14', due: '2026-06-04', status: 'on-loan' },
  { id: 'l-107', bookId: 'b-010', member: 'Maya Levi', borrowed: '2026-05-18', due: '2026-06-08', status: 'on-loan' },
]

export function LibrarianLoans() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-8 space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl text-ink-900">Loans</h1>
          <p className="text-sm text-ink-500 mt-1">
            {LOANS.filter((l) => l.status === 'on-loan').length} active ·{' '}
            {LOANS.filter((l) => l.status === 'overdue').length} overdue
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary">Send reminders</button>
          <button className="btn-primary">+ New loan</button>
        </div>
      </header>

      <div className="card p-4 flex gap-3 flex-wrap">
        <input className="input flex-1 min-w-[200px]" placeholder="Search by member, book, loan #…" />
        <select className="input md:w-40">
          <option>All statuses</option>
          <option>On loan</option>
          <option>Overdue</option>
          <option>Returned</option>
        </select>
        <input type="date" className="input md:w-40" />
        <input type="date" className="input md:w-40" />
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-ink-50 text-ink-600 text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Loan</th>
              <th className="text-left px-4 py-3 font-medium">Book</th>
              <th className="text-left px-4 py-3 font-medium">Member</th>
              <th className="text-left px-4 py-3 font-medium">Borrowed</th>
              <th className="text-left px-4 py-3 font-medium">Due</th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
              <th className="text-right px-4 py-3 font-medium"> </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {LOANS.map((l) => {
              const book = findBook(l.bookId)
              return (
                <tr key={l.id} className="hover:bg-parchment-50">
                  <td className="px-4 py-3 font-mono text-xs text-ink-500">{l.id}</td>
                  <td className="px-4 py-3">
                    {book && (
                      <div className="flex items-center gap-3">
                        <BookCover book={book} size="sm" />
                        <div className="font-serif text-ink-900">{book.title}</div>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-ink-700">{l.member}</td>
                  <td className="px-4 py-3 text-ink-600">{l.borrowed}</td>
                  <td className="px-4 py-3 text-ink-600">{l.due}</td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        l.status === 'overdue'
                          ? 'chip-danger'
                          : l.status === 'on-loan'
                          ? 'chip-success'
                          : 'chip'
                      }
                    >
                      {l.status.replace('-', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button className="btn-ghost text-xs">Mark returned</button>
                    <button className="btn-ghost text-xs">Renew</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
