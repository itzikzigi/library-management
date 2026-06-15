import { Prisma, type User } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { HttpError } from '../../utils/HttpError.js'
import type { ListMembersQuery, UpdateMemberBody } from './members.schema.js'

/**
 * Member DTO carries the user record plus a couple of derived columns the
 * librarian Members page needs: count of active (unreturned) loans and how
 * many of those are overdue. Computed in JS, not SQL, because the catalog
 * is small.
 */
export type MemberDTO = {
  id: string
  email: string
  firstName: string
  lastName: string
  role: 'READER' | 'LIBRARIAN'
  createdAt: string
  activeLoans: number
  overdueLoans: number
}

export async function listMembers(opts: ListMembersQuery): Promise<MemberDTO[]> {
  const where: Prisma.UserWhereInput = {}
  if (opts.role) where.role = opts.role
  if (opts.q) {
    where.OR = [
      { firstName: { contains: opts.q, mode: 'insensitive' } },
      { lastName: { contains: opts.q, mode: 'insensitive' } },
      { email: { contains: opts.q, mode: 'insensitive' } },
    ]
  }

  const users = await prisma.user.findMany({
    where,
    include: {
      loans: {
        where: { returnedAt: null },
        select: { dueAt: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  const now = new Date()
  let dtos = users.map((u): MemberDTO => {
    const activeLoans = u.loans.length
    let overdueLoans = 0
    for (const loan of u.loans) {
      if (loan.dueAt < now) overdueLoans += 1
    }
    return toDTO(u, activeLoans, overdueLoans)
  })

  if (opts.status === 'active-loans') {
    dtos = dtos.filter((m) => m.activeLoans > 0)
  }
  return dtos
}

export async function getMember(id: string): Promise<MemberDTO> {
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      loans: {
        where: { returnedAt: null },
        select: { dueAt: true },
      },
    },
  })
  if (!user) throw new HttpError(404, 'NOT_FOUND', 'Member not found')
  const now = new Date()
  let overdueLoans = 0
  for (const loan of user.loans) {
    if (loan.dueAt < now) overdueLoans += 1
  }
  return toDTO(user, user.loans.length, overdueLoans)
}

export async function updateMember(
  id: string,
  requesterId: string,
  body: UpdateMemberBody,
): Promise<MemberDTO> {
  const existing = await prisma.user.findUnique({ where: { id } })
  if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Member not found')

  // Don't let a librarian demote themselves — leaves the library locked out
  // if they're the last librarian. Cheap guard, prevents the most common foot-gun.
  if (body.role === 'READER' && id === requesterId) {
    throw new HttpError(403, 'FORBIDDEN', 'You cannot demote yourself')
  }

  await prisma.user.update({
    where: { id },
    data: {
      ...(body.firstName !== undefined && { firstName: body.firstName }),
      ...(body.lastName !== undefined && { lastName: body.lastName }),
      ...(body.role !== undefined && { role: body.role }),
    },
  })
  return getMember(id)
}

/**
 * Refuse to delete a member with any loan history — the schema's
 * onDelete: Restrict on Loan would error anyway, but we surface a clean
 * 409 instead of a Prisma exception. Refuse self-delete for the same
 * lockout reason as the demote guard.
 */
export async function deleteMember(id: string, requesterId: string): Promise<void> {
  if (id === requesterId) {
    throw new HttpError(403, 'FORBIDDEN', 'You cannot delete your own account')
  }
  const user = await prisma.user.findUnique({
    where: { id },
    include: { _count: { select: { loans: true } } },
  })
  if (!user) throw new HttpError(404, 'NOT_FOUND', 'Member not found')
  if (user._count.loans > 0) {
    throw new HttpError(
      409,
      'HAS_LOAN_HISTORY',
      'Cannot delete a member with loan history — archive instead',
    )
  }
  await prisma.user.delete({ where: { id } })
}

function toDTO(u: User, activeLoans: number, overdueLoans: number): MemberDTO {
  return {
    id: u.id,
    email: u.email,
    firstName: u.firstName,
    lastName: u.lastName,
    role: u.role,
    createdAt: u.createdAt.toISOString(),
    activeLoans,
    overdueLoans,
  }
}
