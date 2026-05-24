import type { NextFunction, Request, Response } from 'express'
import { HttpError } from '../../utils/HttpError.js'
import * as svc from './reservations.service.js'
import type { ListMyReservationsQuery } from './reservations.schema.js'

/**
 * POST /api/v1/books/:bookId/reservations
 * Purpose: reader places a hold on a book with no available copies.
 * Output: 201 { data: ReservationDTO }
 */
export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw new HttpError(401, 'UNAUTHORIZED', 'Authentication required')
    const reservation = await svc.createReservation(req.user.id, req.params.bookId!)
    // Compute queue position by listing the user's own (cheap reuse).
    const mine = await svc.listMyReservations(req.user.id, 'active')
    const dto = mine.find((r) => r.id === reservation.id) ?? null
    res.status(201).json({ data: dto })
  } catch (err) {
    next(err)
  }
}

/**
 * DELETE /api/v1/reservations/:id
 * Purpose: reader cancels their own PENDING hold.
 */
export async function cancel(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw new HttpError(401, 'UNAUTHORIZED', 'Authentication required')
    await svc.cancelReservation(req.params.id!, req.user.id)
    res.status(204).send()
  } catch (err) {
    next(err)
  }
}

/** GET /api/v1/me/reservations — current user. */
export async function listMine(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw new HttpError(401, 'UNAUTHORIZED', 'Authentication required')
    const { status } = req.query as unknown as ListMyReservationsQuery
    const data = await svc.listMyReservations(req.user.id, status)
    res.json({ data })
  } catch (err) {
    next(err)
  }
}

/** GET /api/v1/reservations — librarian-only, all PENDING. */
export async function listAll(_req: Request, res: Response, next: NextFunction) {
  try {
    const data = await svc.listAllPending()
    res.json({ data })
  } catch (err) {
    next(err)
  }
}
