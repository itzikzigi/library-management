import { api } from './client'

export async function rateBook(bookId: string, value: number): Promise<{ value: number }> {
  const { data } = await api.post<{ data: { value: number } }>(
    `/books/${bookId}/ratings`,
    { value },
  )
  return data.data
}

export async function deleteRating(bookId: string): Promise<void> {
  await api.delete(`/books/${bookId}/ratings`)
}
