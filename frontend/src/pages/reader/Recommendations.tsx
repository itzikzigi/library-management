import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { BookCard } from '../../components/BookCard'
import { listBooks, type CatalogBook } from '../../api/books'

export function RecommendationsPage() {
  const { data: books = [], isLoading } = useQuery({
    queryKey: ['books', {}],
    queryFn: () => listBooks({}),
  })

  // Placeholder slicing until the real recommender endpoint exists.
  // The hybrid algorithm (chapter 10) will replace these with scored sets.
  const becauseYouLiked = pickSlice(books, 0, 4)
  const similarReaders = pickSlice(books, 3, 7)
  const trending = pickSlice(books, 7, 10)
  const hiddenGems = pickSlice(books, 9, 11)

  return (
    <div className="mx-auto max-w-7xl px-6 py-8 space-y-12">
      <header className="space-y-2">
        <span className="chip-accent">Personalized · updated daily</span>
        <h1 className="text-3xl text-ink-900">For you, Yael</h1>
        <p className="text-sm text-ink-500 max-w-2xl">
          A hybrid of content-based similarity and what readers with taste close to
          yours have rated highly. The blend shifts toward collaborative filtering as
          you accumulate ratings.
        </p>
        <div className="flex gap-3 mt-3 text-xs text-ink-500">
          <span>Profile: <strong className="text-ink-800">5 ratings</strong></span>
          <span>α (content / collab): <strong className="text-ink-800">0.78 / 0.22</strong></span>
          <span>Last refresh: <strong className="text-ink-800">today, 06:00</strong></span>
        </div>
      </header>

      {isLoading && (
        <div className="text-sm text-ink-500">Loading recommendations…</div>
      )}

      <Section
        title="Because you liked The Name of the Wind"
        subtitle="Content-based — similar categories, era, and tags."
      >
        {becauseYouLiked.map((b) => (
          <BookCard key={b.id} book={b} />
        ))}
      </Section>

      <Section
        title="Readers with taste like yours also enjoyed"
        subtitle="Item-item collaborative filtering on the ratings matrix."
      >
        {similarReaders.map((b) => (
          <BookCard key={b.id} book={b} />
        ))}
      </Section>

      <Section
        title="Trending at your library this month"
        subtitle="Popularity baseline — used as fallback for cold-start readers."
      >
        {trending.map((b) => (
          <BookCard key={b.id} book={b} />
        ))}
      </Section>

      <Section
        title="Hidden gems for you"
        subtitle="High signal from few raters who match your profile."
      >
        {hiddenGems.map((b) => (
          <BookCard key={b.id} book={b} />
        ))}
      </Section>

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

function pickSlice(books: CatalogBook[], from: number, to: number) {
  return books.slice(from, Math.min(to, books.length))
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children: React.ReactNode
}) {
  return (
    <section>
      <div className="flex items-end justify-between mb-4">
        <div>
          <h2 className="text-xl text-ink-900">{title}</h2>
          <p className="text-xs text-ink-500">{subtitle}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">{children}</div>
    </section>
  )
}
