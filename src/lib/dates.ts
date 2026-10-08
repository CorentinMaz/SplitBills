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
