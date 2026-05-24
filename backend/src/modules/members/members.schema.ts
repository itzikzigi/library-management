import { z } from 'zod'

export const listMembersQuery = z.object({
  q: z.string().trim().min(1).max(80).optional(),
  role: z.enum(['READER', 'LIBRARIAN']).optional(),
  status: z.enum(['active-loans', 'has-fines']).optional(),
})
export type ListMembersQuery = z.infer<typeof listMembersQuery>

export const memberIdParams = z.object({
  id: z.string().min(1),
})

export const updateMemberBody = z.object({
  firstName: z.string().trim().min(1).max(60).optional(),
  lastName: z.string().trim().min(1).max(60).optional(),
  role: z.enum(['READER', 'LIBRARIAN']).optional(),
})
export type UpdateMemberBody = z.infer<typeof updateMemberBody>
