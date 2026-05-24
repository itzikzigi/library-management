import { useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { BookCover } from '../../components/BookCover'
import { BookCard } from '../../components/BookCard'
import { StarRating } from '../../components/StarRating'
import { getBook, listBooks } from '../../api/books'
import { borrowBook } from '../../api/loans'
import { deleteRating, rateBook } from '../../api/ratings'
import { reserveBook } from '../../api/reservations'
import { useAuth } from '../../lib/AuthProvider'

export function BookDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [borrowError, setBorrowError] = useState<string | null>(null)
  const auth = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()

  const bookQuery = useQuery({
    queryKey: ['book', id],
    queryFn: () => getBook(id!),
    enabled: !!id,
  })

  const borrowMutation = useMutation({
    mutationFn: borrowBook,
    onMutate: () => setBorrowError(null),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['book', id] })
      queryClient.invalidateQueries({ queryKey: ['books'] })
      queryClient.invalidateQueries({ queryKey: ['me', 'loans'] })
      navigate('/my-loans')
    },
    onError: (err) => setBorrowError(extractBorrowError(err)),
  })

  const reserveMutation = useMutation({
    mutationFn: () => reserveBook(id!),
    onMutate: () => setBorrowError(null),
    onSuccess: (reservation) => {
      queryClient.invalidateQueries({ queryKey: ['me', 'reservations'] })
      navigate('/my-loans', {
        state: { reservedQueue: reservation.queuePosition },
      })
    },
    onError: (err) => setBorrowError(extractReserveError(err)),
  })

  const rateMutation = useMutation({
    mutationFn: (value: number) => rateBook(id!, value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['book', id] })
      queryClient.invalidateQueries({ queryKey: ['books'] })
    },
  })

  const unrateMutation = useMutation({
    mutationFn: () => deleteRating(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['book', id] })
      queryClient.invalidateQueries({ queryKey: ['books'] })
    },
  })

  function onBorrowClick() {
    if (!id) return
    if (auth.status !== 'authenticated') {
      navigate('/login', { state: { from: location.pathname } })
      return
    }
    borrowMutation.mutate(id)
  }

  function onReserveClick() {
    if (!id) return
    if (auth.status !== 'authenticated') {
      navigate('/login', { state: { from: location.pathname } })
      return
    }
    reserveMutation.mutate()
  }

  function onRate(value: number) {
    if (!id) return
    if (auth.status !== 'authenticated') {
      navigate('/login', { state: { from: location.pathname } })
      return
    }
    rateMutation.mutate(value)
  }
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
            {book.available > 0 ? (
              <button
                className="btn-primary w-full"
                disabled={borrowMutation.isPending}
                onClick={onBorrowClick}
              >
                {borrowMutation.isPending ? 'Borrowing…' : 'Borrow this book'}
              </button>
            ) : (
              <button
                className="btn-primary w-full"
                disabled={reserveMutation.isPending}
                onClick={onReserveClick}
              >
                {reserveMutation.isPending ? 'Placing hold…' : 'Place on hold'}
              </button>
            )}
            {borrowError && (
              <div className="text-xs text-coral-dark bg-coral/10 border border-coral/30 rounded-md px-3 py-2">
                {borrowError}
              </div>
            )}
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
            <div className="flex items-center gap-4 flex-wrap">
              <StarRating value={book.myRating ?? 0} onChange={onRate} size={26} />
              {book.myRating !== null && (
                <>
                  <span className="text-xs text-ink-600">
                    You rated this {book.myRating}/5
                  </span>
                  <button
                    type="button"
                    className="text-xs text-ink-500 hover:text-coral-dark underline"
                    onClick={() => unrateMutation.mutate()}
                    disabled={unrateMutation.isPending}
                  >
                    {unrateMutation.isPending ? 'Removing…' : 'Remove rating'}
                  </button>
                </>
              )}
              {rateMutation.isPending && (
                <span className="text-xs text-ink-400">Saving…</span>
              )}
              {auth.status !== 'authenticated' && book.myRating === null && (
                <span className="text-xs text-ink-400">
                  <Link to="/login" className="underline">Sign in</Link> to rate
                </span>
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

      {/* similar books below */}
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

function extractBorrowError(err: unknown): string {
  if (isAxiosError(err)) {
    const code = err.response?.data?.error?.code
    const message = err.response?.data?.error?.message
    if (code === 'NO_COPY_AVAILABLE') return 'No copies are available right now.'
    if (code === 'LOAN_LIMIT_REACHED') return 'You already have the maximum active loans.'
    if (code === 'UNAUTHORIZED') return 'Please sign in to borrow.'
    if (typeof message === 'string') return message
  }
  return 'Could not borrow this book. Please try again.'
}

function extractReserveError(err: unknown): string {
  if (isAxiosError(err)) {
    const code = err.response?.data?.error?.code
    const message = err.response?.data?.error?.message
    if (code === 'ALREADY_RESERVED') return 'You already have this book on hold.'
    if (code === 'COPIES_AVAILABLE') return 'A copy is available — try borrowing.'
    if (code === 'RESERVATION_LIMIT_REACHED') return 'You have too many active holds.'
    if (typeof message === 'string') return message
  }
  return 'Could not place the hold. Please try again.'
}
