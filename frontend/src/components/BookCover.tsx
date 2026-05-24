import { coverFor } from '../lib/coverFor'

export type BookCoverInput = {
  id: string
  title: string
  author: string
  language?: 'HE' | 'EN' | 'he' | 'en' | null
  cover?: { from: string; to: string }
}

type Props = {
  book: BookCoverInput
  size?: 'sm' | 'md' | 'lg'
}

const SIZES: Record<NonNullable<Props['size']>, string> = {
  sm: 'h-28 w-20 text-[10px]',
  md: 'h-44 w-32 text-xs',
  lg: 'h-72 w-52 text-sm',
}

export function BookCover({ book, size = 'md' }: Props) {
  const cover = book.cover ?? coverFor(book.id)
  const lang = book.language?.toLowerCase()
  const dir = lang === 'he' ? 'rtl' : 'ltr'
  return (
    <div
      className={`${SIZES[size]} relative shrink-0 rounded-r-md rounded-l-sm shadow-book overflow-hidden`}
      style={{
        background: `linear-gradient(135deg, ${cover.from} 0%, ${cover.to} 100%)`,
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
