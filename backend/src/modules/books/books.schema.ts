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

/** Shared between create and update — the latter makes everything optional. */
const bookFieldsObject = {
  title: z.string().trim().min(1).max(200),
  authorName: z.string().trim().min(1).max(120),
  isbn: z
    .string()
    .trim()
    .max(20)
    .regex(/^[0-9-]+$/, 'ISBN may only contain digits and hyphens')
    .optional()
    .or(z.literal('').transform(() => undefined)),
  year: z.coerce.number().int().min(1450).max(2100).optional(),
  language: z.enum(['HE', 'EN']),
  blurb: z.string().trim().max(2000).optional().or(z.literal('').transform(() => undefined)),
  shelfCode: z.string().trim().max(20).optional().or(z.literal('').transform(() => undefined)),
  categories: z.array(z.string().trim().min(1).max(60)).max(8).default([]),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
} as const

export const createBookBody = z
  .object({
    ...bookFieldsObject,
    totalCopies: z.coerce.number().int().min(1).max(50).default(1),
  })
  .strict()
export type CreateBookBody = z.infer<typeof createBookBody>

export const updateBookBody = z
  .object({
    title: bookFieldsObject.title.optional(),
    authorName: bookFieldsObject.authorName.optional(),
    year: bookFieldsObject.year,
    language: bookFieldsObject.language.optional(),
    blurb: bookFieldsObject.blurb,
    shelfCode: bookFieldsObject.shelfCode,
    categories: bookFieldsObject.categories.optional(),
    tags: bookFieldsObject.tags.optional(),
  })
  .strict()
export type UpdateBookBody = z.infer<typeof updateBookBody>
