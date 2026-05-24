import { Router } from 'express'
import { requireAuth } from '../../middleware/auth.js'
import { requireRole } from '../../middleware/rbac.js'
import { validate } from '../../middleware/validate.js'
import {
  listMembersQuery,
  memberIdParams,
  updateMemberBody,
} from './members.schema.js'
import * as ctrl from './members.controller.js'

/** Mounted at /api/v1/members — librarian-only. */
const router = Router()
router.use(requireAuth, requireRole('LIBRARIAN'))
router.get('/', validate({ query: listMembersQuery }), ctrl.list)
router.get('/:id', validate({ params: memberIdParams }), ctrl.getById)
router.patch(
  '/:id',
  validate({ params: memberIdParams, body: updateMemberBody }),
  ctrl.update,
)
router.delete('/:id', validate({ params: memberIdParams }), ctrl.remove)
export default router
