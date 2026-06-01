/**
 * Jest globalSetup — runs once before the whole suite.
 *
 * Applies any pending Prisma migrations to the dedicated test database
 * (idempotent: a no-op when already up to date). This is why the suite only
 * needs the empty `library_test` database to exist; schema is brought up here.
 */
import 'dotenv/config'
import { execSync } from 'node:child_process'

export default async function globalSetup(): Promise<void> {
  const url = process.env.DATABASE_URL_TEST
  if (!url) {
    throw new Error('DATABASE_URL_TEST is not set — see backend/.env.example')
  }
  execSync('npx prisma migrate deploy', {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: url },
  })
}
