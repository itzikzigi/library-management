import { api } from './client'

export type Role = 'READER' | 'LIBRARIAN'

export type Member = {
  id: string
  email: string
  firstName: string
  lastName: string
  role: Role
  createdAt: string
  activeLoans: number
  overdueLoans: number
  outstandingFine: number
}

export type ListMembersParams = {
  q?: string
  role?: Role
  status?: 'active-loans' | 'has-fines'
}

export async function listMembers(params: ListMembersParams = {}): Promise<Member[]> {
  const query: Record<string, string> = {}
  if (params.q) query.q = params.q
  if (params.role) query.role = params.role
  if (params.status) query.status = params.status
  const { data } = await api.get<{ data: Member[] }>('/members', { params: query })
  return data.data
}

export async function getMember(id: string): Promise<Member> {
  const { data } = await api.get<{ data: Member }>(`/members/${id}`)
  return data.data
}

export type UpdateMemberInput = {
  firstName?: string
  lastName?: string
  role?: Role
}

export async function updateMember(id: string, input: UpdateMemberInput): Promise<Member> {
  const { data } = await api.patch<{ data: Member }>(`/members/${id}`, input)
  return data.data
}

export async function deleteMember(id: string): Promise<void> {
  await api.delete(`/members/${id}`)
}
