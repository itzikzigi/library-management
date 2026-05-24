import { Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { HttpError } from '../../utils/HttpError.js'
import { MAX_PENDING_RESERVATIONS_PER_READER } from './reservations.config.js'

/**
 * Reservations form a per-book queue. Order is `createdAt asc` among
 * status=PENDING. A reader can only have one PENDING reservation per
 * book; they cannot reserve a book that has an AVAILABLE copy in stock
 * (they should borrow instead). When a loan is returned, `loans.service`
 * walks to this module to fulfill the head of that book's queue.
 */

export type ReservationDTO = {
  id: string
  status: 'PENDING' | 'FULFILLED' | 'CANCELLED' | 'EXPIRED'
  createdAt: string
  fulfilledAt: string | null
  cancelledAt: string | null
  queuePosition: number | null // null for non-PENDING entries
  book: {
    id: string
    title: string
    author: string
    language: 'HE' | 'EN'
    isbn: string | null
  }
}

const RESERVATION_INCLUDE = {
  book: { include: { author: true } },
} as const

type ReservationWithBook = Prisma.ReservationGetPayload<{
  include: typeof RESERVATION_INCLUDE
}>

export async function createReservation(userId: string, bookId: string) {
  const book = await prisma.book.findUnique({
    where: { id: bookId },
    include: {
      copies: { select: { status: true } },
    },
  })
  if (!book) throw new HttpError(404, 'NOT_FOUND', 'Book not found')

  if (book.copies.some((c) => c.status === 'AVAILABLE')) {
    throw new HttpError(
      409,
      'COPIES_AVAILABLE',
      'Copies are available — please borrow instead of reserving',
    )
  }

  // One PENDING per (user, book).
  const existing = await prisma.reservation.findFirst({
    where: { userId, bookId, status: 'PENDING' },
  })
  if (existing) {
    throw new HttpError(409, 'ALREADY_RESERVED', 'You already have this book on hold')
  }

  const activeCount = await prisma.reservation.count({
    where: { userId, status: 'PENDING' },
  })
  if (activeCount >= MAX_PENDING_RESERVATIONS_PER_READER) {
    throw new HttpError(
      403,
      'RESERVATION_LIMIT_REACHED',
      `You can have at most ${MAX_PENDING_RESERVATIONS_PER_READER} active holds`,
    )
  }

  return prisma.reservation.create({
    data: { userId, bookId, status: 'PENDING' },
    include: RESERVATION_INCLUDE,
  })
}

export async function cancelReservation(reservationId: string, requesterId: string) {
  const reservation = await prisma.reservation.findUnique({ where: { id: reservationId } })
  if (!reservation) throw new HttpError(404, 'NOT_FOUND', 'Reservation not found')
  if (reservation.userId !== requesterId) {
    throw new HttpError(403, 'FORBIDDEN', 'You can only cancel your own reservations')
  }
  if (reservation.status !== 'PENDING') {
    throw new HttpError(
      400,
      'NOT_PENDING',
      `Reservation is already ${reservation.status.toLowerCase()}`,
    )
  }
  await prisma.reservation.update({
    where: { id: reservationId },
    data: { status: 'CANCELLED', cancelledAt: new Date() },
  })
}

/**
 * Reader-facing list of their own reservations. Computes queue position
 * per row (1-based, only meaningful for PENDING).
 */
export async function listMyReservations(
  userId: string,
  status: 'active' | 'history' | 'all',
) {
  const where: Prisma.ReservationWhereInput = { userId }
  if (status === 'active') where.status = 'PENDING'
  if (status === 'history') where.status = { not: 'PENDING' }

  const rows = await prisma.reservation.findMany({
    where,
    include: RESERVATION_INCLUDE,
    orderBy: { createdAt: 'asc' },
  })

  // Compute queue positions in one round-trip.
  const pendingByBook = new Map<string, string[]>()
  const bookIds = [...new Set(rows.filter((r) => r.status === 'PENDING').map((r) => r.bookId))]
  if (bookIds.length > 0) {
    const allPending = await prisma.reservation.findMany({
      where: { bookId: { in: bookIds }, status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
      select: { id: true, bookId: true },
    })
    for (const p of allPending) {
      const arr = pendingByBook.get(p.bookId) ?? []
      arr.push(p.id)
      pendingByBook.set(p.bookId, arr)
    }
  }

  return rows.map((r) => toReservationDTO(r, pendingByBook))
}

/** Librarian view — all currently PENDING reservations across the library. */
export async function listAllPending() {
  const rows = await prisma.reservation.findMany({
    where: { status: 'PENDING' },
    include: { ...RESERVATION_INCLUDE, user: true },
    orderBy: { createdAt: 'asc' },
  })
  const pendingByBook = new Map<string, string[]>()
  for (const r of rows) {
    const arr = pendingByBook.get(r.bookId) ?? []
    arr.push(r.id)
    pendingByBook.set(r.bookId, arr)
  }
  return rows.map((r) => ({
    ...toReservationDTO(r, pendingByBook),
    user: {
      id: r.user.id,
      firstName: r.user.firstName,
      lastName: r.user.lastName,
      email: r.user.email,
    },
  }))
}

/**
 * Called from loans.service.returnLoan inside the same transaction.
 * Fulfills the head of the queue for a given book, if any. Idempotent
 * by status — a second call on an empty queue is a no-op. The fulfilled
 * reservation does NOT auto-borrow; the reader still has to come back
 * and click Borrow (standard small-library "hold pickup" pattern).
 */
export async function fulfillNextInQueue(
  tx: Prisma.TransactionClient,
  bookId: string,
): Promise<{ userId: string; reservationId: string } | null> {
  const next = await tx.reservation.findFirst({
    where: { bookId, status: 'PENDING' },
    orderBy: { createdAt: 'asc' },
  })
  if (!next) return null
  await tx.reservation.update({
    where: { id: next.id },
    data: { status: 'FULFILLED', fulfilledAt: new Date() },
  })
  return { userId: next.userId, reservationId: next.id }
}

function toReservationDTO(
  r: ReservationWithBook,
  pendingByBook: Map<string, string[]>,
): ReservationDTO {
  let queuePosition: number | null = null
  if (r.status === 'PENDING') {
    const ids = pendingByBook.get(r.bookId) ?? []
    const idx = ids.indexOf(r.id)
    queuePosition = idx >= 0 ? idx + 1 : null
  }
  return {
    id: r.id,
    status: r.status,
    createdAt: r.createdAt.toISOString(),
    fulfilledAt: r.fulfilledAt?.toISOString() ?? null,
    cancelledAt: r.cancelledAt?.toISOString() ?? null,
    queuePosition,
    book: {
      id: r.book.id,
      title: r.book.title,
      author: r.book.author.name,
      language: r.book.language,
      isbn: r.book.isbn,
    },
  }
}
