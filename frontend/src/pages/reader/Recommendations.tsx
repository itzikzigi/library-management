import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { BookCard } from '../../components/BookCard'
import { useAuth } from '../../lib/AuthProvider'
import {
  getRecommendations,
  type RecBook,
  type RecSection,
} from '../../api/recommendations'

export function RecommendationsPage() {
  const { user } = useAuth()
  const { data, isLoading, error } = useQuery({
    queryKey: ['recommendations'],
    queryFn: getRecommendations,
  })

  const alpha = data?.profile.alpha ?? null
  const ratingCount = data?.profile.ratingCount ?? 0
  const sections = data?.sections ?? []

  return (
    <div className="mx-auto max-w-7xl px-6 py-8 space-y-12">
      <header className="space-y-2">
        <span className="chip-accent">Personalized · hybrid algorithm</span>
        <h1 className="text-3xl text-ink-900">
          For you{user ? `, ${user.firstName}` : ''}
        </h1>
        <p className="text-sm text-ink-500 max-w-2xl">
          A hybrid of content-based similarity and what readers with taste close to
          yours have rated highly. The blend shifts toward collaborative filtering as
          you accumulate ratings.
        </p>
        <div className="flex flex-wrap gap-3 mt-3 text-xs text-ink-500">
          <span>
            Profile:{' '}
            <strong className="text-ink-800">
              {ratingCount} rating{ratingCount === 1 ? '' : 's'}
            </strong>
          </span>
          {alpha !== null && (
            <span>
              α (content / collab):{' '}
              <strong className="text-ink-800">
                {alpha.toFixed(2)} / {(1 - alpha).toFixed(2)}
              </strong>
            </span>
          )}
          <span>
            Computed: <strong className="text-ink-800">on demand</strong>
          </span>
        </div>
      </header>

      {isLoading && (
        <div className="text-sm text-ink-500">Computing recommendations…</div>
      )}

      {error && (
        <div className="card p-4 text-sm text-coral-700 bg-coral-50 border-coral-200">
          Couldn't load recommendations. Try refreshing.
        </div>
      )}

      {!isLoading && !error && ratingCount === 0 && (
        <div className="card p-5 text-sm text-ink-600 border-amber/40 bg-amber/10">
          You haven't rated anything yet — rate a few books on their detail pages
          and the personalized sections will appear. In the meantime, here's what's
          trending at the library.
        </div>
      )}

      {sections.map((section) => (
        <Section key={section.key} section={section} />
      ))}

      <aside
        className="rounded-xl p-8 text-parchment-50 relative overflow-hidden border border-ink-800"
        style={{
          background:
            'linear-gradient(135deg, #0a3a2f 0%, #7b2d8e 55%, #d6336c 100%)',
        }}
      >
        <div className="absolute -right-20 -bottom-24 w-80 h-80 rounded-full bg-amber/30 blur-3xl" />
        <div className="absolute -left-10 top-0 w-56 h-56 rounded-full bg-parchment-200/20 blur-3xl" />
        <div className="grid md:grid-cols-[1fr_auto] gap-4 items-center relative">
          <div>
            <span className="chip bg-amber/30 text-parchment-50 mb-2">✨ Beta</span>
            <h3 className="font-serif text-2xl mt-1">Describe what you're in the mood for</h3>
            <p className="text-sm text-parchment-100/80 mt-2 max-w-xl">
              Tell us in your own words. The LLM layer interprets your mood and
              finds books that fit — even if you can't name the genre.
            </p>
          </div>
          <Link to="#" className="btn-accent text-base">
            Try the mood search →
          </Link>
        </div>
      </aside>
    </div>
  )
}

function Section({ section }: { section: RecSection }) {
  if (section.items.length === 0) return null
  return (
    <section>
      <div className="flex items-end justify-between mb-4">
        <div>
          <h2 className="text-xl text-ink-900">{section.title}</h2>
          <p className="text-xs text-ink-500">{section.subtitle}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {section.items.map((item) => (
          <RecBookCard key={item.id} book={item} />
        ))}
      </div>
    </section>
  )
}

function RecBookCard({ book }: { book: RecBook }) {
  return (
    <div className="flex flex-col gap-2">
      <BookCard book={book} />
      {book.why && (
        <p className="text-[11px] text-ink-500 leading-snug px-1">{book.why}</p>
      )}
    </div>
  )
}
