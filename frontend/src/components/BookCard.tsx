import { Link } from 'react-router-dom'
import type { Book } from '../mock/books'
import { BookCover } from './BookCover'

export function BookCard({ book }: { book: Book }) {
  const availability =
    book.available === 0
      ? { label: 'Checked out', cls: 'chip-danger' }
      : book.available < book.total
      ? { label: `${book.available} of ${book.total} available`, cls: 'chip-warn' }
      : { label: 'Available', cls: 'chip-success' }

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
        <span className="text-xs text-ink-600">★ {book.rating.toFixed(1)}</span>
        <span className={availability.cls}>{availability.label}</span>
      </div>
    </Link>
  )
}
