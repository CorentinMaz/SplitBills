import { useState } from 'react'
import { monthName } from '@/lib/dates'
import { formatMoney } from '@/lib/money'
import { cn } from '@/lib/utils'

/** Rounds the axis top to a clean number so ticks read 0 / 500 / 1 000… */
function niceMax(max: number) {
  if (max <= 0) return 100
  const pow = 10 ** Math.floor(Math.log10(max))
  const step = [1, 2, 2.5, 5, 10].find((s) => s * pow * 4 >= max)! * pow
  return step * 4
}

const shortFmt = new Intl.NumberFormat('fr-CA', { maximumFractionDigits: 0 })
const monthShortFmt = new Intl.DateTimeFormat('fr-CA', { month: 'short' })

/** "juin" / "juil" rather than a 3-letter cut that makes both "jui". */
function shortMonth(ym: string) {
  const [y, m] = ym.split('-').map(Number)
  return monthShortFmt.format(new Date(y, m - 1, 1)).replace('.', '')
}

/**
 * One series, one hue: monthly totals as columns. The selected month is full strength,
 * the rest a lighter step of the same hue. Hover shows the exact value; click selects.
 */
export default function MonthlyColumns({
  data,
  selected,
  onSelect,
}: {
  data: { month: string; value: number }[]
  selected: string
  onSelect: (month: string) => void
}) {
  const [hover, setHover] = useState<number | null>(null)
  const top = niceMax(Math.max(...data.map((d) => d.value)))
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * top)
  const shown = hover ?? data.findIndex((d) => d.month === selected)

  return (
    <div className="flex gap-3">
      <div className="relative flex h-52 w-14 shrink-0 flex-col-reverse justify-between pb-6 text-right text-[11px] text-muted-foreground tabular-nums">
        {ticks.map((t) => (
          <span key={t} className="-mb-1.5 leading-3">
            {shortFmt.format(t)} $
          </span>
        ))}
      </div>
      <div className="relative min-w-0 flex-1">
        <div className="absolute inset-x-0 top-0 bottom-6 flex flex-col-reverse justify-between">
          {ticks.map((t) => (
            <span key={t} className="border-t border-border" />
          ))}
        </div>
        <div className="relative flex h-52 items-stretch">
          {data.map((d, i) => {
            const on = d.month === selected
            return (
              <button
                key={d.month}
                type="button"
                onClick={() => onSelect(d.month)}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                aria-label={`${monthName(d.month)} : ${formatMoney(d.value)}`}
                aria-pressed={on}
                className="group relative flex flex-1 flex-col items-center justify-end px-[2px] pb-6 outline-none"
              >
                {i === shown && (
                  <span
                    className={cn(
                      'pointer-events-none absolute z-10 flex -translate-y-2 flex-col items-center rounded-lg bg-foreground px-2.5 py-1.5 text-xs whitespace-nowrap text-background shadow-lg',
                      // Keep the tooltip inside the card at both ends.
                      i < 2 && 'left-0',
                      i >= data.length - 2 && 'right-0',
                    )}
                    style={{ bottom: `calc(${(d.value / top) * 100}% * (208 - 24) / 208 + 24px)` }}
                  >
                    <span className="capitalize opacity-80">{monthName(d.month)}</span>
                    <strong>{formatMoney(d.value)}</strong>
                  </span>
                )}
                <span
                  className={cn(
                    'w-full max-w-6 rounded-t-[4px] transition-colors',
                    on ? 'bg-primary' : 'bg-primary/30 group-hover:bg-primary/50',
                    d.value === 0 && 'bg-transparent',
                  )}
                  style={{ height: `${(d.value / top) * 100}%` }}
                />
                <span
                  className={cn(
                    'absolute bottom-0 text-[11px] capitalize',
                    on ? 'font-bold text-foreground' : 'text-muted-foreground',
                  )}
                >
                  <span className="md:hidden">{monthName(d.month, false).slice(0, 1)}</span>
                  <span className="hidden md:inline">{shortMonth(d.month)}</span>
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
