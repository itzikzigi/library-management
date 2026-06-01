import type { Request, Response, NextFunction } from 'express'
import type { User } from '@prisma/client'
import { Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { env } from '../../env.js'
import { HttpError } from '../../utils/HttpError.js'
import {
  generateRefreshToken,
  hashPassword,
  hashRefreshToken,
  signAccessToken,
  ttlToMs,
  verifyPassword,
} from './auth.service.js'
import type { LoginBody, RegisterBody } from './auth.schema.js'

const REFRESH_COOKIE = 'refresh'
const REFRESH_COOKIE_PATH = '/api/v1/auth'

/**
 * POST /api/v1/auth/register
 * Purpose: create a new READER account and issue tokens.
 * Input: { email, password, firstName, lastName }
 * Output: 201 { accessToken, user } + httpOnly refresh cookie
 */
export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const body = req.body as RegisterBody
    const passwordHash = await hashPassword(body.password)
    let user: User
    try {
      user = await prisma.user.create({
        data: {
          email: body.email,
          passwordHash,
          firstName: body.firstName,
          lastName: body.lastName,
          // role defaults to READER
        },
      })
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new HttpError(409, 'EMAIL_TAKEN', 'An account with this email already exists')
      }
      throw err
    }
    await issueTokens(res, user)
    res.status(201).json({ user: toUserDTO(user), accessToken: res.locals.accessToken })
  } catch (err) {
    next(err)
  }
}

/**
 * POST /api/v1/auth/login
 * Purpose: verify credentials and issue tokens.
 * Input: { email, password }
 * Output: 200 { accessToken, user } + httpOnly refresh cookie
 */
export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const body = req.body as LoginBody
    const user = await prisma.user.findUnique({ where: { email: body.email } })
    // Same error for missing user and bad password — no email enumeration.
    if (!user || !(await verifyPassword(body.password, user.passwordHash))) {
      throw new HttpError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect')
    }
    await issueTokens(res, user)
    res.json({ user: toUserDTO(user), accessToken: res.locals.accessToken })
  } catch (err) {
    next(err)
  }
}

/**
 * POST /api/v1/auth/refresh
 * Purpose: exchange a valid refresh cookie for a fresh access token, and
 * rotate the refresh token. The old refresh token is revoked.
 * Input: refresh cookie
 * Output: 200 { accessToken } + new httpOnly refresh cookie
 *
 * Concurrency: rotation must be exactly-once even when two callers race
 * with the same cookie (two browser tabs booting at the same time, etc.).
 * The CAS-style `updateMany({ where: { revokedAt: null }, ... })` flips
 * the row only if it's still unrevoked; Postgres row-level locking
 * serialises concurrent UPDATEs so exactly one caller's `count` is 1.
 *
 * The CAS is the *sole* arbiter of revocation — we deliberately do NOT
 * short-circuit on `record.revokedAt` from the initial read. If we did,
 * a loser whose read happened to land *after* the winner committed the
 * revoke would fall into the INVALID_REFRESH path and clear the cookie,
 * race-overwriting the fresh cookie the winner just set in the same
 * response batch and logging a valid cross-tab session out. (Measured at
 * ~5% of races before this change — see tests/auth.refresh-race.test.ts.)
 *
 * So any *known, unexpired* token that the CAS finds already revoked —
 * whether a concurrent-rotation loser or a reuse of an already-rotated
 * token — returns 401 REFRESH_RACE and does NOT clear the cookie. The
 * client retries once on this code (single-flight, see api/refresh.ts);
 * a genuinely-dead token simply fails the retry and the session ends.
 * INVALID_REFRESH + cookie-clear is reserved for tokens that are unknown
 * (never existed / wrong hash) or past their expiry — never for the race.
 * We do not do token-family revocation, so clearing on reuse never bought
 * any theft protection; it was only client-side cookie hygiene.
 */
export async function refresh(req: Request, res: Response, next: NextFunction) {
  try {
    const raw = req.cookies?.[REFRESH_COOKIE]
    if (!raw) throw new HttpError(401, 'NO_REFRESH', 'No refresh token')

    const record = await prisma.refreshToken.findUnique({
      where: { tokenHash: hashRefreshToken(raw) },
      include: { user: true },
    })
    // Unknown or expired token: genuinely dead — clear the cookie. (A revoked
    // token is NOT handled here; it flows to the CAS below, see the header.)
    if (!record || record.expiresAt < new Date()) {
      clearRefreshCookie(res)
      throw new HttpError(401, 'INVALID_REFRESH', 'Refresh token is invalid or expired')
    }

    // Atomically claim the rotation. Only one parallel caller wins; everyone
    // else (race loser or stale-token reuse) gets REFRESH_RACE without a clear.
    const claim = await prisma.refreshToken.updateMany({
      where: { id: record.id, revokedAt: null },
      data: { revokedAt: new Date() },
    })
    if (claim.count === 0) {
      throw new HttpError(401, 'REFRESH_RACE', 'Refresh token already rotated, retry')
    }

    await issueTokens(res, record.user)
    res.json({ accessToken: res.locals.accessToken })
  } catch (err) {
    next(err)
  }
}

/**
 * POST /api/v1/auth/logout
 * Purpose: revoke the current refresh token, clear the cookie.
 * Input: refresh cookie (best-effort)
 * Output: 204
 */
export async function logout(req: Request, res: Response, next: NextFunction) {
  try {
    const raw = req.cookies?.[REFRESH_COOKIE]
    if (raw) {
      await prisma.refreshToken.updateMany({
        where: { tokenHash: hashRefreshToken(raw), revokedAt: null },
        data: { revokedAt: new Date() },
      })
    }
    clearRefreshCookie(res)
    res.status(204).send()
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/v1/auth/me
 * Purpose: return the authenticated user's profile.
 * Input: Bearer access token (via requireAuth)
 * Output: 200 { user }
 */
export async function me(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw new HttpError(401, 'UNAUTHORIZED', 'Authentication required')
    const user = await prisma.user.findUnique({ where: { id: req.user.id } })
    if (!user) throw new HttpError(401, 'UNAUTHORIZED', 'Account no longer exists')
    res.json({ user: toUserDTO(user) })
  } catch (err) {
    next(err)
  }
}

/* ---------- helpers ---------- */

async function issueTokens(res: Response, user: User): Promise<void> {
  const accessToken = signAccessToken({ sub: user.id, role: user.role })
  const refresh = generateRefreshToken()
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: refresh.hash,
      expiresAt: refresh.expiresAt,
    },
  })
  res.cookie(REFRESH_COOKIE, refresh.raw, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: REFRESH_COOKIE_PATH,
    maxAge: ttlToMs(env.JWT_REFRESH_TTL),
  })
  res.locals.accessToken = accessToken
}

function clearRefreshCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: REFRESH_COOKIE_PATH,
  })
}

function toUserDTO(user: User) {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    createdAt: user.createdAt,
  }
}
