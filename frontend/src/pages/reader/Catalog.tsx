import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BookCard } from '../../components/BookCard'
import { listBooks, type ListParams } from '../../api/books'

const CATEGORIES = [
  'All',
  'Fiction',
  'Non-fiction',
  'שירה',
  'Philosophy',
  'Sci-Fi',
  'ספרות ישראלית',
  'Memoir',
  'Tech',
]

const SORTS = [
  { label: 'A → Z', value: 'title' },
  { label: 'Newest', value: 'newest' },
] as const

export function CatalogPage() {
  const [query, setQuery] = useState('')
  const [cat, setCat] = useState('All')
  const [sort, setSort] = useState<ListParams['sort']>('title')
  const [available, setAvailable] = useState(false)

  const params: ListParams = {
    q: query.trim() || undefined,
    category: cat !== 'All' ? cat : undefined,
    availableOnly: available || undefined,
    sort,
  }

  const { data: books, isLoading, isError, error } = useQuery({
    queryKey: ['books', params],
    queryFn: () => listBooks(params),
  })

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="flex flex-col gap-2 mb-6">
        <h1 className="text-3xl text-ink-900">Catalog</h1>
        <p className="text-sm text-ink-500">
          Browse the collection. Filter by category, search by author or title.
        </p>
      </div>

      <div className="card p-4 mb-6 flex flex-col gap-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <input
              className="input pl-9"
              placeholder="Search titles, authors…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400">⌕</span>
          </div>
          <select
            className="input md:w-56"
            value={sort}
            onChange={(e) => setSort(e.target.value as ListParams['sort'])}
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCat(c)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                cat === c
                  ? 'bg-ink-800 text-parchment-50 border-ink-800'
                  : 'bg-white border-ink-200 text-ink-700 hover:border-ink-400'
              }`}
            >
              {c}
            </button>
          ))}
          <label className="ml-auto inline-flex items-center gap-2 text-xs text-ink-600">
            <input
              type="checkbox"
              checked={available}
              onChange={(e) => setAvailable(e.target.checked)}
            />
            Available only
          </label>
        </div>
      </div>

      {isLoading && <ResultsSkeleton />}
      {isError && (
        <div className="card p-6 text-sm text-coral-dark">
          Couldn't load the catalog: {(error as Error).message}
        </div>
      )}
      {books && (
        <>
          <div className="text-xs text-ink-500 mb-3">{books.length} results</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {books.map((b) => (
              <BookCard key={b.id} book={b} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function ResultsSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="card p-4 animate-pulse">
          <div className="h-44 bg-ink-100 rounded mx-auto w-32" />
          <div className="h-4 bg-ink-100 rounded mt-4 w-3/4" />
          <div className="h-3 bg-ink-100 rounded mt-2 w-1/2" />
        </div>
      ))}
    </div>
  )
}
