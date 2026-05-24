import { Router } from 'express'
import { requireAuth } from '../../middleware/auth.js'
import { validate } from '../../middleware/validate.js'
import { rateBookBody, rateBookParams } from './ratings.schema.js'
import * as ctrl from './ratings.controller.js'

/**
 * Mounted at /api/v1/books/:bookId/ratings — nested under books so the
 * book id arrives as a route param. mergeParams: true lets this child
 * router see params from the parent path.
 */
const router = Router({ mergeParams: true })
router.use(requireAuth)
router.post('/', validate({ params: rateBookParams, body: rateBookBody }), ctrl.rate)
router.delete('/', validate({ params: rateBookParams }), ctrl.unrate)
export default router
