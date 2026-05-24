import { Router } from 'express'
import { requireAuth } from '../../middleware/auth.js'
import { recommendations } from './recommendations.controller.js'

/** Mounted at /api/v1/recommendations — reader-only, requires auth. */
const router = Router()
router.use(requireAuth)
router.get('/', recommendations)
export default router
