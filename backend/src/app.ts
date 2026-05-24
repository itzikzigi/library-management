import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { env } from './env.js'
import { errorHandler } from './middleware/errorHandler.js'
import { HttpError } from './utils/HttpError.js'
import booksRouter from './modules/books/books.routes.js'

/**
 * Build the Express app. Exported as a factory so tests can spin up an
 * instance without binding a port.
 */
export function createApp() {
  const app = express()

  app.disable('x-powered-by')
  app.use(helmet())
  app.use(cors({ origin: env.CORS_ORIGIN.split(','), credentials: true }))
  app.use(express.json({ limit: '100kb' }))

  app.get('/healthz', (_req, res) => {
    res.json({ status: 'ok', env: env.NODE_ENV })
  })

  app.use('/api/v1/books', booksRouter)

  // 404 for unknown routes
  app.use((_req, _res, next) => next(new HttpError(404, 'NOT_FOUND', 'Route not found')))

  app.use(errorHandler)
  return app
}
