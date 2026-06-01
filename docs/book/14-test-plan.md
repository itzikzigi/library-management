# Chapter 14 — Test Plan (תכנית בדיקות)

Per the MAHAT November 2024 procedure §1.3, this chapter contains two tables:
a full-flow / integration test table (טבלת בדיקות תהליך) and a unit test
table (טבלת בדיקות יחידה). Each row in the unit table corresponds to one
JSDoc-documented function from the function catalogue in chapter 7.

## Strategy

Testing during development is **manual smoke-testing per session**, captured
in `docs/worklog.md` (chapter 13). Each backend module shipped with a numbered
list of scenarios verified by hand against a seeded local Postgres + the
running Express server. The "Status" column below maps every full-flow row
back to the worklog entry where its verification is recorded.

The planned automation stack is **Jest + Supertest** for API tests and
**React Testing Library** for UI tests, listed in chapter 7's tech stack
table. The automation roadmap appears at the end of this chapter.

### Test environment

- Backend at `http://localhost:4000`, frontend at `http://localhost:5173`.
- Postgres 16 in Docker via `docker-compose.yml`, port 5434.
- Seeded fixture: 10 users (1 librarian + 9 readers), 12 books, 34 copies,
  16 categories, 24 tags, 11 loans, 31 ratings, 0 reservations. Seed is
  idempotent (`tsx prisma/seed.ts`).
- Manual scenarios run from a mix of `curl`, the live React UI, and (for
  parallel cases) `Promise.all` in a tsx scratch script.

---

## Table 1 — Full-flow tests (בדיקות תהליך)

| # | Module | Scenario | Inputs / steps | Expected result | Status |
|---|--------|----------|----------------|-----------------|--------|
| F1 | auth | Register new reader | `POST /auth/register` with unused email | 201, `accessToken` + httpOnly `refresh` cookie, `role=READER` | Pass (worklog #7) |
| F2 | auth | Duplicate email | `POST /auth/register` with seeded email | 409 `EMAIL_TAKEN` | Pass (worklog #7) |
| F3 | auth | Login success | `POST /auth/login` with valid credentials | 200, access token + refresh cookie | Pass (worklog #7) |
| F4 | auth | Login wrong password | `POST /auth/login` with valid email, bad password | 401 `INVALID_CREDENTIALS` (identical shape to "missing user" — no email enumeration) | Pass (worklog #7) |
| F5 | auth | Refresh rotation (single) | `POST /auth/refresh` once with valid cookie | 200, new access token, refresh cookie rotated, old row's `revokedAt` set | Pass (worklog #7) |
| F6 | auth | Old refresh after rotation | Reuse the pre-rotation refresh cookie | 401 `INVALID_REFRESH` | Pass (worklog #7) |
| F7 | auth | Parallel refresh — CAS losers | Two parallel `POST /auth/refresh` with the same cookie | Exactly one 200; the other returns 401 `REFRESH_RACE` **without** clearing the cookie; frontend `refreshAccessToken` retries the loser once and succeeds with the winner's freshly-set cookie | Planned — to be the first automated Jest+Supertest case (the race window is sub-millisecond and cannot be reliably reproduced by hand) |
| F8 | auth | Logout | `POST /auth/logout` | 204, refresh cookie cleared, row's `revokedAt` set | Pass (worklog #7) |
| F9 | auth | `/me` without token | `GET /auth/me` with no Authorization header | 401 `UNAUTHORIZED` | Pass (worklog #7) |
| F10 | auth | Rate-limited login | 11 `POST /auth/login` from same IP in 15 min | 11th → 429 `TOO_MANY_REQUESTS` | Pass (worklog #7) |
| F11 | books | List with filters | `GET /books?q=wind&category=Fiction&availableOnly=true` | 200, results match all three filters; each item has `rating` populated | Pass (worklog #5, #6) |
| F12 | books | Get by id (guest) | `GET /books/:id` no auth | 200, `myRating: null` | Pass (worklog #10) |
| F13 | books | Get by id (authed) | `GET /books/:id` as user with a rating on this book | 200, `myRating: <stored value>` | Pass (worklog #10) |
| F14 | books | Unknown id | `GET /books/:bogus` | 404 in canonical `{error:{code,message}}` shape | Pass (worklog #5) |
| F15 | books | Librarian create | `POST /books` with title/author/categories/tags/totalCopies | 201, author + categories + tags upserted by name, copies created with derived barcodes | Pass (worklog #13) |
| F16 | books | Duplicate ISBN | `POST /books` with an existing ISBN | 409 `ISBN_TAKEN` | Pass (worklog #13) |
| F17 | books | Reader 403 on create | `POST /books` as `READER` | 403 `FORBIDDEN` | Pass (worklog #13) |
| F18 | books | Update — set semantics | `PATCH /books/:id` with `tags: ['X']` on a book with `['Y','Z']` | 200, tags now exactly `['X']` (not merged) | Pass (worklog #13) |
| F19 | books | Delete with loan history | `DELETE /books/:withLoans` | 409 `HAS_LOAN_HISTORY` (caught before FK `Restrict`) | Pass (worklog #13) |
| F20 | books | Delete no history | `DELETE /books/:freshlyCreated` | 204 | Pass (worklog #13) |
| F21 | ratings | Upsert | `POST /books/:id/ratings` value=4, then value=5 | first → 201 created, second → 200 updated; book's average rating reflects the latest value | Pass (worklog #10) |
| F22 | ratings | Out of range | `POST /books/:id/ratings` value=6 | 400 `VALIDATION_ERROR` with Zod field message | Pass (worklog #10) |
| F23 | ratings | Guest blocked | `POST /books/:id/ratings` no auth | 401 `UNAUTHORIZED` | Pass (worklog #10) |
| F24 | ratings | Delete idempotency | `DELETE /books/:id/ratings` twice | first → 204, second → 404 `NOT_FOUND` | Pass (worklog #10) |
| F25 | loans | Borrow happy path | `POST /loans` with `bookId` | 200, oldest `AVAILABLE` copy assigned, `dueDate = createdAt + 21d` | Pass (worklog #9) |
| F26 | loans | Two readers race for last copy | Two parallel `POST /loans` on a 1-AVAILABLE-copy book | Exactly one 200, one 409 `NO_COPY_AVAILABLE` (resolved by `updateMany({status:'AVAILABLE'})` guard inside a transaction) | Planned — automate alongside F7 |
| F27 | loans | Loan limit | `POST /loans` after 5 active loans | 403 `LOAN_LIMIT_REACHED` | Pass (worklog #9) |
| F28 | loans | Renew | `POST /loans/:id/renew` on active, non-overdue loan | 200, `dueDate += 14d`, `renewals += 1` | Pass (worklog #9) |
| F29 | loans | Renew overdue blocked | `POST /loans/:id/renew` on overdue loan | 409 (cannot renew overdue) | Pass (worklog #9) |
| F30 | loans | Renew max reached | `POST /loans/:id/renew` after 2 renewals | 409 | Pass (worklog #9) |
| F31 | loans | Return + reservation fulfilment | `POST /loans/:id/return` on a book with a pending reservation queue | 200, copy `AVAILABLE`, head of queue flips `PENDING → FULFILLED` in the same transaction, others' `queuePosition` decrements | Pass (worklog #14) |
| F32 | loans | Double return | `POST /loans/:id/return` twice | second → 400 `ALREADY_RETURNED` | Pass (worklog #9) |
| F33 | loans | Reader 403 on `/loans` (all) | `GET /loans` as `READER` | 403 `FORBIDDEN` | Pass (worklog #9) |
| F34 | loans | Self-or-librarian return | Reader A returns Reader B's loan | 403 | Pass (worklog #9) |
| F35 | loans | Overdue fines aggregate | `GET /loans?status=overdue` as librarian | each loan carries `fine = daysOverdue × 2`; matches dashboard tile totals | Pass (worklog #9) |
| F36 | reservations | Place on hold | `POST /books/:id/reservations` on 0-available book | 201, `queuePosition: 1` | Pass (worklog #14) |
| F37 | reservations | Copies available | `POST /books/:id/reservations` on book with available copies | 409 `COPIES_AVAILABLE` (borrow instead) | Pass (worklog #14) |
| F38 | reservations | Duplicate hold | Second `POST /books/:id/reservations` from same reader | 409 `ALREADY_RESERVED` | Pass (worklog #14) |
| F39 | reservations | Reservation limit | 6th pending reservation | 403 `RESERVATION_LIMIT_REACHED` | Pass (worklog #14) |
| F40 | reservations | Cancel | `DELETE /reservations/:id` as owner | 204; downstream `queuePosition` decrements | Pass (worklog #14) |
| F41 | reservations | Cancel someone else's | `DELETE /reservations/:other` | 403 | Pass (worklog #14) |
| F42 | reservations | Listing — queue position | `GET /me/reservations` with two reservations on same book in different orders | each row's `queuePosition` matches `createdAt asc` order | Pass (worklog #14) |
| F43 | members | List with filters | `GET /members?status=has-fines` as librarian | only members with outstanding fines; totals match dashboard | Pass (worklog #12) |
| F44 | members | Reader 403 on list | `GET /members` as reader | 403 `FORBIDDEN` | Pass (worklog #12) |
| F45 | members | Self-demote blocked | `PATCH /members/:self` with `role: 'READER'` (self is librarian) | 403 `SELF_DEMOTE` | Pass (worklog #12) |
| F46 | members | Delete with history | `DELETE /members/:withLoans` | 409 `HAS_LOAN_HISTORY` | Pass (worklog #12) |
| F47 | members | Delete clean account | `DELETE /members/:noLoans` | 204 | Pass (worklog #12) |
| F48 | recommendations | Cold start | `GET /recommendations` with 0 ratings | `profile.alpha = 1.0`; only Trending section populated; content score uniform 0.5 | Pass (worklog #11) |
| F49 | recommendations | Established user | `GET /recommendations` as Yael (5 ratings) | `alpha = 0.75`; Because-you-liked + Similar-readers + Trending + Hidden-gems all populated | Pass (worklog #11) |
| F50 | recommendations | Excludes rated books | `GET /recommendations` | no caller-rated book appears in any section | Pass (worklog #11) |
| F51 | recommendations | CF correctness | `GET /recommendations` Similar-readers section | each cf score equals the weighted average over co-raters from the seed matrix (verified row-by-row against ratings table) | Pass (worklog #11) |
| F52 | recommendations | Guest blocked | `GET /recommendations` no auth | 401 `UNAUTHORIZED` | Pass (worklog #11) |
| F53 | global | Canonical error shape | Any 4xx/5xx | body matches `{error:{code,message[,details]}}` | Pass (worklog #5 + spot checks) |
| F54 | global | CORS preflight | `OPTIONS` from `http://localhost:5173` | `Allow-Origin: http://localhost:5173`, `Allow-Credentials: true` | Pass (worklog #8) |
| F55 | frontend | Boot session restore | Load app with valid refresh cookie | Exactly one `/auth/refresh` fires (deduplicated under React StrictMode); UI lands on the requested route, not `/login` | Pass (worklog #15) |
| F56 | frontend | Login → /my-loans redirect | Login from a `RequireAuth` redirect | After successful login, lands on the original target route | Pass (worklog #8, #9) |
| F57 | frontend | Borrow flow | Click Borrow on a book detail page as a reader | Loan created, redirect to `/my-loans`, the new loan appears with Renew + Return buttons | Pass (worklog #9) |

---

## Table 2 — Unit tests (בדיקות יחידה)

| # | Module — Function | Input | Expected output | Status |
|---|-------------------|-------|-----------------|--------|
| U1 | `recommender.featureTokens` | book with categories `['Fiction','Memoir']`, tags `['Bildungsroman']`, language `'HE'`, author `'Amos Oz'` | Set containing `cat:fiction`, `cat:memoir`, `tag:bildungsroman`, `lang:he`, `author:amos-oz` | Planned |
| U2 | `recommender.buildUserProfile` | three ratings: 5★ on book with token X, 1★ on book with token Y, 3★ on book with token Z | profile: X positive, Y negative, Z zero (since 3 − 3 mean = 0) | Planned |
| U3 | `recommender.cosineMaps` | two identical sparse vectors | `1.0` | Planned |
| U4 | `recommender.cosineMaps` | two orthogonal sparse vectors (no shared keys) | `0` | Planned |
| U5 | `recommender.contentScore` | profile and item with cosine = −1 | `0` (mapped from `[-1,1]` to `[0,1]`) | Planned |
| U6 | `recommender.itemItemSim` | books A and B with one common rater scoring both 5★ | cosine over the one-dim co-rated subspace = `1.0` | Planned |
| U7 | `recommender.itemItemSim` | books with no co-raters | `null` | Planned |
| U8 | `recommender.cfScore` | item with two neighbour sims `0.8` (rated 4) and `0.6` (rated 5) | weighted average ≈ `(0.8×4 + 0.6×5)/(0.8+0.6) ≈ 4.43` | Planned |
| U9 | `recommender.alphaFor(0)` | 0 ratings | `1.0` (full content) | Planned |
| U10 | `recommender.alphaFor(5)` | 5 ratings | `0.75` | Planned |
| U11 | `recommender.alphaFor(20)` | 20 ratings | `0.2` (floor) | Planned |
| U12 | `recommender.alphaFor(50)` | 50 ratings | `0.2` (clamped to floor) | Planned |
| U13 | `recommender.hybridScore` | `content=0.8`, `cf=0.4`, `alpha=0.6` | `0.6 × 0.8 + 0.4 × 0.4 = 0.64` | Planned |
| U14 | `recommender.normalizeCf` | cf scores `[1,3,5]` | `[0, 0.5, 1]` (preserves order) | Planned |
| U15 | `auth.service.hashPassword` + `verifyPassword` | `'hunter2'` | hash ≠ plaintext; `verify('hunter2', hash) === true`; `verify('wrong', hash) === false` | Planned |
| U16 | `auth.service.generateRefreshToken` | () | `{ raw: 64-hex-char, hash: sha256(raw), expiresAt > now }` | Planned |
| U17 | `auth.service.hashRefreshToken` | same input twice | identical hash (deterministic sha256) | Planned |
| U18 | `auth.service.ttlToMs` | `'15m'` / `'7d'` / `'1h'` | `900_000` / `604_800_000` / `3_600_000` | Planned |
| U19 | `auth.service.signAccessToken` + `verifyAccessToken` | `{sub:'u1', role:'READER'}` | round-trips; tampering with the signature throws | Planned |
| U20 | `auth.schema.registerBody` | password `'short'` (len 5) | ZodError with `min(8)` on `password` | Planned |
| U21 | `auth.schema.registerBody` | email `'not-an-email'` | ZodError with `email` issue | Planned |
| U22 | `books.schema.createBookBody` | `totalCopies = 0` | ZodError `min(1)` | Planned |
| U23 | `books.schema.createBookBody` | `totalCopies = 51` | ZodError `max(50)` | Planned |
| U24 | `books.schema.createBookBody` | `language` outside enum | ZodError | Planned |
| U25 | `loans.service` — derived `status` | active loan with `dueDate > now` | `'ACTIVE'` | Planned |
| U26 | `loans.service` — derived `status` | active loan with `dueDate < now` | `'OVERDUE'` | Planned |
| U27 | `loans.service.fineFor` | returned 3 days late, `FINE_PER_DAY=2` | `6` | Planned |
| U28 | `loans.service.canRenew` | renewals=1, not overdue | `true` | Planned |
| U29 | `loans.service.canRenew` | renewals=2 | `false` | Planned |
| U30 | `loans.service.canRenew` | overdue | `false` | Planned |
| U31 | `reservations.service.queuePositionsFor` | three PENDING reservations on same book, distinct `createdAt` | `[1, 2, 3]` in createdAt-asc order | Planned |
| U32 | `members.service.outstandingFine` | member with one returned-late loan (3d × 2 ₪) and one active | `6` (only late portion counts) | Planned |

---

## Automation roadmap

1. **Phase 1 — first automated case (highest leverage).** Install `jest`,
   `ts-jest`, `supertest`, `@types/jest`, `@types/supertest`. Factor
   `backend/src/app.ts` out of `server.ts` (so the Express instance can be
   handed to Supertest without binding a port). Add `DATABASE_URL_TEST`
   pointing at a second database on the same Postgres instance; run
   `prisma migrate deploy` in `globalSetup` and truncate tables in
   `beforeEach`. Write **F7** (parallel refresh) as the first integration
   test — this is the row that genuinely cannot be reproduced by hand.
2. **Phase 2 — port F-rows.** Migrate F1–F57 into Supertest specs grouped
   by module. Start with F26 (last-copy race) since it shares the
   concurrency-infrastructure justification with F7.
3. **Phase 3 — unit tests.** Add `recommender.test.ts` covering U1–U14 (no
   database needed — pure functions). Then the service-layer derivations
   (U25–U32). Schema unit tests last; they're the lowest payoff because Zod
   already exercises them implicitly through F-rows.
4. **Phase 4 — CI.** GitHub Actions per chapter 15: spin up Postgres
   service container, run `npm test` on push. Block merges to `main` on red.

## Defence notes (for the oral)

- **Why two tables?** The MAHAT procedure distinguishes integration scenarios
  (טבלת בדיקות תהליך) from per-function checks (טבלת בדיקות יחידה). Each
  unit-table row maps to one entry in the chapter 7 function catalogue.
- **Why is the test status mostly manual right now?** 150-hour solo budget.
  Manually smoke-testing each module immediately after it ships (and
  recording the result in `worklog.md`) gives end-to-end coverage at low
  per-session cost. The cost of regressions slipping is mitigated by
  re-running the relevant manual scenarios on every backend change in the
  same area.
- **Why prioritise F7 / F26 for automation?** Concurrency races have
  sub-millisecond windows; they cannot be reliably reproduced from the
  browser or `curl`. Without an automated `Promise.all([refresh, refresh])`
  harness against a real Postgres, the CAS guards on refresh-token rotation
  (`auth.controller.ts`) and copy allocation (`loans.service.ts`) could
  regress silently. These rows pay automation back fastest.
- **Why a real Postgres for the auth tests, not a mock?** The whole point
  of the CAS pattern is row-level lock serialisation, which is a Postgres
  property. A mock would always pass. The test must hit a real database
  to be meaningful — this is the same reasoning that justifies the
  separate `DATABASE_URL_TEST` approach over an in-memory SQLite shim.
- **Coverage gaps acknowledged.** No automated UI tests yet — RTL is
  listed in chapter 7 as the planned tool but not exercised. The
  recommendation engine has end-to-end coverage (F48–F52) but no unit
  coverage on the pure functions yet (U1–U14 planned). These are listed
  honestly here rather than hidden.
