type Props = {
  value: number
  size?: number
  onChange?: (v: number) => void
}

export function StarRating({ value, size = 18, onChange }: Props) {
  const stars = [1, 2, 3, 4, 5]
  return (
    <div className="inline-flex items-center gap-0.5" role="radiogroup" aria-label="Rating">
      {stars.map((s) => {
        const filled = value >= s - 0.25
        const half = !filled && value >= s - 0.75
        return (
          <button
            key={s}
            type="button"
            disabled={!onChange}
            onClick={() => onChange?.(s)}
            className={`${onChange ? 'cursor-pointer' : 'cursor-default'} text-amber`}
            aria-label={`${s} star${s > 1 ? 's' : ''}`}
            style={{ lineHeight: 0 }}
          >
            <svg width={size} height={size} viewBox="0 0 24 24">
              <defs>
                <linearGradient id={`g${s}`}>
                  <stop offset="50%" stopColor="currentColor" />
                  <stop offset="50%" stopColor="transparent" />
                </linearGradient>
              </defs>
              <path
                d="M12 2.5l2.95 6.18 6.55.84-4.8 4.6 1.2 6.74L12 17.6l-5.9 3.26 1.2-6.74-4.8-4.6 6.55-.84z"
                fill={filled ? 'currentColor' : half ? `url(#g${s})` : 'none'}
                stroke="currentColor"
                strokeWidth="1.4"
              />
            </svg>
          </button>
        )
      })}
    </div>
  )
}
