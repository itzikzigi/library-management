import type { NextFunction, Request, Response } from 'express'
import { HttpError } from '../../utils/HttpError.js'
import { getRecommendations } from './recommendations.service.js'

/**
 * GET /api/v1/recommendations
 * Purpose: hybrid book recommendations for the current user.
 * Output: { data: { profile: { ratingCount, alpha }, sections: [...] } }
 *
 * Returns 401 for guests. Cold-start (zero ratings) returns a response
 * with only the Trending section populated — the UI handles either case.
 */
export async function recommendations(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw new HttpError(401, 'UNAUTHORIZED', 'Authentication required')
    const data = await getRecommendations(req.user.id)
    res.json({ data })
  } catch (err) {
    next(err)
  }
}
