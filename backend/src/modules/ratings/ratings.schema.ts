import { z } from 'zod'

export const rateBookParams = z.object({
  bookId: z.string().min(1),
})

export const rateBookBody = z.object({
  value: z.number().int().min(1).max(5),
})

export type RateBookBody = z.infer<typeof rateBookBody>
