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
 *   3. Cross-tab races still exist (two tabs, same cookie jar) — single-flight
 *      only dedups *within* a tab. The server's CAS surfaces those as
 *      `REFRESH_RACE`, which we retry once below: by the time the rejection
 *      lands in JS, the browser has already applied the winner's Set-Cookie,
 *      so the retry uses the fresh cookie.
 *
 * The bypass of the axios instance is deliberate: this call never goes
 * through the response interceptor (which would itself try to refresh on
 * 401, recursing). Defaults are inlined to match the instance config.
 */

const baseURL =
  (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:4000/api/v1'

export type RefreshResponse = { accessToken: string }

let inflight: Promise<RefreshResponse> | null = null

function attempt(): Promise<RefreshResponse> {
  return axios
    .post<RefreshResponse>(
      `${baseURL}/auth/refresh`,
      {},
      { withCredentials: true, timeout: 10_000 },
    )
    .then((res) => res.data)
}

function isRefreshRace(err: unknown): boolean {
  if (!axios.isAxiosError(err)) return false
  const code = (err.response?.data as { error?: { code?: string } } | undefined)?.error?.code
  return code === 'REFRESH_RACE'
}

export function refreshAccessToken(): Promise<RefreshResponse> {
  if (inflight) return inflight
  inflight = attempt()
    .catch((err) => {
      // Lost the server-side CAS — another tab rotated first and has already
      // set a fresh refresh cookie on this same response batch. Retry once
      // with the new cookie. We only retry on the documented race code, not
      // generic 401s (which mean the session is genuinely gone).
      if (isRefreshRace(err)) return attempt()
      throw err
    })
    .finally(() => {
      inflight = null
    })
  return inflight
}
