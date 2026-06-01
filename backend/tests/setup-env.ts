/**
 * Runs (via Jest `setupFiles`) before any application module is imported, so
 * it can redirect Prisma at the test database *before* `env.ts` reads the
 * connection string and `lib/prisma.ts` constructs the client.
 *
 * dotenv does not override variables already present in the environment, so
 * loading `.env` here is safe: we read DATABASE_URL_TEST from it and copy it
 * onto DATABASE_URL. The later `import 'dotenv/config'` inside `env.ts` then
 * leaves our DATABASE_URL untouched.
 */
import 'dotenv/config'

process.env.NODE_ENV = 'test'

const testUrl = process.env.DATABASE_URL_TEST
if (!testUrl) {
  throw new Error(
    'DATABASE_URL_TEST is not set. Add it to backend/.env (see .env.example) — ' +
      'the suite refuses to run against the dev database.',
  )
}
process.env.DATABASE_URL = testUrl
