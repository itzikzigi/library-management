import type { RequestHandler } from 'express'
import { HttpError } from '../utils/HttpError.js'
import { verifyAccessToken } from '../modules/auth/auth.service.js'

/**
 * Bearer-JWT auth. Reads `Authorization: Bearer <token>`, verifies the
 * signature, and attaches `{ id, role }` to `req.user`. Throws 401 on
 * missing or invalid tokens — the errorHandler renders the canonical shape.
 *
 * Note: stateless — no DB lookup. The access JWT carries the user id and
 * role in its payload, which is why TTL is short (15m default).
 */
export const requireAuth: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    return next(new HttpError(401, 'UNAUTHORIZED', 'Missing access token'))
  }
  const token = header.slice(7)
  try {
    const { sub, role } = verifyAccessToken(token)
    req.user = { id: sub, role }
    next()
  } catch {
    next(new HttpError(401, 'UNAUTHORIZED', 'Invalid or expired access token'))
  }
}

/**
 * Soft auth. If a valid Bearer token is present, populate `req.user`.
 * If the header is absent, pass through as a guest. If a malformed or
 * expired token is presented, return 401 — the frontend interceptor will
 * try to refresh and retry. Used on endpoints that are public for guests
 * but return personalized fields (e.g. `myRating`) when authed.
 */
export const optionalAuth: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) return next()
  const token = header.slice(7)
  try {
    const { sub, role } = verifyAccessToken(token)
    req.user = { id: sub, role }
    next()
  } catch {
    next(new HttpError(401, 'UNAUTHORIZED', 'Invalid or expired access token'))
  }
}
