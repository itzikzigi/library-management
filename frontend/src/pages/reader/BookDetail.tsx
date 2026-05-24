import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { BookCover } from '../../components/BookCover'
import { BookCard } from '../../components/BookCard'
import { StarRating } from '../../components/StarRating'
import { getBook, listBooks } from '../../api/books'

export function BookDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [userRating, setUserRating] = useState(0)

  const bookQuery = useQuery({
    queryKey: ['book', id],
    queryFn: () => getBook(id!),
    enabled: !!id,
  })
  const allBooksQuery = useQuery({
    queryKey: ['books', {}],
    queryFn: () => listBooks({}),
    staleTime: 60_000,
  })

  if (bookQuery.isLoading) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-12">
        <div className="animate-pulse space-y-4">
          <div className="h-72 w-52 bg-ink-100 rounded" />
          <div className="h-10 bg-ink-100 rounded w-2/3" />
          <div className="h-4 bg-ink-100 rounded w-1/3" />
        </div>
      </div>
    )
  }

  if (bookQuery.isError || !bookQuery.data) {
    return (
      <div className="mx-auto max-w-3xl p-8">
        <p className="text-coral-dark">Book not found.</p>
        <Link to="/" className="btn-secondary mt-4 inline-flex">
          Back to catalog
        </Link>
      </div>
    )
  }

  const book = bookQuery.data
  const similar =
    (allBooksQuery.data ?? [])
      .filter((b) => b.id !== book.id && b.categories.some((c) => book.categories.includes(c)))
      .slice(0, 4)

  const availability =
    book.available === 0
      ? { cls: 'chip-danger', label: `Checked out · ${book.total} copies` }
      : { cls: 'chip-success', label: `${book.available} of ${book.total} available` }

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <Link to="/" className="text-sm text-ink-500 hover:text-ink-800">
        ← Back to catalog
      </Link>

      <div className="grid lg:grid-cols-[auto_1fr] gap-10 mt-6">
        <div className="flex flex-col items-center gap-4">
          <BookCover book={book} size="lg" />
          <div className="space-y-2 w-full">
            <button className="btn-primary w-full" disabled={book.available === 0}>
              {book.available > 0 ? 'Borrow this book' : 'Place on hold'}
            </button>
            <button className="btn-secondary w-full">Add to wishlist</button>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <div className="flex flex-wrap gap-2 mb-3">
              {book.categories.map((c) => (
                <span key={c} className="chip-accent">{c}</span>
              ))}
            </div>
            <h1 className="text-4xl text-ink-900">{book.title}</h1>
            <p className="text-ink-500 mt-1">
              {book.author} · {book.year ?? '—'} ·{' '}
              {book.language === 'HE' ? 'Hebrew' : 'English'}
            </p>
            <div className="flex items-center gap-3 mt-4">
              <StarRating value={book.rating ?? 0} />
              <span className="text-sm text-ink-600">
                {book.rating !== null
                  ? `${book.rating.toFixed(1)} · ${book.ratingsCount} ratings`
                  : 'No ratings yet'}
              </span>
              <span className={availability.cls}>{availability.label}</span>
            </div>
          </div>

          {book.blurb && (
            <p className="text-ink-700 leading-relaxed max-w-prose">{book.blurb}</p>
          )}

          <div className="card p-5 max-w-prose">
            <h3 className="text-sm font-medium text-ink-800 mb-2">Rate this book</h3>
            <p className="text-xs text-ink-500 mb-3">
              Your ratings feed the recommender. Five stars from you boosts similar
              titles for readers with similar taste.
            </p>
            <div className="flex items-center gap-4">
              <StarRating value={userRating} onChange={setUserRating} size={26} />
              {userRating > 0 && (
                <span className="text-xs text-ink-600">You rated this {userRating}/5</span>
              )}
            </div>
          </div>

          {book.tags.length > 0 && (
            <div>
              <div className="text-xs text-ink-500 mb-2">Tags</div>
              <div className="flex flex-wrap gap-2">
                {book.tags.map((t) => (
                  <span key={t} className="chip">#{t}</span>
                ))}
              </div>
            </div>
          )}

          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <dt className="text-xs text-ink-500">ISBN</dt>
              <dd className="text-ink-800">{book.isbn ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-500">Shelf</dt>
              <dd className="text-ink-800">{book.shelfCode ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-500">Loan period</dt>
              <dd className="text-ink-800">21 days</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-500">Format</dt>
              <dd className="text-ink-800">Hardcover</dd>
            </div>
          </dl>
        </div>
      </div>

      {similar.length > 0 && (
        <section className="mt-12">
          <div className="flex items-end justify-between mb-4">
            <div>
              <h2 className="text-xl text-ink-900">Similar books</h2>
              <p className="text-xs text-ink-500">
                Content-based — same categories &amp; tags as <em>{book.title}</em>.
              </p>
            </div>
            <Link to="/recommendations" className="text-sm text-ink-500 hover:text-ink-800">
              See all recommendations →
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {similar.map((b) => (
              <BookCard key={b.id} book={b} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
