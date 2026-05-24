import crypto from 'node:crypto'
import bcrypt from 'bcrypt'
import jwt, { type SignOptions } from 'jsonwebtoken'
import type { Role } from '@prisma/client'
import { env } from '../../env.js'

/**
 * Auth primitives: password hashing, access-JWT signing/verifying, and
 * opaque refresh-token generation + verification. The DB stores only
 * sha256(refresh) — the raw value lives in an httpOnly cookie.
 *
 * Why JWT for access but opaque tokens for refresh:
 *   - JWT access is stateless: every API call verifies a signature, no DB hit.
 *   - Opaque refresh is revocable: setting `revokedAt` invalidates instantly.
 *     Reusing JWT for refresh would force a blacklist (defeating statelessness).
 *
 * See docs/decisions/0002-authentication.md for the full rationale.
 */

const BCRYPT_COST = 12

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_COST)
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash)
}

type AccessPayload = { sub: string; role: Role }

export function signAccessToken(payload: AccessPayload): string {
  const opts: SignOptions = { expiresIn: env.JWT_ACCESS_TTL as SignOptions['expiresIn'] }
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, opts)
}

export function verifyAccessToken(token: string): AccessPayload {
  const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET)
  if (typeof decoded !== 'object' || decoded === null) {
    throw new Error('Malformed access token')
  }
  const { sub, role } = decoded as Record<string, unknown>
  if (typeof sub !== 'string' || typeof role !== 'string') {
    throw new Error('Malformed access token payload')
  }
  return { sub, role: role as Role }
}

/**
 * Generates a 48-byte random opaque token. Returns the raw value to send
 * to the client and the sha256 hash to persist in the DB. Raw value is
 * never written to disk or logs.
 */
export function generateRefreshToken(): { raw: string; hash: string; expiresAt: Date } {
  const raw = crypto.randomBytes(48).toString('base64url')
  const hash = sha256(raw)
  const expiresAt = new Date(Date.now() + ttlToMs(env.JWT_REFRESH_TTL))
  return { raw, hash, expiresAt }
}

export function hashRefreshToken(raw: string): string {
  return sha256(raw)
}

function sha256(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex')
}

/** Tiny TTL parser. Accepts e.g. "15m", "30d", "12h", "60s", "2w". */
export function ttlToMs(s: string): number {
  const m = /^(\d+)([smhdw])$/.exec(s)
  if (!m) throw new Error(`invalid TTL: ${s}`)
  const n = parseInt(m[1]!, 10)
  const mult = { s: 1e3, m: 6e4, h: 36e5, d: 864e5, w: 6048e5 }[m[2]!]!
  return n * mult
}
