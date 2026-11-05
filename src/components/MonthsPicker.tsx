import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { monthName, periodLabel, shiftMonth } from '@/lib/dates'
import { cn } from '@/lib/utils'

/**
 * "‹ Août à octobre 2026 ›" pill to pick one month or several, whose totals then add up.
 * The arrows slide the whole selection by a month; the label opens the list to tick months.
 * With `allowAll`, an empty selection means every month.
 */
export default function MonthsPicker({
  value,
  onChange,
  months,
  allowAll = false,
  className,
}: {
  value: string[]
  onChange: (months: string[]) => void
  /** The months offered, newest first. */
  months: string[]
  allowAll?: boolean
  className?: string
}) {
  const sorted = [...value].sort()
  const canShift = (delta: number) =>
    value.length > 0 && months.includes(shiftMonth(delta < 0 ? sorted[0] : sorted.at(-1)!, delta))
  const shift = (delta: number) => onChange(value.map((m) => shiftMonth(m, delta)))

  function toggle(month: string) {
    const next = value.includes(month) ? value.filter((m) => m !== month) : [...value, month]
    if (next.length > 0 || allowAll) onChange(next)
  }

  return (
    <div className={cn('flex h-10 items-center rounded-full border bg-card shadow-soft', className)}>
      <Button
        variant="ghost"
        size="icon"
        className="size-10 rounded-full"
        aria-label="Mois précédent"
        disabled={!canShift(-1)}
        onClick={() => shift(-1)}
      >
        <ChevronLeft />
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex h-10 min-w-0 items-center gap-2 px-2 text-sm font-semibold outline-none hover:text-primary"
          >
            <CalendarDays className="size-4 shrink-0 text-primary" />
            <span className="truncate first-letter:uppercase">{periodLabel(value)}</span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" className="max-h-80">
          {allowAll && (
            <>
              <DropdownMenuCheckboxItem
                checked={value.length === 0}
                // Stay open: ticking several months is the point.
                onSelect={(e) => e.preventDefault()}
                onCheckedChange={() => onChange([])}
              >
                Tous les mois
              </DropdownMenuCheckboxItem>
              <DropdownMenuSeparator />
            </>
          )}
          {months.map((m) => (
            <DropdownMenuCheckboxItem
              key={m}
              checked={value.includes(m)}
              onSelect={(e) => e.preventDefault()}
              onCheckedChange={() => toggle(m)}
            >
              <span className="first-letter:uppercase">{monthName(m)}</span>
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <Button
        variant="ghost"
        size="icon"
        className="size-10 rounded-full"
        aria-label="Mois suivant"
        disabled={!canShift(1)}
        onClick={() => shift(1)}
      >
        <ChevronRight />
      </Button>
    </div>
  )
}
