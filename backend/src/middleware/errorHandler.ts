import type { ErrorRequestHandler } from 'express'
import { ZodError } from 'zod'
import { HttpError } from '../utils/HttpError.js'

/**
 * Central error sink. Converts Zod validation errors, HttpError instances,
 * and unknown errors into the canonical `{ error: { code, message } }` shape.
 * Per CLAUDE.md: every API error flows through here, no inline responses.
 */
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request',
        details: err.flatten(),
      },
    })
    return
  }
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: { code: err.code, message: err.message } })
    return
  }
  console.error('Unhandled error:', err)
  res
    .status(500)
    .json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } })
}
