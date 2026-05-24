import { Link } from 'react-router-dom'
import { BookCover, type BookCoverInput } from './BookCover'

export type BookCardInput = BookCoverInput & {
  rating?: number | null
  total: number
  available: number
}

export function BookCard({ book }: { book: BookCardInput }) {
  const availability =
    book.available === 0
      ? { label: 'Checked out', cls: 'chip-danger' }
      : book.available < book.total
      ? { label: `${book.available} of ${book.total} available`, cls: 'chip-warn' }
      : { label: 'Available', cls: 'chip-success' }

  const ratingLabel =
    typeof book.rating === 'number' ? `★ ${book.rating.toFixed(1)}` : '★ —'

  return (
    <Link
      to={`/book/${book.id}`}
      className="card p-4 flex flex-col gap-3 hover:shadow-lg transition-shadow"
    >
      <div className="flex justify-center pt-2">
        <BookCover book={book} size="md" />
      </div>
      <div className="flex-1">
        <h3 className="font-serif text-base leading-snug line-clamp-2 text-ink-900">
          {book.title}
        </h3>
        <p className="text-xs text-ink-500 mt-1">{book.author}</p>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-ink-600">{ratingLabel}</span>
        <span className={availability.cls}>{availability.label}</span>
      </div>
    </Link>
  )
}
