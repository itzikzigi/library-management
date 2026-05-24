import axios from 'axios'

/**
 * Single-flight refresh. Multiple concurrent callers share the same in-flight
 * promise — important because:
 *
 *   1. React StrictMode runs `useEffect` twice on mount in dev, so without
 *      coalescing the AuthProvider would fire two `/auth/refresh` calls in
 *      parallel with the same refresh cookie. The server rotates the cookie
 *      on the first, so the second sees a revoked token and 401s, kicking
 *      the user to /login on a valid session.
 *
 *   2. A 401 on an in-flight request can race with the AuthProvider's boot
 *      refresh. Without coalescing, the axios interceptor fires its own
 *      refresh on top of AuthProvider's; same rotation race.
 *
 * The bypass of the axios instance is deliberate: this call never goes
 * through the response interceptor (which would itself try to refresh on
 * 401, recursing). Defaults are inlined to match the instance config.
 */

const baseURL =
  (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:4000/api/v1'

export type RefreshResponse = { accessToken: string }

let inflight: Promise<RefreshResponse> | null = null

export function refreshAccessToken(): Promise<RefreshResponse> {
  if (inflight) return inflight
  inflight = axios
    .post<RefreshResponse>(
      `${baseURL}/auth/refresh`,
      {},
      { withCredentials: true, timeout: 10_000 },
    )
    .then((res) => res.data)
    .finally(() => {
      inflight = null
    })
  return inflight
}
