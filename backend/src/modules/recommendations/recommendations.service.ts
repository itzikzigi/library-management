import { prisma } from '../../lib/prisma.js'
import {
  alphaFor,
  buildUserProfile,
  cfScore,
  contentScore,
  cosineMaps,
  featureTokens,
  hybridScore,
  normalizeCf,
  type BookFeatures,
  type CfResult,
  type ItemRating,
  type RatingsByBook,
  type UserRating,
} from './recommender.js'

const SECTION_SIZE = 4
const HIDDEN_GEM_MAX_RATINGS = 3
const TRENDING_WINDOW_DAYS = 60

type CandidateScore = {
  bookId: string
  content: number
  cf: CfResult | null
  cfNormalized: number | null
  hybrid: number
  /** "because you liked …" — the user-rated book that most explains this rec. */
  whyBookId: string | null
  whySource: 'content' | 'cf' | null
}

type SectionItem = {
  /** Book DTO matching the catalog shape, plus the score breakdown. */
  id: string
  isbn: string | null
  title: string
  author: string
  year: number | null
  language: string
  blurb: string | null
  shelfCode: string | null
  categories: string[]
  tags: string[]
  total: number
  available: number
  rating: number | null
  ratingsCount: number
  score: number
  contentScore: number
  cfScore: number | null
  why: string | null
}

type Section = {
  key: 'because-you-liked' | 'similar-readers' | 'trending' | 'hidden-gems'
  title: string
  subtitle: string
  items: SectionItem[]
}

export type RecommendationsResponse = {
  profile: {
    ratingCount: number
    alpha: number
  }
  sections: Section[]
}

/**
 * Build recommendations for a user. Reads:
 *   - books + author + categories + tags + copies + ratings (catalog query)
 *   - all Rating rows (for the user-rating matrix used by CF)
 *   - the user's ratings
 *   - recent loans (for trending)
 *
 * Then runs the recommender from `./recommender.ts` over the in-memory
 * data. For 12 books × ~30 ratings this is microseconds; if the catalog
 * ever grows past a few thousand books we'd cache item-item sims (ADR-0003).
 */
export async function getRecommendations(userId: string): Promise<RecommendationsResponse> {
  const [books, allRatings, userRatingRows, recentLoanRows] = await Promise.all([
    prisma.book.findMany({
      include: {
        author: true,
        categories: true,
        tags: true,
        copies: { select: { status: true } },
        ratings: { select: { value: true } },
      },
    }),
    prisma.rating.findMany({ select: { userId: true, bookId: true, value: true } }),
    prisma.rating.findMany({
      where: { userId },
      select: { bookId: true, value: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.loan.findMany({
      where: {
        borrowedAt: { gte: daysAgo(TRENDING_WINDOW_DAYS) },
      },
      include: { copy: { select: { bookId: true } } },
    }),
  ])

  // Build the lookup maps.
  const bookFeatures = new Map<string, BookFeatures>()
  const bookCatalog = new Map<string, Omit<SectionItem, 'score' | 'contentScore' | 'cfScore' | 'why'>>()
  for (const b of books) {
    bookFeatures.set(b.id, {
      id: b.id,
      categories: b.categories.map((c) => c.name),
      tags: b.tags.map((t) => t.name),
      authorName: b.author.name,
      language: b.language,
    })
    const total = b.copies.length
    const available = b.copies.filter((c) => c.status === 'AVAILABLE').length
    const ratingCount = b.ratings.length
    const avg =
      ratingCount > 0
        ? Number((b.ratings.reduce((s, r) => s + r.value, 0) / ratingCount).toFixed(2))
        : null
    bookCatalog.set(b.id, {
      id: b.id,
      isbn: b.isbn,
      title: b.title,
      author: b.author.name,
      year: b.year,
      language: b.language,
      blurb: b.blurb,
      shelfCode: b.shelfCode,
      categories: b.categories.map((c) => c.name),
      tags: b.tags.map((t) => t.name),
      total,
      available,
      rating: avg,
      ratingsCount: ratingCount,
    })
  }

  const ratingsByBook: RatingsByBook = new Map()
  for (const r of allRatings) {
    const arr = ratingsByBook.get(r.bookId)
    const entry: ItemRating = { userId: r.userId, value: r.value }
    if (arr) arr.push(entry)
    else ratingsByBook.set(r.bookId, [entry])
  }

  const userRatings: UserRating[] = userRatingRows.map((r) => ({ bookId: r.bookId, value: r.value }))
  const ratedSet = new Set(userRatings.map((r) => r.bookId))

  const profile = buildUserProfile(userRatings, bookFeatures)
  const alpha = alphaFor(userRatings.length)

  // Score every candidate (every book the user has not yet rated).
  const candidates: CandidateScore[] = []
  for (const [bookId, feat] of bookFeatures) {
    if (ratedSet.has(bookId)) continue
    const c = contentScore(feat, profile)
    const cf = cfScore(bookId, userRatings, ratingsByBook)
    const cfNorm = cf ? normalizeCf(cf.value) : null
    const hybrid = hybridScore(c, cfNorm, alpha)
    const { whyBookId, whySource } = pickWhy(feat, cf, userRatings, bookFeatures)
    candidates.push({
      bookId,
      content: c,
      cf,
      cfNormalized: cfNorm,
      hybrid,
      whyBookId,
      whySource,
    })
  }

  // Trending: most-borrowed in the last window, excluding books the user
  // has already rated. Cold-start readers see this as their main signal.
  const loanCountByBook = new Map<string, number>()
  for (const l of recentLoanRows) {
    const bid = l.copy.bookId
    loanCountByBook.set(bid, (loanCountByBook.get(bid) ?? 0) + 1)
  }
  const trendingCandidates = [...bookCatalog.keys()]
    .filter((bid) => !ratedSet.has(bid))
    .map((bid) => ({ bid, count: loanCountByBook.get(bid) ?? 0 }))
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count
      // tiebreaker: more-rated books rise.
      const ra = bookCatalog.get(a.bid)!.ratingsCount
      const rb = bookCatalog.get(b.bid)!.ratingsCount
      return rb - ra
    })

  // -------- Section assembly --------
  const sections: Section[] = []

  // "Because you liked X" — content-driven recs. Skip for cold-start.
  if (userRatings.length > 0) {
    const topRated = pickTopRatedBook(userRatings)
    const topRatedTitle = topRated ? bookCatalog.get(topRated.bookId)?.title : null
    const items = [...candidates]
      .sort((a, b) => b.content - a.content)
      .slice(0, SECTION_SIZE)
      .map((c) => toSectionItem(c, bookCatalog))
    sections.push({
      key: 'because-you-liked',
      title: topRatedTitle ? `Because you liked ${topRatedTitle}` : 'Because of what you liked',
      subtitle: 'Content-based — similar categories, author, language, and tags.',
      items,
    })
  }

  // "Readers with taste like yours" — CF-driven. Skip if no CF signal exists.
  const cfCandidates = candidates.filter((c) => c.cf !== null)
  if (cfCandidates.length > 0) {
    const items = cfCandidates
      .sort((a, b) => (b.cf!.value - a.cf!.value))
      .slice(0, SECTION_SIZE)
      .map((c) => toSectionItem(c, bookCatalog))
    sections.push({
      key: 'similar-readers',
      title: 'Readers with taste like yours also enjoyed',
      subtitle: 'Item-item collaborative filtering on the ratings matrix.',
      items,
    })
  }

  // "Trending" — always present; popularity baseline / cold-start fallback.
  sections.push({
    key: 'trending',
    title: 'Trending at your library this month',
    subtitle: 'Popularity baseline — the cold-start fallback.',
    items: trendingCandidates.slice(0, SECTION_SIZE).map((t) => {
      const cand = candidates.find((c) => c.bookId === t.bid)
      // For trending we may include books with no personal signal — fabricate
      // a neutral candidate so the DTO shape is identical.
      const fallback: CandidateScore = {
        bookId: t.bid,
        content: 0.5,
        cf: null,
        cfNormalized: null,
        hybrid: 0.5,
        whyBookId: null,
        whySource: null,
      }
      return toSectionItem(cand ?? fallback, bookCatalog)
    }),
  })

  // "Hidden gems" — strong signal from few raters. Skip when user has no
  // signal (cold-start) — would just be "books with few ratings" noise.
  if (userRatings.length > 0) {
    const items = candidates
      .filter((c) => {
        const ratingsCount = bookCatalog.get(c.bookId)!.ratingsCount
        return ratingsCount > 0 && ratingsCount <= HIDDEN_GEM_MAX_RATINGS
      })
      .sort((a, b) => b.hybrid - a.hybrid)
      .slice(0, SECTION_SIZE)
      .map((c) => toSectionItem(c, bookCatalog))
    if (items.length > 0) {
      sections.push({
        key: 'hidden-gems',
        title: 'Hidden gems for you',
        subtitle: 'High signal from few raters who match your profile.',
        items,
      })
    }
  }

  return {
    profile: {
      ratingCount: userRatings.length,
      alpha: Number(alpha.toFixed(2)),
    },
    sections,
  }
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function toSectionItem(
  cand: CandidateScore,
  bookCatalog: Map<string, Omit<SectionItem, 'score' | 'contentScore' | 'cfScore' | 'why'>>,
): SectionItem {
  const base = bookCatalog.get(cand.bookId)!
  const why = cand.whyBookId
    ? `Because you liked ${bookCatalog.get(cand.whyBookId)?.title ?? '…'}`
    : null
  return {
    ...base,
    score: Number(cand.hybrid.toFixed(3)),
    contentScore: Number(cand.content.toFixed(3)),
    cfScore: cand.cf ? Number(cand.cf.value.toFixed(2)) : null,
    why,
  }
}

/**
 * For UI labelling. The "why" should point at the user-rated book that
 * most explains the candidate. CF supports already carry that ranking;
 * content side requires us to compute it ad-hoc by feature cosine.
 */
function pickWhy(
  candidate: BookFeatures,
  cf: CfResult | null,
  userRatings: UserRating[],
  bookFeatures: Map<string, BookFeatures>,
): { whyBookId: string | null; whySource: 'content' | 'cf' | null } {
  if (cf && cf.supports.length > 0) {
    return { whyBookId: cf.supports[0]!.bookId, whySource: 'cf' }
  }
  // Compute content-side support: among the user's rated books, find the
  // one whose features have the highest cosine with the candidate's
  // (weighted by how much the user liked it).
  const candVec = new Map<string, number>()
  for (const tok of featureTokens(candidate)) candVec.set(tok, 1)

  let bestId: string | null = null
  let bestScore = 0
  for (const r of userRatings) {
    if (r.value < 4) continue // don't blame a 2★ rating for a recommendation
    const other = bookFeatures.get(r.bookId)
    if (!other) continue
    const otherVec = new Map<string, number>()
    for (const tok of featureTokens(other)) otherVec.set(tok, 1)
    const sim = cosineMaps(candVec, otherVec)
    const weighted = sim * (r.value - 3)
    if (weighted > bestScore) {
      bestScore = weighted
      bestId = r.bookId
    }
  }
  return { whyBookId: bestId, whySource: bestId ? 'content' : null }
}

function pickTopRatedBook(userRatings: UserRating[]): UserRating | null {
  if (userRatings.length === 0) return null
  return userRatings.reduce((best, r) => (r.value > best.value ? r : best), userRatings[0]!)
}

function daysAgo(n: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d
}
