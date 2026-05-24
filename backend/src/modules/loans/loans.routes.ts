import { Router } from 'express'
import { requireAuth } from '../../middleware/auth.js'
import { requireRole } from '../../middleware/rbac.js'
import { validate } from '../../middleware/validate.js'
import {
  borrowSchema,
  librarianLoansQuery,
  loanIdParams,
  myLoansQuery,
} from './loans.schema.js'
import * as ctrl from './loans.controller.js'

/** Mounted at /api/v1/loans — reader + librarian actions. */
export const loansRouter = Router()
loansRouter.use(requireAuth)
loansRouter.post('/', validate({ body: borrowSchema }), ctrl.borrow)
loansRouter.post('/:id/return', validate({ params: loanIdParams }), ctrl.returnLoan)
loansRouter.post('/:id/renew', validate({ params: loanIdParams }), ctrl.renew)
loansRouter.get(
  '/',
  requireRole('LIBRARIAN'),
  validate({ query: librarianLoansQuery }),
  ctrl.listAll,
)

/** Mounted at /api/v1/me/loans — caller's own loans. */
export const myLoansRouter = Router()
myLoansRouter.use(requireAuth)
myLoansRouter.get('/', validate({ query: myLoansQuery }), ctrl.listMine)
