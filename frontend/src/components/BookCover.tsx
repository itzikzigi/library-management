import type { Book } from '../mock/books'

type Props = {
  book: Pick<Book, 'title' | 'author' | 'cover' | 'language'>
  size?: 'sm' | 'md' | 'lg'
}

const SIZES: Record<NonNullable<Props['size']>, string> = {
  sm: 'h-28 w-20 text-[10px]',
  md: 'h-44 w-32 text-xs',
  lg: 'h-72 w-52 text-sm',
}

export function BookCover({ book, size = 'md' }: Props) {
  const dir = book.language === 'he' ? 'rtl' : 'ltr'
  return (
    <div
      className={`${SIZES[size]} relative shrink-0 rounded-r-md rounded-l-sm shadow-book overflow-hidden`}
      style={{
        background: `linear-gradient(135deg, ${book.cover.from} 0%, ${book.cover.to} 100%)`,
      }}
      dir={dir}
    >
      <div className="absolute inset-0 p-3 flex flex-col justify-between text-parchment-50">
        <div className="font-serif leading-tight line-clamp-4 drop-shadow-sm">
          {book.title}
        </div>
        <div className="opacity-80 text-[0.85em] truncate">{book.author}</div>
      </div>
      <div className="absolute left-0 top-0 h-full w-[3px] bg-black/30" />
    </div>
  )
}
