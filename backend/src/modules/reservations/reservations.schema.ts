import { z } from 'zod'

export const reserveParams = z.object({
  bookId: z.string().min(1),
})

export const reservationIdParams = z.object({
  id: z.string().min(1),
})

export const listMyReservationsQuery = z.object({
  status: z.enum(['active', 'history', 'all']).default('active'),
})
export type ListMyReservationsQuery = z.infer<typeof listMyReservationsQuery>
