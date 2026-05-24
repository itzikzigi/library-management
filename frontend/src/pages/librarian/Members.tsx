import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import {
  deleteMember,
  listMembers,
  updateMember,
  type Member,
  type Role,
} from '../../api/members'

export function LibrarianMembers() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [role, setRole] = useState<'' | Role>('')
  const [status, setStatus] = useState<'' | 'active-loans' | 'has-fines'>('')
  const [editing, setEditing] = useState<Member | null>(null)

  const params = useMemo(
    () => ({
      q: search.trim() || undefined,
      role: (role || undefined) as Role | undefined,
      status: (status || undefined) as 'active-loans' | 'has-fines' | undefined,
    }),
    [search, role, status],
  )

  const { data: members = [], isLoading, isError } = useQuery({
    queryKey: ['members', params],
    queryFn: () => listMembers(params),
  })

  return (
    <div className="mx-auto max-w-7xl px-6 py-8 space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl text-ink-900">Members</h1>
          <p className="text-sm text-ink-500 mt-1">
            {isLoading ? 'Loading…' : `${members.length} accounts`}
          </p>
        </div>
      </header>

      <div className="card p-4 flex flex-wrap gap-3">
        <input
          className="input flex-1 min-w-[18rem]"
          placeholder="Search by name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="input md:w-44"
          value={role}
          onChange={(e) => setRole(e.target.value as Role | '')}
        >
          <option value="">All roles</option>
          <option value="READER">Reader</option>
          <option value="LIBRARIAN">Librarian</option>
        </select>
        <select
          className="input md:w-44"
          value={status}
          onChange={(e) =>
            setStatus(e.target.value as 'active-loans' | 'has-fines' | '')
          }
        >
          <option value="">Any status</option>
          <option value="active-loans">Active loans</option>
          <option value="has-fines">Has fines</option>
        </select>
      </div>

      {isError && (
        <div className="card p-4 text-sm text-coral-700 bg-coral-50 border-coral-200">
          Couldn't load members. Try refreshing.
        </div>
      )}

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-ink-50 text-ink-600 text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Name</th>
              <th className="text-left px-4 py-3 font-medium">Email</th>
              <th className="text-left px-4 py-3 font-medium">Role</th>
              <th className="text-left px-4 py-3 font-medium">Joined</th>
              <th className="text-left px-4 py-3 font-medium">Active loans</th>
              <th className="text-left px-4 py-3 font-medium">Fines</th>
              <th className="text-right px-4 py-3 font-medium"> </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {members.map((m) => {
              const name = `${m.firstName} ${m.lastName}`
              const initials = `${m.firstName[0] ?? ''}${m.lastName[0] ?? ''}`
              return (
                <tr key={m.id} className="hover:bg-parchment-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-ink-800 text-parchment-50 grid place-items-center text-xs">
                        {initials}
                      </div>
                      <span className="text-ink-900">{name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-ink-600">{m.email}</td>
                  <td className="px-4 py-3">
                    <span className={m.role === 'LIBRARIAN' ? 'chip-accent' : 'chip'}>
                      {m.role.toLowerCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-ink-600">
                    {new Date(m.createdAt).toLocaleDateString('en-CA')}
                  </td>
                  <td className="px-4 py-3 text-ink-700">
                    {m.activeLoans}
                    {m.overdueLoans > 0 && (
                      <span className="ml-1 text-xs text-coral-dark">
                        ({m.overdueLoans} overdue)
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {m.outstandingFine > 0 ? (
                      <span className="chip-warn">₪{m.outstandingFine.toFixed(2)}</span>
                    ) : (
                      <span className="text-ink-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button className="btn-ghost text-xs" onClick={() => setEditing(m)}>
                      Edit
                    </button>
                  </td>
                </tr>
              )
            })}
            {!isLoading && members.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-ink-400 text-sm">
                  No members match the current filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <EditMemberModal
          member={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ['members'] })
            setEditing(null)
          }}
        />
      )}
    </div>
  )
}

function EditMemberModal({
  member,
  onClose,
  onSaved,
}: {
  member: Member
  onClose: () => void
  onSaved: () => void
}) {
  const queryClient = useQueryClient()
  const [firstName, setFirstName] = useState(member.firstName)
  const [lastName, setLastName] = useState(member.lastName)
  const [role, setRole] = useState<Role>(member.role)
  const [error, setError] = useState<string | null>(null)

  const updateMut = useMutation({
    mutationFn: () =>
      updateMember(member.id, { firstName, lastName, role }),
    onSuccess: onSaved,
    onError: (err) => setError(toMessage(err)),
  })

  const deleteMut = useMutation({
    mutationFn: () => deleteMember(member.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] })
      onClose()
    },
    onError: (err) => setError(toMessage(err)),
  })

  return (
    <div
      className="fixed inset-0 bg-ink-900/40 backdrop-blur-sm grid place-items-center z-50"
      onClick={onClose}
    >
      <div
        className="card w-[min(28rem,calc(100vw-2rem))] p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-start justify-between">
          <div>
            <h2 className="text-xl text-ink-900">Edit member</h2>
            <p className="text-xs text-ink-500 mt-0.5">{member.email}</p>
          </div>
          <button onClick={onClose} className="text-ink-400 hover:text-ink-700 text-xl leading-none">
            ×
          </button>
        </header>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-ink-600">First name</label>
            <input
              className="input mt-1"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-ink-600">Last name</label>
            <input
              className="input mt-1"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-ink-600">Role</label>
            <select
              className="input mt-1"
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
            >
              <option value="READER">Reader</option>
              <option value="LIBRARIAN">Librarian</option>
            </select>
          </div>
        </div>

        {error && (
          <div className="text-xs text-coral-dark bg-coral/10 border border-coral/30 rounded-md px-3 py-2">
            {error}
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-ink-100">
          <button
            type="button"
            className="btn-ghost text-xs text-coral-dark"
            disabled={deleteMut.isPending || member.activeLoans > 0}
            title={
              member.activeLoans > 0 ? 'Cannot delete a member with active loans' : undefined
            }
            onClick={() => {
              if (confirm(`Delete ${member.firstName} ${member.lastName}? Loan history will block deletion.`)) {
                deleteMut.mutate()
              }
            }}
          >
            Delete account
          </button>
          <div className="flex gap-2">
            <button className="btn-ghost text-xs" onClick={onClose}>
              Cancel
            </button>
            <button
              className="btn-primary text-xs"
              disabled={updateMut.isPending}
              onClick={() => updateMut.mutate()}
            >
              {updateMut.isPending ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function toMessage(err: unknown): string {
  if (isAxiosError(err)) {
    const code = err.response?.data?.error?.code
    const message = err.response?.data?.error?.message
    if (code === 'FORBIDDEN') return message ?? 'Not allowed.'
    if (code === 'HAS_LOAN_HISTORY') return 'Cannot delete a member with loan history.'
    if (typeof message === 'string') return message
  }
  return 'Something went wrong. Try again.'
}
