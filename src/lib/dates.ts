import { today } from './money'

const dayFmt = new Intl.DateTimeFormat('fr-CA', { day: 'numeric', month: 'short' })
const monthFmt = new Intl.DateTimeFormat('fr-CA', { month: 'long', year: 'numeric' })

function parse(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function relativeDay(iso: string) {
  const t = today()
  if (iso === t) return "Aujourd'hui"
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  if (iso === yesterday.toLocaleDateString('en-CA')) return 'Hier'
  return dayFmt.format(parse(iso))
}

export function monthLabel(iso: string) {
  const s = monthFmt.format(parse(iso))
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function currentMonthName() {
  return new Intl.DateTimeFormat('fr-CA', { month: 'long' }).format(new Date())
}

/** "2026-10" → "octobre 2026" (or "octobre" with `withYear` false). */
export function monthName(ym: string, withYear = true) {
  const d = parse(`${ym}-01`)
  return new Intl.DateTimeFormat('fr-CA', withYear ? { month: 'long', year: 'numeric' } : { month: 'long' }).format(d)
}

/** Moves a "YYYY-MM" key by `delta` months. */
export function shiftMonth(ym: string, delta: number) {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/** Every month from `from` to `to` included, newest first. */
export function monthRange(from: string, to: string) {
  const out: string[] = []
  for (let m = to; m >= from; m = shiftMonth(m, -1)) out.push(m)
  return out
}

/** True when `iso` falls in one of `months`; no months means every month. */
export function inMonths(iso: string, months: string[]) {
  return months.length === 0 || months.includes(iso.slice(0, 7))
}

/** "octobre 2026", "août à octobre 2026", "3 mois", or "tous les mois" when none is picked. */
export function periodLabel(months: string[]) {
  if (months.length === 0) return 'tous les mois'
  const sorted = [...months].sort()
  const first = sorted[0]
  const last = sorted.at(-1)!
  if (sorted.length === 1) return monthName(first)
  if (monthRange(first, last).length !== sorted.length) return `${sorted.length} mois`
  const sameYear = first.slice(0, 4) === last.slice(0, 4)
  return `${monthName(first, !sameYear)} à ${monthName(last)}`
}
