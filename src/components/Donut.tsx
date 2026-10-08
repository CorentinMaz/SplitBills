import type { ReactNode } from 'react'

/** Minimal SVG donut: one arc per slice, gaps between them, label in the middle. */
export default function Donut({
  slices,
  size = 160,
  thickness = 22,
  children,
}: {
  slices: { value: number; color: string }[]
  size?: number
  thickness?: number
  children?: ReactNode
}) {
  const total = slices.reduce((s, x) => s + x.value, 0)
  const r = (size - thickness) / 2
  const c = 2 * Math.PI * r
  const gap = slices.length > 1 ? 3 : 0
  let offset = 0
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={thickness} className="stroke-muted" />
        {total > 0 &&
          slices.map((s, i) => {
            const len = (s.value / total) * c
            const dash = Math.max(len - gap, 0)
            const el = (
              <circle
                key={i}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={s.color}
                strokeWidth={thickness}
                strokeDasharray={`${dash} ${c - dash}`}
                strokeDashoffset={-offset}
              />
            )
            offset += len
            return el
          })}
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  )
}
