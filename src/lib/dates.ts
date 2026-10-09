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
