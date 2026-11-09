import { shiftMonth } from './dates'
import type { Recurring } from '@/types'

/** "YYYY-MM-DD" of the rule's day in `month`; the 31st falls on the 30th in November. */
export function occurrenceDate(month: string, day: number) {
  const [y, m] = month.split('-').map(Number)
  const last = new Date(y, m, 0).getDate()
  return `${month}-${String(Math.min(day, last)).padStart(2, '0')}`
}

/** The month the rule adds next. */
export function nextMonth(rule: Pick<Recurring, 'startMonth' | 'lastMonth'>) {
  const after = rule.lastMonth ? shiftMonth(rule.lastMonth, 1) : rule.startMonth
  return after > rule.startMonth ? after : rule.startMonth
}

/** Months whose day has come and that the rule hasn't added yet, oldest first. */
export function dueMonths(rule: Pick<Recurring, 'startMonth' | 'lastMonth' | 'day'>, todayIso: string) {
  const out: string[] = []
  for (let m = nextMonth(rule); occurrenceDate(m, rule.day) <= todayIso; m = shiftMonth(m, 1)) out.push(m)
  return out
}
