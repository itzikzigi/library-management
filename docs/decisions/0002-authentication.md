# 0002: Authentication — JWT access + opaque refresh in httpOnly cookie

Date: 2026-05-24
Status: accepted

## Context

The project needs an authentication scheme that (a) survives a refresh of
the SPA without re-prompting for credentials, (b) lets the librarian
revoke a stolen account session quickly, (c) makes credential theft on
the network expensive, and (d) is defensible in front of MAHAT
examiners against the obvious questions: *why JWT? why not just a
cookie session? what if the database is dumped? what if the access
token is stolen?*

## Options considered

### A. Server-side cookie session

Express + `express-session` + a session store. The browser carries an
opaque session id; the server keeps the state.

- **Good:** dead simple to revoke (delete the row), no JWT mechanics.
- **Bad:** stateful — every API request requires a session-store
  lookup. Logging in across two devices needs careful design. SPA hosted
  on a different origin requires `credentials: true` and SameSite=None,
  which is a strictly weaker default than SameSite=Strict.

### B. JWT in `Authorization` header for both access and refresh

The classic SPA setup. Both tokens are JWTs; the client stores them in
`localStorage` or memory.

- **Good:** stateless verification, no DB read on every request.
- **Bad:** revoking a JWT requires a blacklist (back to stateful),
  which defeats the point. `localStorage` is reachable from any script —
  one XSS leak burns the entire session.

### C. Hybrid: short-lived JWT access (header) + long-lived opaque refresh
(httpOnly cookie, hashed in DB)

- Access token: JWT signed with `JWT_ACCESS_SECRET`, payload
  `{ sub, role }`, expires in 15 minutes. Verified statelessly on every
  request.
- Refresh token: 48 random bytes (base64url), sent as a `httpOnly,
  Secure (prod), SameSite=Strict` cookie scoped to `/api/v1/auth`.
  Persisted as `sha256(token)` in the `RefreshToken` table.
- `/auth/refresh` rotates: the old refresh is revoked
  (`revokedAt = now()`), a new one is issued.

## Decision

We picked **C**.

## Consequences

**Good**

- API requests verify the access JWT in microseconds — no DB hit. The
  catalog endpoint stays cheap.
- Revocation is one-line: `UPDATE RefreshToken SET revokedAt = NOW() WHERE id = …`.
  No blacklist tables needed.
- An attacker who steals the access token has 15 minutes to use it
  before it dies. Stealing the refresh token requires a network MITM
  (mitigated by HTTPS in prod) or a browser-level compromise.
- A DB dump leaks `sha256(refresh)` only — useless without the raw
  value. Passwords are bcrypt cost 12 — same protection.
- `SameSite=Strict` on the refresh cookie blocks the common CSRF vectors
  for the refresh endpoint without adding a CSRF token layer.
- Scoping the cookie to `path=/api/v1/auth` means the catalog or loans
  endpoints never see the refresh token, even reflected through a
  malicious header echo.

**Bad / accepted tradeoffs**

- More moving parts than option A. Two secrets to rotate
  (`JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`); rotation requires
  re-signing live sessions or accepting forced re-login.
- The access JWT is unrevokable for its TTL. We've made TTL short (15m)
  so the window is bounded; a panic-revoke flow (delete the user's
  refresh tokens then wait 15 minutes for active access tokens to
  expire) is acceptable for a small library context but not for
  high-stakes systems.
- Refresh rotation creates a brief race window: if two tabs refresh
  simultaneously, one will see its refresh token already revoked. We
  accept this; the user will be sent to the login screen and reauth.
  Reuse detection (invalidate all sessions when a revoked token is
  presented) is a worthwhile future enhancement.
- `localStorage` was rejected for the *refresh* token but the *access*
  token still has to live somewhere on the client. We hold it in memory
  (React context / React Query cache) and accept that a hard refresh
  triggers a `/auth/refresh` round-trip.

## Cross-references

Maps to chapter 11 (information security) of the project book:
- Password storage — bcrypt cost 12, well above the ≥10 floor in CLAUDE.md
- JWT signing keys — held in env, never committed (`.env.example` ships
  placeholder values)
- Refresh tokens — hashed at rest, rotated on each refresh
- Rate limiting — 10 attempts per IP per 15 minutes on `/auth/login`
  and `/auth/register` via `express-rate-limit`
- HTTPS — `secure` flag flips on `NODE_ENV === 'production'`; Render
  and Vercel terminate TLS at the edge in production
