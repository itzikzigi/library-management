import { Router } from 'express'
import { validate } from '../../middleware/validate.js'
import { authLimiter } from '../../middleware/rateLimit.js'
import { requireAuth } from '../../middleware/auth.js'
import { loginSchema, registerSchema } from './auth.schema.js'
import { login, logout, me, refresh, register } from './auth.controller.js'

const router = Router()

router.post('/register', authLimiter, validate({ body: registerSchema }), register)
router.post('/login', authLimiter, validate({ body: loginSchema }), login)
router.post('/refresh', refresh)
router.post('/logout', logout)
router.get('/me', requireAuth, me)

export default router
