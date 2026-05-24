# 0003: Hybrid book recommender — content-based + item-item CF + α blend

Date: 2026-05-24
Status: accepted

## Context

The project's headline feature, and the substance of MAHAT book
chapter 10 (computational algorithm). The system must answer "given a
reader, list the N books they're most likely to enjoy" with reasoning
the examiners can defend: where do the recommendations come from, why
this method and not another, what happens to a brand-new reader, what
happens when ratings are sparse.

Existing constraints:
- ~12 books in the seeded catalog; real deployments will be hundreds
  to a few thousand. Algorithms that are O(N²) over the catalog are
  fine for now and we can revisit if a customer ever loads 10k+ titles.
- Postgres via Prisma. The `Rating` table has `@@index([bookId])` which
  is the hot path for collaborative filtering — we designed for this in
  ADR-0001.
- No external recommender service. Everything runs in-process; computing
  on-demand and caching per-request is the bar.

## Options considered

### A. Pure content-based filtering

For each book, build a feature vector from its attributes (categories,
tags, author, language, era bucket). Recommend books whose vectors are
closest (cosine similarity) to books the user already rated highly.

- **Good:** No cold-start problem for items — a brand-new book with no
  ratings can be recommended on the strength of its features alone.
- **Bad:** No cold-start solution for users. A reader with zero ratings
  has no profile vector. Also tends to recommend *more of the same* —
  if you rated three fantasies five stars, you only get fantasies back.

### B. Pure item-item collaborative filtering

For each pair of books, compute similarity based on the pattern of
ratings (treating each book as a vector in user-rating space). To
recommend for a user: for every unrated book B, score it as a weighted
average of the user's existing ratings, weighted by sim(B, rated).

- **Good:** Captures "people who rated X also rated Y highly" without
  needing to know what X and Y are about.
- **Bad:** Cold-start for new books (no ratings → no neighbors → no
  recommendation). Cold-start for new users (no ratings → nothing to
  weight against).

### C. Hybrid: content-based + item-item, blended by α

Compute both scores per candidate book, combine them as
`score = α · content_score + (1 − α) · cf_score`. Crucially, α is a
function of the user's rating count — small for new users (lean on
content), shifts toward CF as their profile fills out.

- **Good:** Cold-start is handled by the content side. As the user
  rates more, the blend automatically gives CF more weight, which is
  where it shines. Each layer's strengths cover the other's gaps.
- **Bad:** More code, two similarity computations per request, more
  to defend in the oral exam (but more to *talk about* is also good).

### D. Matrix factorization (SVD, ALS) or a neural collaborative filter

The state of the art at scale.

- **Good:** Better accuracy on large datasets.
- **Bad:** Massively more complex. Needs training infrastructure,
  hyperparameter tuning, model versioning. Doesn't generalize to a
  150-hour project where the candidate catalog is 12 books. Would also
  be a chapter-10 disaster — too much to defend if examiners probe the
  loss function and gradient descent details.

## Decision

We picked **C** — the hybrid.

**α schedule**

```
α(n) = max(0.2, 1 − n / 20)
```

where `n` is the number of ratings the user has supplied. So:
- 0 ratings → α = 1.0 (pure content-based)
- 5 ratings → α = 0.75
- 10 ratings → α = 0.50
- 20+ ratings → α = 0.20 (CF-dominated, with content as a tiebreaker)

The floor at 0.2 keeps content-based as a sanity check even for
prolific raters — protects against weird CF outputs when a user's
neighbors are eccentric.

**Content score (Layer 1)**

For each book we build a sparse 0/1 feature vector across the union of
all (category, tag, author, language) tokens. Compute cosine similarity
between books as `dot(a,b) / (||a||·||b||)`.

A user's *profile* vector is the rating-weighted sum of feature vectors
of the books they've rated:
`profile = Σ (rating_i − 3) · features(book_i)`.
We subtract the 3-star mean so 1-star ratings actually push *away* from
similar books instead of weakly endorsing them.

`content_score(b, user) = cosine(profile, features(b))`,
clamped to `[-1, 1]` then normalized to `[0, 1]`.

**CF score (Layer 2)**

Item-item, weighted average. For each candidate book B and the user's
rating list R:

```
cf_score(B, user) = Σ_{r in R} sim(B, r.book) · r.value  /  Σ |sim(B, r.book)|
```

where `sim(B, X)` is the cosine of the two columns of the user-rating
matrix restricted to users who rated both. If the denominator is zero
(no overlap), CF returns null and the hybrid falls back to pure content.

**Hybrid**

Normalize each layer to `[0, 1]`, blend per α. Books the user has
already rated are excluded from the candidate pool. Books the user
already has out on loan are de-prioritized but not excluded — useful for
reservations / "borrow next" surfacing.

## Consequences

**Good**

- Defensible at every layer. Each piece maps to a named technique with a
  textbook reference (cosine similarity, item-item CF, weighted blend).
- Handles cold-start gracefully — α gives new users 100% content scores
  built from a single rating during onboarding.
- Output is decomposable: the API returns `{ score, contentScore,
  cfScore, alpha, why }` so the UI can show *because you liked X* / *most
  similar readers rated Y* labels under each card. Big interpretability
  win for the defence.

**Bad / accepted tradeoffs**

- Recompute-everything-on-demand. For 12 books × ~10 ratings, this is
  microseconds. For 10k books × 100k ratings it becomes a problem; we'd
  precompute the item-item similarity matrix into a `BookSimilarity`
  table on a cron schedule. Out of scope for v1.
- α floor at 0.2 is heuristic. Could be learned per-user, but that's a
  rabbit hole we're not following without more data.
- Subtracting the 3-star mean assumes a uniform prior. Real distributions
  skew high (4–5 stars). A future enhancement subtracts the user's own
  mean instead.

## Cross-references

Maps to chapter 10 (computational algorithm) — the chapter that
examiners weight most heavily. The implementation lives in
`backend/src/modules/recommendations/recommender.ts` with a docblock
mirroring this ADR. The endpoint is `GET /api/v1/recommendations`,
returning four sections so the UI can render the same shape as the
current mock: because-you-liked, similar-readers, trending, hidden-gems.
