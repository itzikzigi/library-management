import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import {
  createBook,
  deleteBook,
  listBooks,
  updateBook,
  type CatalogBook,
  type CreateBookInput,
  type Language,
  type UpdateBookInput,
} from '../../api/books'

type EditorMode = { kind: 'create' } | { kind: 'edit'; book: CatalogBook }

export function LibrarianBooks() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [language, setLanguage] = useState<'' | Language>('')
  const [editor, setEditor] = useState<EditorMode | null>(null)

  const params = useMemo(
    () => ({
      q: search.trim() || undefined,
      language: (language || undefined) as Language | undefined,
    }),
    [search, language],
  )
  const { data: books = [], isLoading, isError } = useQuery({
    queryKey: ['books', params],
    queryFn: () => listBooks(params),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteBook(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['books'] }),
  })

  return (
    <div className="mx-auto max-w-7xl px-6 py-8 space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl text-ink-900">Books</h1>
          <p className="text-sm text-ink-500 mt-1">
            {isLoading ? 'Loading…' : `${books.length} titles in catalog`}
          </p>
        </div>
        <button className="btn-primary" onClick={() => setEditor({ kind: 'create' })}>
          + Add book
        </button>
      </header>

      <div className="card p-4 flex flex-col md:flex-row gap-3">
        <input
          className="input flex-1"
          placeholder="Search by title or author…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="input md:w-44"
          value={language}
          onChange={(e) => setLanguage(e.target.value as Language | '')}
        >
          <option value="">All languages</option>
          <option value="HE">Hebrew</option>
          <option value="EN">English</option>
        </select>
      </div>

      {isError && (
        <div className="card p-4 text-sm text-coral-700 bg-coral-50 border-coral-200">
          Couldn't load the catalog.
        </div>
      )}

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-ink-50 text-ink-600 text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Title</th>
              <th className="text-left px-4 py-3 font-medium">Author</th>
              <th className="text-left px-4 py-3 font-medium">Categories</th>
              <th className="text-left px-4 py-3 font-medium">Lang</th>
              <th className="text-left px-4 py-3 font-medium">Year</th>
              <th className="text-left px-4 py-3 font-medium">Copies</th>
              <th className="text-left px-4 py-3 font-medium">Rating</th>
              <th className="text-right px-4 py-3 font-medium"> </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {books.map((b) => (
              <tr key={b.id} className="hover:bg-parchment-50">
                <td className="px-4 py-3 font-serif text-ink-900">{b.title}</td>
                <td className="px-4 py-3 text-ink-600">{b.author}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {b.categories.slice(0, 2).map((c) => (
                      <span key={c} className="chip">{c}</span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 text-ink-600">{b.language}</td>
                <td className="px-4 py-3 text-ink-600">{b.year ?? '—'}</td>
                <td className="px-4 py-3">
                  <span
                    className={
                      b.available === 0
                        ? 'chip-danger'
                        : b.available < b.total
                        ? 'chip-warn'
                        : 'chip-success'
                    }
                  >
                    {b.available}/{b.total}
                  </span>
                </td>
                <td className="px-4 py-3 text-ink-700">
                  {b.rating !== null ? `★ ${b.rating.toFixed(1)}` : '—'}
                </td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <button
                    className="btn-ghost text-xs"
                    onClick={() => setEditor({ kind: 'edit', book: b })}
                  >
                    Edit
                  </button>
                  <button
                    className="btn-ghost text-xs text-coral-dark"
                    disabled={deleteMut.isPending}
                    onClick={() => {
                      if (
                        confirm(
                          `Delete "${b.title}"? Books with loan history cannot be deleted.`,
                        )
                      ) {
                        deleteMut.mutate(b.id, {
                          onError: (err) => alert(toMessage(err)),
                        })
                      }
                    }}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {!isLoading && books.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-ink-400 text-sm">
                  No books match the current filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editor && (
        <BookEditor
          mode={editor}
          onClose={() => setEditor(null)}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ['books'] })
            setEditor(null)
          }}
        />
      )}
    </div>
  )
}

function BookEditor({
  mode,
  onClose,
  onSaved,
}: {
  mode: EditorMode
  onClose: () => void
  onSaved: () => void
}) {
  const editing = mode.kind === 'edit' ? mode.book : null
  const [title, setTitle] = useState(editing?.title ?? '')
  const [authorName, setAuthorName] = useState(editing?.author ?? '')
  const [isbn, setIsbn] = useState(editing?.isbn ?? '')
  const [year, setYear] = useState(editing?.year?.toString() ?? '')
  const [language, setLanguage] = useState<Language>(editing?.language ?? 'EN')
  const [blurb, setBlurb] = useState(editing?.blurb ?? '')
  const [shelfCode, setShelfCode] = useState(editing?.shelfCode ?? '')
  const [categories, setCategories] = useState(editing?.categories.join(', ') ?? '')
  const [tags, setTags] = useState(editing?.tags.join(', ') ?? '')
  const [totalCopies, setTotalCopies] = useState('1')
  const [error, setError] = useState<string | null>(null)

  const saveMut = useMutation({
    mutationFn: async () => {
      const parsedYear = year.trim() ? Number(year) : undefined
      const cats = splitList(categories)
      const tgs = splitList(tags)
      if (mode.kind === 'create') {
        const body: CreateBookInput = {
          title: title.trim(),
          authorName: authorName.trim(),
          isbn: isbn.trim() || undefined,
          year: parsedYear,
          language,
          blurb: blurb.trim() || undefined,
          shelfCode: shelfCode.trim() || undefined,
          categories: cats,
          tags: tgs,
          totalCopies: Number(totalCopies) || 1,
        }
        return createBook(body)
      }
      const body: UpdateBookInput = {
        title: title.trim(),
        authorName: authorName.trim(),
        year: parsedYear,
        language,
        blurb: blurb.trim() || undefined,
        shelfCode: shelfCode.trim() || undefined,
        categories: cats,
        tags: tgs,
      }
      return updateBook(mode.book.id, body)
    },
    onSuccess: onSaved,
    onError: (err) => setError(toMessage(err)),
  })

  return (
    <div
      className="fixed inset-0 bg-ink-900/40 backdrop-blur-sm grid place-items-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="card w-[min(38rem,100%)] p-6 space-y-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-start justify-between">
          <h2 className="text-xl text-ink-900">
            {mode.kind === 'create' ? 'Add a book' : `Edit "${editing?.title}"`}
          </h2>
          <button onClick={onClose} className="text-ink-400 hover:text-ink-700 text-xl leading-none">
            ×
          </button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="md:col-span-2">
            <label className="text-xs font-medium text-ink-600">Title</label>
            <input className="input mt-1" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-ink-600">Author</label>
            <input
              className="input mt-1"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-ink-600">ISBN</label>
            <input
              className="input mt-1"
              value={isbn}
              disabled={mode.kind === 'edit'}
              placeholder="optional"
              onChange={(e) => setIsbn(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-ink-600">Year</label>
            <input
              className="input mt-1"
              value={year}
              inputMode="numeric"
              placeholder="optional"
              onChange={(e) => setYear(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-ink-600">Language</label>
            <select
              className="input mt-1"
              value={language}
              onChange={(e) => setLanguage(e.target.value as Language)}
            >
              <option value="EN">English</option>
              <option value="HE">Hebrew</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-ink-600">Shelf code</label>
            <input
              className="input mt-1"
              value={shelfCode}
              placeholder="e.g. B-7"
              onChange={(e) => setShelfCode(e.target.value)}
            />
          </div>
          {mode.kind === 'create' && (
            <div>
              <label className="text-xs font-medium text-ink-600">Initial copies</label>
              <input
                className="input mt-1"
                value={totalCopies}
                inputMode="numeric"
                onChange={(e) => setTotalCopies(e.target.value)}
              />
            </div>
          )}
          <div className="md:col-span-2">
            <label className="text-xs font-medium text-ink-600">
              Categories <span className="text-ink-400">(comma-separated)</span>
            </label>
            <input
              className="input mt-1"
              value={categories}
              onChange={(e) => setCategories(e.target.value)}
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-medium text-ink-600">
              Tags <span className="text-ink-400">(comma-separated)</span>
            </label>
            <input
              className="input mt-1"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-medium text-ink-600">Blurb</label>
            <textarea
              className="input mt-1"
              rows={3}
              value={blurb}
              onChange={(e) => setBlurb(e.target.value)}
            />
          </div>
        </div>

        {error && (
          <div className="text-xs text-coral-dark bg-coral/10 border border-coral/30 rounded-md px-3 py-2">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t border-ink-100">
          <button className="btn-ghost text-xs" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn-primary text-xs"
            disabled={saveMut.isPending}
            onClick={() => saveMut.mutate()}
          >
            {saveMut.isPending ? 'Saving…' : mode.kind === 'create' ? 'Add book' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

function splitList(s: string): string[] {
  return s
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)
}

function toMessage(err: unknown): string {
  if (isAxiosError(err)) {
    const code = err.response?.data?.error?.code
    const message = err.response?.data?.error?.message
    if (code === 'ISBN_TAKEN') return 'A book with this ISBN already exists.'
    if (code === 'HAS_LOAN_HISTORY') return 'Cannot delete a book with loan history.'
    if (code === 'VALIDATION_ERROR') return message ?? 'Some fields are invalid.'
    if (typeof message === 'string') return message
  }
  return 'Something went wrong. Try again.'
}
