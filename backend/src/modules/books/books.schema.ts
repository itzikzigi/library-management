import { z } from 'zod'

export const listQuerySchema = z.object({
  q: z.string().trim().min(1).max(100).optional(),
  category: z.string().trim().min(1).max(60).optional(),
  language: z.enum(['HE', 'EN']).optional(),
  availableOnly: z
    .string()
    .transform((v) => v === 'true' || v === '1')
    .optional(),
  sort: z.enum(['title', 'newest', 'rating']).default('title'),
})

export const idParamsSchema = z.object({
  id: z.string().min(1),
})
