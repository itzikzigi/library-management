import axios, { type InternalAxiosRequestConfig } from 'axios'
import { tokenStore } from './tokenStore'

const baseURL =
  (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:4000/api/v1'

export const api = axios.create({
  baseURL,
  withCredentials: true, // send the refresh cookie on /auth/* paths
  timeout: 10_000,
})

// Attach the access JWT (if any) to every outgoing request.
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = tokenStore.get()
  if (token) config.headers.set('Authorization', `Bearer ${token}`)
  return config
})

// On 401: attempt one refresh, retry the original request once.
// Skip refresh for /auth/* endpoints to avoid loops.
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config as InternalAxiosRequestConfig & { _retry?: boolean }
    const url = original?.url ?? ''
    const isAuthEndpoint = url.includes('/auth/')
    const status = err.response?.status
    if (status === 401 && original && !original._retry && !isAuthEndpoint) {
      original._retry = true
      try {
        const { data } = await axios.post<{ accessToken: string }>(
          `${baseURL}/auth/refresh`,
          {},
          { withCredentials: true },
        )
        tokenStore.set(data.accessToken)
        return api(original)
      } catch {
        tokenStore.set(null)
        tokenStore.notifyUnauthenticated()
      }
    }
    return Promise.reject(err)
  },
)
