import { Router } from 'express'
import { list, getById } from './books.controller.js'
import { validate } from '../../middleware/validate.js'
import { idParamsSchema, listQuerySchema } from './books.schema.js'

const router = Router()

router.get('/', validate({ query: listQuerySchema }), list)
router.get('/:id', validate({ params: idParamsSchema }), getById)

export default router
