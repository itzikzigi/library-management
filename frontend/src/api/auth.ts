import { api } from './client'
import { refreshAccessToken } from './refresh'

export type Role = 'READER' | 'LIBRARIAN'

export type AuthUser = {
  id: string
  email: string
  firstName: string
  lastName: string
  role: Role
  createdAt: string
}

export type LoginInput = { email: string; password: string }
export type RegisterInput = {
  email: string
  password: string
  firstName: string
  lastName: string
}

type AuthResponse = { user: AuthUser; accessToken: string }
type RefreshResponse = { accessToken: string }

export async function login(input: LoginInput): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/auth/login', input)
  return data
}

export async function register(input: RegisterInput): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/auth/register', input)
  return data
}

export async function refreshSession(): Promise<RefreshResponse> {
  return refreshAccessToken()
}

export async function logout(): Promise<void> {
  await api.post('/auth/logout', {})
}

export async function fetchMe(): Promise<AuthUser> {
  const { data } = await api.get<{ user: AuthUser }>('/auth/me')
  return data.user
}
