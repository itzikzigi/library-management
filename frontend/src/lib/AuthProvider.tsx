import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  fetchMe,
  login as apiLogin,
  logout as apiLogout,
  refreshSession,
  register as apiRegister,
  type AuthUser,
  type LoginInput,
  type RegisterInput,
} from '../api/auth'
import { tokenStore } from '../api/tokenStore'

type Status = 'loading' | 'authenticated' | 'unauthenticated'

type AuthContextValue = {
  user: AuthUser | null
  status: Status
  login: (input: LoginInput) => Promise<void>
  register: (input: RegisterInput) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [status, setStatus] = useState<Status>('loading')
  const queryClient = useQueryClient()

  const setAuthed = useCallback((u: AuthUser, accessToken: string) => {
    tokenStore.set(accessToken)
    setUser(u)
    setStatus('authenticated')
  }, [])

  const clearAuthed = useCallback(() => {
    tokenStore.set(null)
    setUser(null)
    setStatus('unauthenticated')
    queryClient.clear()
  }, [queryClient])

  // Boot: try to restore the session via the refresh cookie.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { accessToken } = await refreshSession()
        if (cancelled) return
        tokenStore.set(accessToken)
        const me = await fetchMe()
        if (cancelled) return
        setUser(me)
        setStatus('authenticated')
      } catch {
        if (cancelled) return
        tokenStore.set(null)
        setStatus('unauthenticated')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // Axios interceptor signals here when the refresh attempt itself fails
  // (e.g., refresh cookie expired). Drop the user into the unauthenticated
  // state and let route guards redirect.
  useEffect(() => {
    tokenStore.setOnUnauthenticated(() => {
      setUser(null)
      setStatus('unauthenticated')
      queryClient.clear()
    })
    return () => tokenStore.setOnUnauthenticated(null)
  }, [queryClient])

  const login = useCallback(
    async (input: LoginInput) => {
      const { user, accessToken } = await apiLogin(input)
      setAuthed(user, accessToken)
    },
    [setAuthed],
  )

  const register = useCallback(
    async (input: RegisterInput) => {
      const { user, accessToken } = await apiRegister(input)
      setAuthed(user, accessToken)
    },
    [setAuthed],
  )

  const logout = useCallback(async () => {
    try {
      await apiLogout()
    } finally {
      clearAuthed()
    }
  }, [clearAuthed])

  const value = useMemo<AuthContextValue>(
    () => ({ user, status, login, register, logout }),
    [user, status, login, register, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
