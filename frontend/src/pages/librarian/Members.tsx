const MEMBERS = [
  { id: 'm-1', name: 'Yael Shalev', email: 'yael@example.com', joined: '2025-01-14', active: 2, fines: 0, role: 'reader' },
  { id: 'm-2', name: 'Daniel Cohen', email: 'daniel.c@example.com', joined: '2024-09-02', active: 0, fines: 0, role: 'reader' },
  { id: 'm-3', name: 'Maya Levi', email: 'maya.levi@example.com', joined: '2025-03-21', active: 1, fines: 4.5, role: 'reader' },
  { id: 'm-4', name: 'Eitan Bar', email: 'eitan@example.com', joined: '2024-11-08', active: 3, fines: 0, role: 'reader' },
  { id: 'm-5', name: 'Noa Adler', email: 'noa.adler@example.com', joined: '2024-07-19', active: 1, fines: 16, role: 'reader' },
  { id: 'm-6', name: 'Sara Greene', email: 'sara@library.org', joined: '2024-01-01', active: 0, fines: 0, role: 'librarian' },
]

export function LibrarianMembers() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-8 space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl text-ink-900">Members</h1>
          <p className="text-sm text-ink-500 mt-1">{MEMBERS.length} accounts</p>
        </div>
        <button className="btn-primary">+ Add member</button>
      </header>

      <div className="card p-4 flex gap-3">
        <input className="input flex-1" placeholder="Search by name or email…" />
        <select className="input md:w-44">
          <option>All roles</option>
          <option>Reader</option>
          <option>Librarian</option>
        </select>
        <select className="input md:w-44">
          <option>Any status</option>
          <option>Active loans</option>
          <option>Has fines</option>
        </select>
      </div>

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
            {MEMBERS.map((m) => (
              <tr key={m.id} className="hover:bg-parchment-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-ink-800 text-parchment-50 grid place-items-center text-xs">
                      {m.name.split(' ').map((s) => s[0]).join('')}
                    </div>
                    <span className="text-ink-900">{m.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-ink-600">{m.email}</td>
                <td className="px-4 py-3">
                  <span className={m.role === 'librarian' ? 'chip-accent' : 'chip'}>{m.role}</span>
                </td>
                <td className="px-4 py-3 text-ink-600">{m.joined}</td>
                <td className="px-4 py-3 text-ink-700">{m.active}</td>
                <td className="px-4 py-3">
                  {m.fines > 0 ? (
                    <span className="chip-warn">₪{m.fines.toFixed(2)}</span>
                  ) : (
                    <span className="text-ink-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <button className="btn-ghost text-xs">View</button>
                  <button className="btn-ghost text-xs">Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
