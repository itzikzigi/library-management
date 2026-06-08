# Library Management System with Smart Book Recommendations

MAHAT (מה"ט) final project — a web app for small libraries combining standard
catalog/circulation management with a hybrid book-recommendation engine.

- **backend/** — Node.js + Express + TypeScript + Prisma API
- **frontend/** — React + Vite + TypeScript SPA
- **docs/** — project-book material, ADRs, diagrams, worklog

For architecture, conventions, and the project-book chapter map, see
[`CLAUDE.md`](./CLAUDE.md).

---

## Prerequisites

- **Node.js** ≥ 20 and npm
- **Docker** + Docker Compose (for the PostgreSQL container)

## First-time setup

```bash
# 1. Create the backend env file from the template, then edit secrets if needed.
cp backend/.env.example backend/.env

# 2. Install all dependencies, start Postgres, apply migrations, seed data.
npm run setup
```

`npm run setup` runs, in order: `install:all` → `db:up` → `db:deploy` →
`db:seed`. The dev database is seeded with 10 users, 12 books, loans, and
ratings (see `backend/prisma/seed.ts`). The librarian login is
`sara@library.org` / `library123`; readers use `<name>@example.com` /
`reader123`.

## Running the services

```bash
npm run dev
```

Starts the API and the SPA together (via `concurrently`, with `[api]`/`[web]`
prefixed output; Ctrl+C stops both):

| Service  | URL                          |
|----------|------------------------------|
| Frontend | http://localhost:5173        |
| Backend  | http://localhost:4000        |
| Health   | http://localhost:4000/healthz |
| Postgres | localhost:5434 (in Docker)   |

To run one side only: `npm run dev:backend` or `npm run dev:frontend`.

---

## Script reference (run from the repo root)

| Script | What it does |
|---|---|
| `npm run dev` | Run API + SPA together (foreground, prefixed output) |
| `npm run dev:backend` | Run only the API (`tsx watch`) |
| `npm run dev:frontend` | Run only the SPA (`vite`) |
| `npm run db:up` | Start the Postgres container and wait until healthy |
| `npm run db:down` | Stop the Postgres container |
| `npm run db:logs` | Tail the Postgres container logs |
| `npm run db:deploy` | Apply Prisma migrations to the dev database |
| `npm run db:seed` | Seed the dev database (idempotent) |
| `npm test` | Run the backend Jest + Supertest suite |
| `npm run build` | Type-check + build both projects |
| `npm run install:all` | Install root + backend + frontend dependencies |
| `npm run setup` | One-shot: install everything, start the DB, migrate, seed |

The backend also exposes per-package scripts (`npm --prefix backend run …`):
`db:migrate` (interactive dev migration), `db:reset`, `db:studio`, etc.

## Testing

```bash
npm test          # backend Jest + Supertest (uses a separate library_test DB)
```

The suite runs against a dedicated `library_test` database so it never touches
dev data. `DATABASE_URL_TEST` in `backend/.env` points at it; create it once
with:

```bash
docker exec library-postgres psql -U library -d library -c "CREATE DATABASE library_test"
```

See [`docs/book/14-test-plan.md`](./docs/book/14-test-plan.md) for the full
test plan (chapter 14).
