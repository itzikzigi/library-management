import { api } from './client'

export type LoanStatus = 'on-loan' | 'overdue' | 'returned'

export type Loan = {
  id: string
  borrowedAt: string
  dueAt: string
  returnedAt: string | null
  renewals: number
  status: LoanStatus
  daysUntilDue: number | null
  daysOverdue: number
  canRenew: boolean
  book: {
    id: string
    title: string
    author: string
    language: 'HE' | 'EN'
    isbn: string | null
  }
  borrower?: {
    id: string
    firstName: string
    lastName: string
    email: string
  }
}

export type MyLoansStatus = 'active' | 'history' | 'all'
export type LibrarianLoansStatus = 'active' | 'overdue' | 'returned' | 'all'

export async function listMyLoans(status: MyLoansStatus = 'all'): Promise<Loan[]> {
  const { data } = await api.get<{ data: Loan[] }>('/me/loans', { params: { status } })
  return data.data
}

export async function listLoans(params: {
  status?: LibrarianLoansStatus
  q?: string
  limit?: number
  sort?: 'recent' | 'due-soonest'
}): Promise<Loan[]> {
  const { data } = await api.get<{ data: Loan[] }>('/loans', { params })
  return data.data
}

export async function borrowBook(bookId: string): Promise<Loan> {
  const { data } = await api.post<{ data: Loan }>('/loans', { bookId })
  return data.data
}

export async function returnLoan(loanId: string): Promise<Loan> {
  const { data } = await api.post<{ data: Loan }>(`/loans/${loanId}/return`)
  return data.data
}

export async function renewLoan(loanId: string): Promise<Loan> {
  const { data } = await api.post<{ data: Loan }>(`/loans/${loanId}/renew`)
  return data.data
}
