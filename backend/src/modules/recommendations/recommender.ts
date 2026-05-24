/**
 * Hybrid book recommender — content-based + item-item CF, blended by α.
 *
 * This file is pure: it takes plain data and returns numbers. No Prisma,
 * no Express. The service layer wires it up. That separation is what
 * lets the recommender be unit-tested and discussed independently in
 * MAHAT book chapter 10. See docs/decisions/0003-recommender.md for the
 * full algorithmic rationale.
 *
 *   α(n) = max(0.2, 1 − n / 20)        // n = user's rating count
 *   content_score = cosine(profile, book_features), [-1,1] → [0,1]
 *   cf_score      = Σ sim(B, X) · r(X) / Σ |sim(B, X)|   over the user's ratings
 *   hybrid        = α · content + (1 − α) · cf_norm
 */

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export type BookFeatures = {
  id: string
  categories: string[]
  tags: string[]
  authorName: string
  language: string
}

export type UserRating = {
  bookId: string
  value: number // 1..5
}

export type ItemRating = {
  userId: string
  value: number
}

/** Map from bookId to *all* ratings on that book (across all users). */
export type RatingsByBook = Map<string, ItemRating[]>

export type CfResult = {
  value: number // weighted-average rating on the [1,5] scale
  supports: Array<{ bookId: string; sim: number; value: number }>
}

// -----------------------------------------------------------------------------
// α schedule
// -----------------------------------------------------------------------------

/**
 * Blend weight for the content-based layer. Starts at 1.0 for cold-start
 * readers and decays linearly to a floor of 0.2 as the user accumulates
 * ratings — the floor keeps content as a tiebreaker even for prolific
 * raters (protects against weird CF outputs).
 */
export function alphaFor(ratingCount: number): number {
  return Math.max(0.2, 1 - ratingCount / 20)
}

// -----------------------------------------------------------------------------
// Content-based layer
// -----------------------------------------------------------------------------

/**
 * Sparse feature tokens for a book. Namespaced so a tag named "Fiction"
 * can't collide with a category named "Fiction".
 */
export function featureTokens(book: BookFeatures): string[] {
  return [
    ...book.categories.map((c) => `cat:${c}`),
    ...book.tags.map((t) => `tag:${t}`),
    `author:${book.authorName}`,
    `lang:${book.language}`,
  ]
}

/**
 * User profile vector: rating-weighted sum of feature vectors of books
 * the user has rated. The 3-star mean is subtracted so 1-star ratings
 * actively push *away* from similar books (weight = −2) rather than
 * weakly endorsing them.
 */
export function buildUserProfile(
  ratings: UserRating[],
  bookFeatures: Map<string, BookFeatures>,
): Map<string, number> {
  const profile = new Map<string, number>()
  for (const r of ratings) {
    const book = bookFeatures.get(r.bookId)
    if (!book) continue
    const weight = r.value - 3
    if (weight === 0) continue
    for (const tok of featureTokens(book)) {
      profile.set(tok, (profile.get(tok) ?? 0) + weight)
    }
  }
  return profile
}

/** Cosine similarity over two sparse Map<token, number> vectors. */
export function cosineMaps(a: Map<string, number>, b: Map<string, number>): number {
  if (a.size === 0 || b.size === 0) return 0
  let aNorm = 0
  for (const v of a.values()) aNorm += v * v
  let bNorm = 0
  for (const v of b.values()) bNorm += v * v
  if (aNorm === 0 || bNorm === 0) return 0
  const [small, large] = a.size < b.size ? [a, b] : [b, a]
  let dot = 0
  for (const [k, va] of small) {
    const vb = large.get(k)
    if (vb !== undefined) dot += va * vb
  }
  return dot / Math.sqrt(aNorm * bNorm)
}

/**
 * Content score for a candidate book given the user's profile. Cosine
 * sits in [-1, 1]; we clamp and map to [0, 1] so it can blend with the
 * CF score. Returns 0.5 (neutral) when the profile is empty.
 */
export function contentScore(book: BookFeatures, profile: Map<string, number>): number {
  if (profile.size === 0) return 0.5
  const bookVec = new Map<string, number>()
  for (const tok of featureTokens(book)) bookVec.set(tok, 1)
  const cos = cosineMaps(profile, bookVec)
  const clamped = Math.max(-1, Math.min(1, cos))
  return (clamped + 1) / 2
}

// -----------------------------------------------------------------------------
// Collaborative-filtering layer
// -----------------------------------------------------------------------------

/**
 * Item-item similarity. Cosine of two books' rating vectors restricted
 * to users who rated both. Returns null when there is no overlap — the
 * caller treats null as "no signal" and falls back to content-only.
 */
export function itemItemSim(a: ItemRating[], b: ItemRating[]): number | null {
  if (a.length === 0 || b.length === 0) return null
  const bByUser = new Map(b.map((r) => [r.userId, r.value]))
  let dot = 0
  let aNorm = 0
  let bNorm = 0
  let coRaters = 0
  for (const ra of a) {
    const rb = bByUser.get(ra.userId)
    if (rb === undefined) continue
    coRaters += 1
    dot += ra.value * rb
    aNorm += ra.value * ra.value
    bNorm += rb * rb
  }
  if (coRaters === 0 || aNorm === 0 || bNorm === 0) return null
  return dot / Math.sqrt(aNorm * bNorm)
}

/**
 * CF score for a candidate book given the user's rating list. Weighted
 * average of the user's ratings on neighbors, weighted by item-item
 * similarity. Result is on the [1, 5] rating scale. Returns null when
 * no neighbor has a CF signal (cold-start / sparse).
 *
 * Supports are sorted by descending |sim| so the service can label the
 * UI card with "because you liked <top support>".
 */
export function cfScore(
  candidateId: string,
  userRatings: UserRating[],
  ratingsByBook: RatingsByBook,
): CfResult | null {
  const candRatings = ratingsByBook.get(candidateId) ?? []
  const supports: CfResult['supports'] = []
  let num = 0
  let denom = 0
  for (const r of userRatings) {
    const otherRatings = ratingsByBook.get(r.bookId) ?? []
    const sim = itemItemSim(candRatings, otherRatings)
    if (sim === null) continue
    supports.push({ bookId: r.bookId, sim, value: r.value })
    num += sim * r.value
    denom += Math.abs(sim)
  }
  if (denom === 0) return null
  supports.sort((x, y) => Math.abs(y.sim) - Math.abs(x.sim))
  return { value: num / denom, supports }
}

/** Map a rating-scale CF score (1..5) into [0, 1] for blending. */
export function normalizeCf(value: number): number {
  return Math.max(0, Math.min(1, (value - 1) / 4))
}

// -----------------------------------------------------------------------------
// Blend
// -----------------------------------------------------------------------------

/**
 * Hybrid score on [0, 1]. CF gets its full weight only when present;
 * otherwise content carries the candidate alone (cold-start fallback).
 */
export function hybridScore(content: number, cfNormalized: number | null, alpha: number): number {
  if (cfNormalized === null) return content
  return alpha * content + (1 - alpha) * cfNormalized
}
