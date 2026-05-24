import { Router } from 'express'
import { requireAuth } from '../../middleware/auth.js'
import { requireRole } from '../../middleware/rbac.js'
import { validate } from '../../middleware/validate.js'
import {
  listMyReservationsQuery,
  reservationIdParams,
  reserveParams,
} from './reservations.schema.js'
import * as ctrl from './reservations.controller.js'

/** Mounted at /api/v1/books/:bookId/reservations — reader create. */
export const bookReservationsRouter = Router({ mergeParams: true })
bookReservationsRouter.use(requireAuth)
bookReservationsRouter.post('/', validate({ params: reserveParams }), ctrl.create)

/** Mounted at /api/v1/reservations — librarian list, reader cancel. */
export const reservationsRouter = Router()
reservationsRouter.use(requireAuth)
reservationsRouter.delete('/:id', validate({ params: reservationIdParams }), ctrl.cancel)
reservationsRouter.get('/', requireRole('LIBRARIAN'), ctrl.listAll)

/** Mounted at /api/v1/me/reservations — reader's own. */
export const myReservationsRouter = Router()
myReservationsRouter.use(requireAuth)
myReservationsRouter.get('/', validate({ query: listMyReservationsQuery }), ctrl.listMine)
