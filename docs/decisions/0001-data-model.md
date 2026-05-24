# 0001: Initial data model for catalog, circulation, and ratings

Date: 2026-05-24
Status: accepted

## Context

The system needs a relational schema that supports (a) standard library
operations — catalog browsing, multi-copy holdings, borrowing, returns,
reservations, fines, accounts; and (b) the recommendation engine, which
reads from a ratings matrix. Prisma + PostgreSQL is the chosen stack
(see CLAUDE.md / chapter 7).

Several modelling choices weren't obvious and shape both the queries
the recommender will run (chapter 10) and the entity-relationship
diagram the project book will print (chapter 8).

## Options considered

### 1. Book copies — separate table vs counter

- **A: `Book.totalCopies` + derive availability from active loans.** Single
  row per work. Simple. Cannot model lost copies, withdrawn copies,
  different shelf locations per copy, or per-copy acquisition dates.
- **B: Separate `BookCopy` table, one row per physical copy.** Two-level
  hierarchy (work → copy). Real libraries work this way. Required to
  answer "which copy did Yael borrow?" and "this copy was lost, write it
  off without affecting the others."

### 2. Categories and tags — junction tables vs JSON array

- **A: JSON column on `Book` (`categories: string[]`).** No joins. Painful
  to query ("all books in 'שירה'"), no referential integrity, hard to
  rename a category.
- **B: Many-to-many via implicit join tables.** Standard relational. Prisma
  handles the junction tables transparently. Lets the recommender build
  feature vectors with a SQL `GROUP BY` instead of parsing JSON.

### 3. Ratings — separate entity vs JSON on `User`

- **A: `User.ratings: {bookId, value}[]` as JSON.** One row per user.
  Reading "all ratings for book X" requires scanning every user row.
- **B: `Rating` table with composite unique `(userId, bookId)` and an
  index on `bookId`.** One row per (user, book). Item-item collaborative
  filtering reads ratings by book — needs that index. Standard shape.

### 4. Primary keys — UUID vs CUID vs autoincrement Int

- **A: Autoincrement Int.** Smallest indexes; sequential ID leaks count
  information and is guessable.
- **B: UUID v4.** Universally recognizable, but 36-char strings inflate
  every index and every URL.
- **C: CUID.** 25-char strings, sortable by creation, non-guessable, smaller
  than UUID. Prisma's default for a reason.

### 5. Refresh tokens — store raw vs hashed

- **A: Store the raw token string** the client received. Easy to verify
  on refresh. If the DB is dumped, every active session is compromised.
- **B: Store only `sha256(token)`.** Verify by hashing the incoming token
  and looking it up. A DB dump leaks nothing usable.

## Decision

- Separate `BookCopy` table (1B).
- Many-to-many via implicit join tables for `Category` and `Tag` (2B).
- Separate `Rating` table with `@@unique([userId, bookId])` and
  `@@index([bookId])` (3B).
- CUID primary keys throughout (4C).
- Refresh tokens stored as `tokenHash` only (5B).

## Consequences

**Good**

- Multi-copy holdings, per-copy status (`AVAILABLE / ON_LOAN / LOST /
  WITHDRAWN`), and accurate availability counts derived from joined
  tables rather than counter drift.
- Recommender can do `SELECT bookId, AVG(value) FROM Rating WHERE bookId IN
  (...)` directly — no JSON parsing in hot path.
- ERD prints cleanly for the project book — 9 entities, all in 3NF.
- Compromised DB leaks no live session credentials.

**Bad / accepted tradeoffs**

- More tables to migrate and maintain than the JSON-shortcut version.
- `Rating.value` is `Int` — Prisma cannot express a `CHECK (value
  BETWEEN 1 AND 5)` natively. Enforced in the API layer with Zod; a
  follow-up migration can add the SQL check constraint if examiners ask.
- Reservation queue position is derived from `(bookId, status, createdAt)`
  order rather than stored explicitly. Simpler to keep correct
  (no shuffle on cancel) but every "where am I in the queue?" query is a
  ranked window read. Indexed accordingly.
- `onDelete: Restrict` on `Loan.borrower` and `Loan.copy` means deleting a
  user or copy that has any loan history fails. Intentional — loan history
  is audit data. A future "anonymize account" operation will null the
  borrower instead of cascading.
