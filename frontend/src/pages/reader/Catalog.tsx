import { useMemo, useState } from 'react'
import { BOOKS } from '../../mock/books'
import { BookCard } from '../../components/BookCard'

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

const SORTS = ['Most relevant', 'Highest rated', 'Newest', 'Recently added'] as const
type Sort = (typeof SORTS)[number]

export function CatalogPage() {
  const [query, setQuery] = useState('')
  const [cat, setCat] = useState('All')
  const [sort, setSort] = useState<Sort>('Most relevant')
  const [available, setAvailable] = useState(false)

  const list = useMemo(() => {
    let xs = BOOKS
    if (query) {
      const q = query.toLowerCase()
      xs = xs.filter(
        (b) => b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q),
      )
    }
    if (cat !== 'All') xs = xs.filter((b) => b.categories.includes(cat))
    if (available) xs = xs.filter((b) => b.available > 0)
    if (sort === 'Highest rated') xs = [...xs].sort((a, b) => b.rating - a.rating)
    if (sort === 'Newest') xs = [...xs].sort((a, b) => b.year - a.year)
    return xs
  }, [query, cat, sort, available])

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="flex flex-col gap-2 mb-6">
        <h1 className="text-3xl text-ink-900">Catalog</h1>
        <p className="text-sm text-ink-500">
          Browse {BOOKS.length} titles. Filter by category, search by author or title.
        </p>
      </div>

      <div className="card p-4 mb-6 flex flex-col gap-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <input
              className="input pl-9"
              placeholder="Search titles, authors, tags…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400">⌕</span>
          </div>
          <select
            className="input md:w-56"
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
          >
            {SORTS.map((s) => (
              <option key={s}>{s}</option>
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

      <div className="text-xs text-ink-500 mb-3">{list.length} results</div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {list.map((b) => (
          <BookCard key={b.id} book={b} />
        ))}
      </div>
    </div>
  )
}
