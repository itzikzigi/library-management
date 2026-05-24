import { api } from './client'

export type ReservationStatus = 'PENDING' | 'FULFILLED' | 'CANCELLED' | 'EXPIRED'

export type Reservation = {
  id: string
  status: ReservationStatus
  createdAt: string
  fulfilledAt: string | null
  cancelledAt: string | null
  queuePosition: number | null
  book: {
    id: string
    title: string
    author: string
    language: 'HE' | 'EN'
    isbn: string | null
  }
}

export async function reserveBook(bookId: string): Promise<Reservation> {
  const { data } = await api.post<{ data: Reservation }>(`/books/${bookId}/reservations`)
  return data.data
}

export async function cancelReservation(reservationId: string): Promise<void> {
  await api.delete(`/reservations/${reservationId}`)
}

export async function listMyReservations(
  status: 'active' | 'history' | 'all' = 'active',
): Promise<Reservation[]> {
  const { data } = await api.get<{ data: Reservation[] }>('/me/reservations', {
    params: { status },
  })
  return data.data
}
