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
