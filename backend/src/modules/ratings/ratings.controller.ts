import type { NextFunction, Request, Response } from 'express'
import { prisma } from '../../lib/prisma.js'
import { HttpError } from '../../utils/HttpError.js'
import type { RateBookBody } from './ratings.schema.js'

/**
 * POST /api/v1/books/:bookId/ratings
 * Purpose: upsert the current user's rating for a book. Used by the
 * BookDetail star widget and the (future) onboarding flow.
 * Input: param :bookId, body { value: 1..5 }
 * Output: 200 { data: { value, updatedAt } }
 */
export async function rate(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw new HttpError(401, 'UNAUTHORIZED', 'Authentication required')
    const bookId = req.params.bookId!
    const { value } = req.body as RateBookBody

    const book = await prisma.book.findUnique({ where: { id: bookId }, select: { id: true } })
    if (!book) throw new HttpError(404, 'NOT_FOUND', 'Book not found')

    const rating = await prisma.rating.upsert({
      where: { userId_bookId: { userId: req.user.id, bookId } },
      update: { value },
      create: { userId: req.user.id, bookId, value },
    })

    res.json({ data: { value: rating.value, updatedAt: rating.updatedAt.toISOString() } })
  } catch (err) {
    next(err)
  }
}

/**
 * DELETE /api/v1/books/:bookId/ratings
 * Purpose: remove the current user's rating for a book.
 * Output: 204 on success, 404 if no rating existed.
 */
export async function unrate(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw new HttpError(401, 'UNAUTHORIZED', 'Authentication required')
    const bookId = req.params.bookId!
    const result = await prisma.rating.deleteMany({
      where: { userId: req.user.id, bookId },
    })
    if (result.count === 0) {
      throw new HttpError(404, 'NOT_FOUND', 'No rating to delete')
    }
    res.status(204).send()
  } catch (err) {
    next(err)
  }
}
