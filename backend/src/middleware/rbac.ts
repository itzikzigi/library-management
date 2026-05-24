import type { RequestHandler } from 'express'
import type { Role } from '@prisma/client'
import { HttpError } from '../utils/HttpError.js'

/**
 * Role gate. Use after `requireAuth`. Returns 403 if the authed user's
 * role isn't in the allowed list. Per CLAUDE.md: role checks live in
 * middleware, never inline in route handlers.
 *
 * @example
 *   router.post('/books', requireAuth, requireRole('LIBRARIAN'), create)
 */
export const requireRole =
  (...allowed: Role[]): RequestHandler =>
  (req, _res, next) => {
    if (!req.user) {
      return next(new HttpError(401, 'UNAUTHORIZED', 'Authentication required'))
    }
    if (!allowed.includes(req.user.role)) {
      return next(new HttpError(403, 'FORBIDDEN', 'Insufficient permissions'))
    }
    next()
  }
