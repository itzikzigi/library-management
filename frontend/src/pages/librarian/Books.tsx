import { useQuery } from '@tanstack/react-query'
import { listBooks } from '../../api/books'

export function LibrarianBooks() {
  const { data: books = [], isLoading, isError } = useQuery({
    queryKey: ['books', {}],
    queryFn: () => listBooks({}),
  })

  return (
    <div className="mx-auto max-w-7xl px-6 py-8 space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl text-ink-900">Books</h1>
          <p className="text-sm text-ink-500 mt-1">
            {isLoading ? 'Loading…' : `${books.length} titles in catalog`}
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary">Import CSV</button>
          <button className="btn-primary">+ Add book</button>
        </div>
      </header>

      <div className="card p-4 flex flex-col md:flex-row gap-3">
        <input className="input flex-1" placeholder="Search by title, author, ISBN…" />
        <select className="input md:w-44">
          <option>All categories</option>
          <option>Fiction</option>
          <option>Non-fiction</option>
          <option>שירה</option>
        </select>
        <select className="input md:w-44">
          <option>All languages</option>
          <option>Hebrew</option>
          <option>English</option>
        </select>
      </div>

      {isError && (
        <div className="card p-6 text-sm text-coral-dark">
          Couldn't load the catalog.
        </div>
      )}

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-ink-50 text-ink-600 text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Title</th>
              <th className="text-left px-4 py-3 font-medium">Author</th>
              <th className="text-left px-4 py-3 font-medium">Categories</th>
              <th className="text-left px-4 py-3 font-medium">Lang</th>
              <th className="text-left px-4 py-3 font-medium">Year</th>
              <th className="text-left px-4 py-3 font-medium">Copies</th>
              <th className="text-left px-4 py-3 font-medium">Rating</th>
              <th className="text-right px-4 py-3 font-medium"> </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {books.map((b) => (
              <tr key={b.id} className="hover:bg-parchment-50">
                <td className="px-4 py-3 font-serif text-ink-900">{b.title}</td>
                <td className="px-4 py-3 text-ink-600">{b.author}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {b.categories.slice(0, 2).map((c) => (
                      <span key={c} className="chip">{c}</span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 text-ink-600">{b.language}</td>
                <td className="px-4 py-3 text-ink-600">{b.year ?? '—'}</td>
                <td className="px-4 py-3">
                  <span
                    className={
                      b.available === 0
                        ? 'chip-danger'
                        : b.available < b.total
                        ? 'chip-warn'
                        : 'chip-success'
                    }
                  >
                    {b.available}/{b.total}
                  </span>
                </td>
                <td className="px-4 py-3 text-ink-700">
                  {b.rating !== null ? `★ ${b.rating.toFixed(1)}` : '—'}
                </td>
                <td className="px-4 py-3 text-right">
                  <button className="btn-ghost text-xs">Edit</button>
                  <button className="btn-ghost text-xs text-rose-600">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex items-center justify-between p-4 text-xs text-ink-500 border-t border-ink-100">
          <div>
            Showing {books.length} of {books.length}
          </div>
          <div className="flex gap-1">
            <button className="btn-ghost text-xs" disabled>
              ← Prev
            </button>
            <button className="btn-ghost text-xs">Next →</button>
          </div>
        </div>
      </div>
    </div>
  )
}
