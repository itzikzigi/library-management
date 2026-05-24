import { api } from './client'

export type Language = 'HE' | 'EN'

export type CatalogBook = {
  id: string
  isbn: string | null
  title: string
  author: string
  year: number | null
  language: Language
  blurb: string | null
  shelfCode: string | null
  categories: string[]
  tags: string[]
  total: number
  available: number
  rating: number | null
  ratingsCount: number
}

export type BookDetail = CatalogBook & {
  myRating: number | null
}

export type ListParams = {
  q?: string
  category?: string
  language?: Language
  availableOnly?: boolean
  sort?: 'title' | 'newest' | 'rating'
}

export async function listBooks(params: ListParams = {}): Promise<CatalogBook[]> {
  const query: Record<string, string> = {}
  if (params.q) query.q = params.q
  if (params.category) query.category = params.category
  if (params.language) query.language = params.language
  if (params.availableOnly) query.availableOnly = 'true'
  if (params.sort) query.sort = params.sort

  const { data } = await api.get<{ data: CatalogBook[] }>('/books', { params: query })
  return data.data
}

export async function getBook(id: string): Promise<BookDetail> {
  const { data } = await api.get<{ data: BookDetail }>(`/books/${id}`)
  return data.data
}
