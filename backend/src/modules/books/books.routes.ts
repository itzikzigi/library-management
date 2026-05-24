import { Router } from 'express'
import { list, getById } from './books.controller.js'
import { validate } from '../../middleware/validate.js'
import { idParamsSchema, listQuerySchema } from './books.schema.js'
import { optionalAuth } from '../../middleware/auth.js'
import ratingsRouter from '../ratings/ratings.routes.js'

const router = Router()

router.get('/', validate({ query: listQuerySchema }), list)
router.get('/:id', optionalAuth, validate({ params: idParamsSchema }), getById)

// Nested ratings router — /:id/ratings
router.use('/:bookId/ratings', ratingsRouter)

export default router
