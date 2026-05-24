import { Router } from 'express'
import { create, getById, list, remove, update } from './books.controller.js'
import { validate } from '../../middleware/validate.js'
import {
  createBookBody,
  idParamsSchema,
  listQuerySchema,
  updateBookBody,
} from './books.schema.js'
import { optionalAuth, requireAuth } from '../../middleware/auth.js'
import { requireRole } from '../../middleware/rbac.js'
import ratingsRouter from '../ratings/ratings.routes.js'
import { bookReservationsRouter } from '../reservations/reservations.routes.js'

const router = Router()

router.get('/', validate({ query: listQuerySchema }), list)
router.get('/:id', optionalAuth, validate({ params: idParamsSchema }), getById)

// Librarian-only mutations.
router.post(
  '/',
  requireAuth,
  requireRole('LIBRARIAN'),
  validate({ body: createBookBody }),
  create,
)
router.patch(
  '/:id',
  requireAuth,
  requireRole('LIBRARIAN'),
  validate({ params: idParamsSchema, body: updateBookBody }),
  update,
)
router.delete(
  '/:id',
  requireAuth,
  requireRole('LIBRARIAN'),
  validate({ params: idParamsSchema }),
  remove,
)

// Nested ratings router — /:id/ratings
router.use('/:bookId/ratings', ratingsRouter)
// Nested reservations router — /:id/reservations (reader POST only)
router.use('/:bookId/reservations', bookReservationsRouter)

export default router
