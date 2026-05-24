/**
 * Module-level holder for the access JWT and the "session expired" callback.
 * The token lives in memory only — never in localStorage — per ADR-0002.
 * The AuthProvider keeps a copy in React state for rendering; this module
 * lets the axios interceptor read it without going through React.
 */

let accessToken: string | null = null
let onUnauthenticated: (() => void) | null = null

export const tokenStore = {
  get: (): string | null => accessToken,
  set: (token: string | null): void => {
    accessToken = token
  },
  setOnUnauthenticated: (cb: (() => void) | null): void => {
    onUnauthenticated = cb
  },
  notifyUnauthenticated: (): void => {
    onUnauthenticated?.()
  },
}
