import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { monthName, monthRange, shiftMonth } from '@/lib/dates'
import { today } from '@/lib/money'
import { cn } from '@/lib/utils'

/** "‹ Octobre 2026 ›" pill: arrows step one month, the label opens the full list. Never goes past this month. */
export default function MonthPicker({
  value,
  onChange,
  earliest,
  className,
}: {
  value: string
  onChange: (month: string) => void
  /** Oldest month with data, "YYYY-MM". */
  earliest: string
  className?: string
}) {
  const current = today().slice(0, 7)
  const months = monthRange(earliest < current ? earliest : current, current)
  return (
    <div className={cn('flex h-10 items-center rounded-full border bg-card shadow-soft', className)}>
      <Button
        variant="ghost"
        size="icon"
        className="size-10 rounded-full"
        aria-label="Mois précédent"
        disabled={value <= months.at(-1)!}
        onClick={() => onChange(shiftMonth(value, -1))}
      >
        <ChevronLeft />
      </Button>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-10 gap-2 border-0 bg-transparent px-2 font-semibold capitalize shadow-none hover:text-primary focus-visible:ring-0 [&>svg:last-child]:hidden">
          <CalendarDays className="size-4 text-primary" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="center">
          {months.map((m) => (
            <SelectItem key={m} value={m} className="capitalize">
              {monthName(m)}
              {m === current && ' (ce mois-ci)'}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        variant="ghost"
        size="icon"
        className="size-10 rounded-full"
        aria-label="Mois suivant"
        disabled={value >= current}
        onClick={() => onChange(shiftMonth(value, 1))}
      >
        <ChevronRight />
      </Button>
    </div>
  )
}
