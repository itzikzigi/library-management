# Library Management System with Smart Book Recommendations

This file gives context to any AI assistant (Claude Code, Cursor, etc.) and to
the developer. Read it before starting work on this repo.

---

## Project context

This is a **MAHAT (מה"ט) final project** for the software technician track
(טכנאי תוכנה, פרויקט גמר), per the Ministry of Labor procedure document
dated November 2024.

- **Scope**: 150 hours, solo developer.
- **Defense**: oral defense before external MAHAT examiners + department head
  + personal advisor. Examiners will quiz on code, architecture, algorithm,
  security, and decisions taken.
- **Grade weighting**: 70% external examiners, 15% department head, 15% personal
  advisor.

## What we're building

A web application for small libraries (school, community, religious, niche)
that combines:

1. **Standard library management** — catalog, members, borrowing/returns,
   reservations, fines, search, librarian dashboard.
2. **Hybrid book recommendation engine** — the project's centerpiece and
   the substance of MAHAT book chapter 10 (computational algorithm):
   - Layer 1: content-based filtering (cosine similarity on book feature
     vectors — categories, author, era, language, tags)
   - Layer 2: item-item collaborative filtering on the user-rating matrix
   - Layer 3: hybrid scoring with α that shifts as users accumulate ratings
   - Optional Layer 4: LLM-powered "describe what you like" endpoint

## Roles

- **Librarian**: full CRUD on books, members, loans; sees analytics.
- **Reader**: browses catalog, rates books, gets recommendations, borrows,
  reserves, sees own history.

---

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Backend | Node.js + Express + TypeScript | Course stack; strict TS for examiner-friendly types |
| ORM | Prisma | Clean migrations, type-safe, easy ERD generation |
| Database | PostgreSQL | Relational domain; transactions for borrow/return |
| Frontend | React + Vite + TypeScript | Course stack; Vite for speed |
| Styling | TailwindCSS | Fast iteration, no CSS bikeshedding |
| Auth | JWT (access + refresh) + bcrypt | Standard; defensible in chapter 11 |
| Testing | Jest + Supertest (API), RTL (UI) | Required for chapter 14 tables |
| Containerization | Docker + docker-compose | Local Postgres + dev parity |
| Hosting | Render/Railway (backend + DB), Vercel (frontend) | Free tier sufficient |
| CI | GitHub Actions | Runs tests on push |

---

## Repository layout (planned — will materialize over time)

```
library-management/
├── backend/              # Node.js + Express + Prisma API
│   ├── src/
│   │   ├── modules/      # auth, books, loans, recommendations, ...
│   │   ├── middleware/   # auth, rbac, errorHandler, validation
│   │   ├── lib/          # prisma client, mailer, recommender
│   │   └── server.ts
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   └── tests/
├── frontend/             # React + Vite SPA
│   ├── src/
│   │   ├── pages/
│   │   ├── components/
│   │   ├── api/          # axios clients
│   │   └── lib/
│   └── tests/
├── docs/                 # All project-book material
│   ├── proposal/         # הצעת פרויקט (signed)
│   ├── book/             # ספר הפרויקט drafts (David 12pt, 1.5 spacing)
│   ├── diagrams/         # UML: use case, sequence, ERD, data flow
│   ├── decisions/        # one .md per architectural decision (ADR)
│   ├── screenshots/      # for the book and slides
│   └── worklog.md        # MANDATORY — see below
├── docker-compose.yml
├── .gitignore
├── README.md
└── CLAUDE.md             # this file
```

---

## MAHAT project-book chapters (mandatory)

The Nov 2024 procedure (section 1.3) requires these chapters. Keep raw
notes for each as you build — don't try to write them all at the end.

1. General background (רקע כללי)
2. System goals (מטרות המערכת)
3. Existing solutions (סקירת מצב קיים) — Koha, Goodreads, ספר.נט, ALMA
4. What this project improves (מה הפרויקט בא לחדש)
5. System + functional requirements (דרישות מערכת ופונקציונליות)
6. Anticipated issues + alternative architectures (בעיות צפויות ופתרונן)
7. Chosen technological solution (פתרון טכנולוגי נבחר)
8. Databases + file storage + reliability (שימוש במסדי נתונים)
9. Key diagrams: Use Case, Sequence, Data Flow (תרשימי מערכת)
10. Computational algorithm — the recommender (תיאור האלגוריתם)
11. Information security (אבטחת מידע)
12. Resources: hours, equipment, knowledge, sources (משאבים)
13. Work plan and stages (תכנית עבודה)
14. Test plan: full-flow tests table + unit tests table (תכנית בדיקות)
15. Version control (בקרת גרסאות) — this repo + workflow

---

## Coding conventions

- TypeScript strict mode everywhere; no `any` without a comment explaining why.
- Each backend function gets a JSDoc with **purpose, input, output** — this maps
  directly to the functions table required in the project book.
- Validate every API input with Zod schemas; never trust `req.body` raw.
- Errors flow through one `errorHandler` middleware; consistent shape:
  `{ error: { code, message } }`.
- Authorization checks live in middleware (`requireRole('LIBRARIAN')`), never
  inline in route handlers.
- Database access only through the Prisma client — no raw SQL except for
  the recommender's matrix queries (which get a comment explaining why).
- Frontend: presentation components are dumb; data fetching lives in
  `src/api/` and is consumed via React Query.
- No business logic in React components.

## Commit conventions

[Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` new user-visible capability
- `fix:` bug fix
- `refactor:` no behavior change
- `docs:` documentation only
- `test:` test additions/changes
- `chore:` tooling, deps, CI

One feature per branch (`feat/recommendations-content-based`), PR into `main`.
`main` always deployable.

---

## Architectural Decision Records (ADRs)

Every meaningful "why this and not that" decision goes into a short markdown
file under `docs/decisions/NNNN-title.md` using this skeleton:

```markdown
# NNNN: <decision>
Date: YYYY-MM-DD
Status: accepted | superseded by NNNN

## Context
What problem we're solving.

## Options considered
- A: ...
- B: ...
- C: ...

## Decision
We picked B because ...

## Consequences
Good: ...
Bad / accepted tradeoffs: ...
```

These feed chapter 6 (anticipated issues + alternatives) and arm you to
answer examiner questions of the form *"why didn't you use X?"*.

---

## Work log — MANDATORY

Maintain `docs/worklog.md` from day one. Examiners reference it. The MAHAT
procedure requires it for chapter 13. Format:

| # | Date | Goal | What I did | Result / measurements |
|---|------|------|------------|------------------------|
| 1 | 2026-MM-DD | ... | ... | ... |

Add an entry **every session**, even short ones. No retrofitting at the end —
examiners can tell.

---

## Security checklist (chapter 11 substance)

The project book must address these threats with specific responses:

- [ ] Password storage — bcrypt with cost ≥ 10
- [ ] JWT signing key in env, not committed; access + refresh token pair
- [ ] RBAC enforced server-side on every protected route
- [ ] Input validation on every endpoint (Zod)
- [ ] Rate limiting on auth endpoints (express-rate-limit)
- [ ] CORS configured with explicit origin allowlist
- [ ] Helmet for security headers
- [ ] SQL injection — N/A because Prisma parameterizes; document this
- [ ] XSS — React escapes by default; never use `dangerouslySetInnerHTML`
- [ ] Secrets handling — `.env` ignored, `.env.example` committed
- [ ] HTTPS in production (Render/Vercel handle automatically)
- [ ] Member PII minimization — collect only what's needed

For each, the book gets: *what the threat is, what we did, what we chose not
to do and why.*

---

## What this file is **not**

This file is not the project book. It's a working README for whoever is in
the repo — human or AI. The book lives in `docs/book/`.

When an AI assistant works in this repo:

- Read this file before doing anything.
- Match the conventions above.
- Update relevant docs (ADRs, worklog, security checklist) alongside code.
- Don't introduce dependencies casually — they get listed in chapter 7 and
  defended in chapter 6.
