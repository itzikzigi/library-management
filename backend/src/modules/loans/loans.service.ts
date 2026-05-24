import { Prisma, type Loan } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { HttpError } from '../../utils/HttpError.js'
import {
  FINE_PER_DAY,
  LOAN_PERIOD_DAYS,
  MAX_ACTIVE_LOANS_PER_READER,
  MAX_RENEWALS,
  RENEWAL_DAYS,
} from './loans.config.js'

/**
 * Atomically borrow any AVAILABLE copy of a book. Returns the created loan
 * with book + author joined. Races (two readers grabbing the last copy at
 * once) are resolved by an `updateMany` with status guard — the loser sees
 * `count === 0` and gets NO_COPY.
 */
export async function borrow(userId: string, bookId: string) {
  return prisma.$transaction(async (tx) => {
    const activeCount = await tx.loan.count({
      where: { borrowerId: userId, returnedAt: null },
    })
    if (activeCount >= MAX_ACTIVE_LOANS_PER_READER) {
      throw new HttpError(
        403,
        'LOAN_LIMIT_REACHED',
        `You can have at most ${MAX_ACTIVE_LOANS_PER_READER} active loans`,
      )
    }

    const candidate = await tx.bookCopy.findFirst({
      where: { bookId, status: 'AVAILABLE' },
      orderBy: { acquiredAt: 'asc' },
    })
    if (!candidate) {
      throw new HttpError(409, 'NO_COPY_AVAILABLE', 'No copies are currently available')
    }

    const claimed = await tx.bookCopy.updateMany({
      where: { id: candidate.id, status: 'AVAILABLE' },
      data: { status: 'ON_LOAN' },
    })
    if (claimed.count === 0) {
      throw new HttpError(
        409,
        'NO_COPY_AVAILABLE',
        'The last copy was just taken — please try again',
      )
    }

    const dueAt = new Date()
    dueAt.setDate(dueAt.getDate() + LOAN_PERIOD_DAYS)

    return tx.loan.create({
      data: { borrowerId: userId, copyId: candidate.id, dueAt },
      include: LOAN_INCLUDE,
    })
  })
}

/**
 * Mark a loan as returned. Caller must be the borrower or a librarian.
 * Flips the copy back to AVAILABLE in the same transaction.
 */
export async function returnLoan(
  loanId: string,
  requesterId: string,
  requesterRole: 'READER' | 'LIBRARIAN',
) {
  const loan = await prisma.loan.findUnique({ where: { id: loanId } })
  if (!loan) throw new HttpError(404, 'NOT_FOUND', 'Loan not found')
  if (loan.borrowerId !== requesterId && requesterRole !== 'LIBRARIAN') {
    throw new HttpError(403, 'FORBIDDEN', 'You can only return your own loans')
  }
  if (loan.returnedAt) {
    throw new HttpError(400, 'ALREADY_RETURNED', 'This loan was already returned')
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.loan.update({
      where: { id: loan.id },
      data: { returnedAt: new Date() },
      include: LOAN_INCLUDE,
    })
    await tx.bookCopy.update({
      where: { id: loan.copyId },
      data: { status: 'AVAILABLE' },
    })
    return updated
  })
}

/**
 * Extend a loan's due date. The borrower can renew up to MAX_RENEWALS
 * times provided the loan is not yet overdue. Each renewal adds
 * RENEWAL_DAYS to the existing due date.
 */
export async function renew(loanId: string, requesterId: string) {
  const loan = await prisma.loan.findUnique({ where: { id: loanId } })
  if (!loan || loan.borrowerId !== requesterId) {
    throw new HttpError(404, 'NOT_FOUND', 'Loan not found')
  }
  if (loan.returnedAt) {
    throw new HttpError(400, 'ALREADY_RETURNED', 'Cannot renew a returned loan')
  }
  if (loan.dueAt < new Date()) {
    throw new HttpError(
      403,
      'OVERDUE',
      'Loan is overdue — please return it first',
    )
  }
  if (loan.renewals >= MAX_RENEWALS) {
    throw new HttpError(
      403,
      'RENEWAL_LIMIT_REACHED',
      `Already renewed ${MAX_RENEWALS} times`,
    )
  }

  const newDue = new Date(loan.dueAt)
  newDue.setDate(newDue.getDate() + RENEWAL_DAYS)

  return prisma.loan.update({
    where: { id: loan.id },
    data: { dueAt: newDue, renewals: { increment: 1 } },
    include: LOAN_INCLUDE,
  })
}

/** Loans for one user. `status` filters: active = not returned; history = returned. */
export async function listMine(userId: string, status: 'active' | 'history' | 'all') {
  const where: Prisma.LoanWhereInput = { borrowerId: userId }
  if (status === 'active') where.returnedAt = null
  if (status === 'history') where.returnedAt = { not: null }

  const loans = await prisma.loan.findMany({
    where,
    include: LOAN_INCLUDE,
    orderBy: [{ returnedAt: 'asc' }, { dueAt: 'asc' }],
  })
  return loans
}

/** All loans, for the librarian dashboard. */
export async function listAll(opts: {
  status: 'active' | 'overdue' | 'returned' | 'all'
  q?: string
  limit: number
  sort: 'recent' | 'due-soonest'
}) {
  const where: Prisma.LoanWhereInput = {}
  const now = new Date()
  if (opts.status === 'active') where.returnedAt = null
  if (opts.status === 'returned') where.returnedAt = { not: null }
  if (opts.status === 'overdue') {
    where.returnedAt = null
    where.dueAt = { lt: now }
  }
  if (opts.q) {
    where.OR = [
      { copy: { book: { title: { contains: opts.q, mode: 'insensitive' } } } },
      { borrower: { firstName: { contains: opts.q, mode: 'insensitive' } } },
      { borrower: { lastName: { contains: opts.q, mode: 'insensitive' } } },
      { borrower: { email: { contains: opts.q, mode: 'insensitive' } } },
    ]
  }

  const orderBy: Prisma.LoanOrderByWithRelationInput =
    opts.sort === 'due-soonest' ? { dueAt: 'asc' } : { borrowedAt: 'desc' }

  return prisma.loan.findMany({
    where,
    take: opts.limit,
    orderBy,
    include: { ...LOAN_INCLUDE, borrower: true },
  })
}

/* ---------- DTO mapping ---------- */

export const LOAN_INCLUDE = {
  copy: {
    include: {
      book: { include: { author: true } },
    },
  },
} as const

type LoanWithBook = Prisma.LoanGetPayload<{ include: typeof LOAN_INCLUDE }>
type LoanWithBorrower = Prisma.LoanGetPayload<{
  include: typeof LOAN_INCLUDE & { borrower: true }
}>

export function toLoanDTO(loan: LoanWithBook | LoanWithBorrower, includeBorrower = false) {
  const now = new Date()
  const status: 'on-loan' | 'overdue' | 'returned' = loan.returnedAt
    ? 'returned'
    : loan.dueAt < now
    ? 'overdue'
    : 'on-loan'

  const msInDay = 24 * 60 * 60 * 1000
  const daysUntilDue =
    loan.returnedAt === null
      ? Math.ceil((loan.dueAt.getTime() - now.getTime()) / msInDay)
      : null
  const daysOverdue =
    status === 'overdue'
      ? Math.floor((now.getTime() - loan.dueAt.getTime()) / msInDay)
      : 0
  const fine = daysOverdue > 0 ? daysOverdue * FINE_PER_DAY : 0
  const canRenew =
    status === 'on-loan' && loan.renewals < MAX_RENEWALS && daysOverdue === 0

  const dto: Record<string, unknown> = {
    id: loan.id,
    borrowedAt: loan.borrowedAt.toISOString(),
    dueAt: loan.dueAt.toISOString(),
    returnedAt: loan.returnedAt?.toISOString() ?? null,
    renewals: loan.renewals,
    status,
    daysUntilDue,
    daysOverdue,
    fine,
    canRenew,
    book: {
      id: loan.copy.book.id,
      title: loan.copy.book.title,
      author: loan.copy.book.author.name,
      language: loan.copy.book.language,
      isbn: loan.copy.book.isbn,
    },
  }

  if (includeBorrower && 'borrower' in loan && loan.borrower) {
    dto.borrower = {
      id: loan.borrower.id,
      firstName: loan.borrower.firstName,
      lastName: loan.borrower.lastName,
      email: loan.borrower.email,
    }
  }

  return dto
}

// Re-exported for use in seed.
export type SeedLoan = Loan
