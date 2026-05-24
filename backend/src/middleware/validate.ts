import type { RequestHandler } from 'express'
import type { ZodSchema } from 'zod'

type Schemas = {
  body?: ZodSchema
  query?: ZodSchema
  params?: ZodSchema
}

/**
 * Factory: returns a middleware that parses `req.body / query / params`
 * with the given Zod schemas. Throws ZodError on mismatch — the
 * errorHandler turns that into a 400.
 *
 * @example
 *   router.post('/', validate({ body: createBookSchema }), controller.create)
 */
export const validate =
  (schemas: Schemas): RequestHandler =>
  (req, _res, next) => {
    try {
      if (schemas.body) req.body = schemas.body.parse(req.body)
      if (schemas.query) Object.assign(req.query, schemas.query.parse(req.query))
      if (schemas.params) Object.assign(req.params, schemas.params.parse(req.params))
      next()
    } catch (err) {
      next(err)
    }
  }
