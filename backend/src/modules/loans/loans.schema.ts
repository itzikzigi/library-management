import { z } from 'zod'

export const borrowSchema = z.object({
  bookId: z.string().min(1),
})

export const loanIdParams = z.object({
  id: z.string().min(1),
})

export const myLoansQuery = z.object({
  status: z.enum(['active', 'history', 'all']).default('all'),
})

export const librarianLoansQuery = z.object({
  status: z.enum(['active', 'overdue', 'returned', 'all']).default('all'),
  q: z.string().trim().min(1).max(120).optional(),
  limit: z.coerce.number().int().positive().max(200).default(50),
  sort: z.enum(['recent', 'due-soonest']).default('recent'),
})

export type BorrowBody = z.infer<typeof borrowSchema>
