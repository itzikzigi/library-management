import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import { env } from './env.js'
import { errorHandler } from './middleware/errorHandler.js'
import { HttpError } from './utils/HttpError.js'
import booksRouter from './modules/books/books.routes.js'
import authRouter from './modules/auth/auth.routes.js'
import { loansRouter, myLoansRouter } from './modules/loans/loans.routes.js'
import recommendationsRouter from './modules/recommendations/recommendations.routes.js'

/**
 * Build the Express app. Exported as a factory so tests can spin up an
 * instance without binding a port.
 */
export function createApp() {
  const app = express()

  app.disable('x-powered-by')
  app.set('trust proxy', 1) // for express-rate-limit IP detection behind a proxy
  app.use(helmet())
  app.use(cors({ origin: env.CORS_ORIGIN.split(','), credentials: true }))
  app.use(express.json({ limit: '100kb' }))
  app.use(cookieParser())

  app.get('/healthz', (_req, res) => {
    res.json({ status: 'ok', env: env.NODE_ENV })
  })

  app.use('/api/v1/auth', authRouter)
  app.use('/api/v1/books', booksRouter)
  app.use('/api/v1/loans', loansRouter)
  app.use('/api/v1/me/loans', myLoansRouter)
  app.use('/api/v1/recommendations', recommendationsRouter)

  // 404 for unknown routes
  app.use((_req, _res, next) => next(new HttpError(404, 'NOT_FOUND', 'Route not found')))

  app.use(errorHandler)
  return app
}
