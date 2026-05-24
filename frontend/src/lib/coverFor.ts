/**
 * Deterministic book-cover gradient: hashes a seed string (book id or
 * ISBN) to one of the 12 curated jewel-tone gradients. Same seed always
 * picks the same cover.
 */

const COVER_PALETTE: Array<{ from: string; to: string }> = [
  { from: '#7b2d8e', to: '#f0a830' },
  { from: '#0d4d3e', to: '#f0a830' },
  { from: '#1e3a8a', to: '#06b6d4' },
  { from: '#d6336c', to: '#fad6a0' },
  { from: '#7c1d2e', to: '#ef5350' },
  { from: '#0a3a2f', to: '#1f9a72' },
  { from: '#5b21b6', to: '#ec4899' },
  { from: '#0e604a', to: '#84cc16' },
  { from: '#0c4a6e', to: '#38bdf8' },
  { from: '#b96a05', to: '#f0a830' },
  { from: '#1e1b4b', to: '#7c3aed' },
  { from: '#0f766e', to: '#fbbf24' },
]

export function coverFor(seed: string): { from: string; to: string } {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0
  }
  return COVER_PALETTE[Math.abs(hash) % COVER_PALETTE.length]!
}
