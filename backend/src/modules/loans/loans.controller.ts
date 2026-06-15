import type { NextFunction, Request, Response } from 'express'
import { HttpError } from '../../utils/HttpError.js'
import * as service from './loans.service.js'
import type { BorrowBody } from './loans.schema.js'

/** POST /api/v1/loans — reader borrows a book. */
export async function borrow(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw new HttpError(401, 'UNAUTHORIZED', 'Authentication required')
    const { bookId } = req.body as BorrowBody
    const loan = await service.borrow(req.user.id, bookId)
    res.status(201).json({ data: service.toLoanDTO(loan) })
  } catch (err) {
    next(err)
  }
}

/** GET /api/v1/me/loans — current user's loans. */
export async function listMine(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw new HttpError(401, 'UNAUTHORIZED', 'Authentication required')
    const status = (req.query.status as 'active' | 'history' | 'all') ?? 'all'
    const loans = await service.listMine(req.user.id, status)
    res.json({ data: loans.map((l) => service.toLoanDTO(l)) })
  } catch (err) {
    next(err)
  }
}

/** POST /api/v1/loans/:id/return — librarian records a returned loan. */
export async function returnLoan(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw new HttpError(401, 'UNAUTHORIZED', 'Authentication required')
    const loan = await service.returnLoan(req.params.id!)
    res.json({ data: service.toLoanDTO(loan) })
  } catch (err) {
    next(err)
  }
}

/** POST /api/v1/loans/:id/renew — extend the due date. */
export async function renew(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw new HttpError(401, 'UNAUTHORIZED', 'Authentication required')
    const loan = await service.renew(req.params.id!, req.user.id)
    res.json({ data: service.toLoanDTO(loan) })
  } catch (err) {
    next(err)
  }
}

/** GET /api/v1/loans — librarian view; includes borrower info on each loan. */
export async function listAll(req: Request, res: Response, next: NextFunction) {
  try {
    const q = req.query as unknown as {
      status: 'active' | 'overdue' | 'returned' | 'all'
      q?: string
      limit: number
      sort: 'recent' | 'due-soonest'
    }
    const loans = await service.listAll(q)
    res.json({ data: loans.map((l) => service.toLoanDTO(l, true)) })
  } catch (err) {
    next(err)
  }
}
