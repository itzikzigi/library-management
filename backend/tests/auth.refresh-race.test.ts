import request from 'supertest'
import { createApp } from '../src/app.js'
import { prisma } from '../src/lib/prisma.js'
import { generateRefreshToken, hashPassword } from '../src/modules/auth/auth.service.js'

/**
 * F7 — Parallel /auth/refresh CAS race (MAHAT chapter 14, full-flow table).
 *
 * The row that cannot be reproduced by hand: the window between two callers
 * presenting the SAME refresh cookie is sub-millisecond. We drive it with
 * `Promise.all` against a real Postgres, because the guarantee under test —
 * exactly one caller wins the rotation — rests on Postgres row-level lock
 * serialisation of the `updateMany({ where: { id, revokedAt: null } })` CAS
 * in auth.controller.ts. A mocked DB would always "pass" and prove nothing.
 *
 * Contract (after the fix that made the CAS the sole arbiter of revocation):
 *   1. Exactly one of two concurrent refreshes returns 200 (rotates the cookie).
 *   2. The loser returns 401 REFRESH_RACE — every time, no timing dependence.
 *   3. The loser does NOT clear the cookie (clearing would race-overwrite the
 *      winner's freshly-set cookie and log a valid cross-tab session out).
 *   4. INVALID_REFRESH + clear is reserved for unknown / expired tokens.
 */

const app = createApp()
let userId: string

function cookiePair(setCookie: string[] | undefined, name: string): string | undefined {
  return setCookie?.find((c) => c.startsWith(`${name}=`))?.split(';')[0]
}
function setsFreshCookie(setCookie: string[] | undefined, name: string): boolean {
  const pair = cookiePair(setCookie, name)
  return pair !== undefined && pair !== `${name}=`
}
function clearsCookie(setCookie: string[] | undefined, name: string): boolean {
  // express clearCookie emits `refresh=; Path=...; Expires=Thu, 01 Jan 1970 ...`
  return (setCookie ?? []).some((c) => c.startsWith(`${name}=;`))
}

/** Mint a fresh, live refresh-token row for the test user; return its cookie. */
async function freshCookie(): Promise<string> {
  const t = generateRefreshToken()
  await prisma.refreshToken.create({ data: { userId, tokenHash: t.hash, expiresAt: t.expiresAt } })
  return `refresh=${t.raw}`
}

beforeAll(async () => {
  // Seed the user directly: registering 8+ times over HTTP would trip the
  // 10-per-15-min auth rate limiter and is irrelevant to the rotation race.
  const user = await prisma.user.create({
    data: {
      email: `f7-race-${Date.now()}@example.com`,
      passwordHash: await hashPassword('race-test-123'),
      firstName: 'F7',
      lastName: 'Race',
    },
  })
  userId = user.id
})

afterAll(async () => {
  await prisma.user.deleteMany({ where: { id: userId } })
  await prisma.$disconnect()
})

describe('F7 — parallel /auth/refresh rotation race', () => {
  it('runs the race 8× — exactly one winner; loser is always REFRESH_RACE and keeps its cookie', async () => {
    for (let i = 0; i < 8; i++) {
      const cookie = await freshCookie()
      const [a, b] = await Promise.all([
        request(app).post('/api/v1/auth/refresh').set('Cookie', cookie),
        request(app).post('/api/v1/auth/refresh').set('Cookie', cookie),
      ])

      // (1) exactly one winner.
      expect([a.status, b.status].sort()).toEqual([200, 401])
      const winner = a.status === 200 ? a : b
      const loser = a.status === 200 ? b : a

      // (2) loser is specifically REFRESH_RACE — deterministic now.
      expect(loser.body?.error?.code).toBe('REFRESH_RACE')

      // (3) winner rotated the cookie; loser left it untouched (no clear).
      expect(setsFreshCookie(winner.headers['set-cookie'] as unknown as string[], 'refresh')).toBe(true)
      expect(winner.body).toHaveProperty('accessToken')
      expect(clearsCookie(loser.headers['set-cookie'] as unknown as string[], 'refresh')).toBe(false)
      expect(setsFreshCookie(loser.headers['set-cookie'] as unknown as string[], 'refresh')).toBe(false)
    }
  })

  it("winner's new cookie works; reusing the rotated-away token is a no-clear REFRESH_RACE", async () => {
    const original = await freshCookie()

    const win = await request(app).post('/api/v1/auth/refresh').set('Cookie', original)
    expect(win.status).toBe(200)
    const rotated = cookiePair(win.headers['set-cookie'] as unknown as string[], 'refresh')!

    // The freshly-minted cookie is usable.
    const followUp = await request(app).post('/api/v1/auth/refresh').set('Cookie', rotated)
    expect(followUp.status).toBe(200)

    // Reuse of the now-revoked original (the old F6 scenario) is REFRESH_RACE
    // and must NOT clear the cookie.
    const reused = await request(app).post('/api/v1/auth/refresh').set('Cookie', original)
    expect(reused.status).toBe(401)
    expect(reused.body?.error?.code).toBe('REFRESH_RACE')
    expect(clearsCookie(reused.headers['set-cookie'] as unknown as string[], 'refresh')).toBe(false)
  })

  it('an unknown token is INVALID_REFRESH and clears the cookie', async () => {
    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', 'refresh=this-token-was-never-issued')
    expect(res.status).toBe(401)
    expect(res.body?.error?.code).toBe('INVALID_REFRESH')
    expect(clearsCookie(res.headers['set-cookie'] as unknown as string[], 'refresh')).toBe(true)
  })
})
