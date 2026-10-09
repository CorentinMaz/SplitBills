import type { Entry, Expense, Group, Payment } from '@/types'

export const DEMO_UID = 'demo-me'

/** ISO date `days` before today, so "ce mois-ci" always has data. */
function ago(days: number) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toLocaleDateString('en-CA')
}

const COUPLE = { [DEMO_UID]: 70, lea: 30 }
const TRIP = { [DEMO_UID]: 25, lea: 25, max: 25, sam: 25 }
const CHALET = { [DEMO_UID]: 20, lea: 20, max: 20, sam: 20, jo: 20 }

export function seedGroups(): Group[] {
  return [
    {
      id: 'appart',
      name: 'Appart',
      currency: 'CAD',
      createdBy: DEMO_UID,
      memberIds: [DEMO_UID, 'lea'],
      members: { [DEMO_UID]: { name: 'Corentin', share: 70 }, lea: { name: 'Léa', share: 30 } },
    },
    {
      id: 'gaspesie',
      name: 'Road trip Gaspésie',
      currency: 'CAD',
      createdBy: 'max',
      memberIds: ['max', DEMO_UID, 'lea', 'sam'],
      members: {
        max: { name: 'Max Tremblay', share: 25 },
        [DEMO_UID]: { name: 'Corentin', share: 25 },
        lea: { name: 'Léa', share: 25 },
        sam: { name: 'Samuel Roy', share: 25 },
      },
    },
    {
      id: 'chalet',
      name: 'Chalet Mont-Tremblant',
      currency: 'CAD',
      createdBy: 'jo',
      memberIds: ['jo', DEMO_UID, 'lea', 'max', 'sam'],
      members: {
        jo: { name: 'Joëlle Gagnon', share: 20 },
        [DEMO_UID]: { name: 'Corentin', share: 20 },
        lea: { name: 'Léa', share: 20 },
        max: { name: 'Max Tremblay', share: 20 },
        sam: { name: 'Samuel Roy', share: 20 },
      },
    },
  ]
}

let n = 0
function expense(
  title: string,
  category: string,
  amount: number,
  paidBy: string,
  days: number,
  shares: Record<string, number>,
): Expense {
  n++
  return { id: `seed-${n}`, kind: 'expense', title, category, amount, paidBy, date: ago(days), shares, createdBy: paidBy, createdAt: n }
}
function payment(amount: number, paidBy: string, to: string, days: number): Payment {
  n++
  return { id: `seed-${n}`, kind: 'payment', amount, paidBy, to, date: ago(days), createdBy: paidBy, createdAt: n }
}

/** Six earlier months of couple life, so the Suivi chart has a history. Amounts vary a bit each month. */
function olderMonths(): Entry[] {
  const out: Entry[] = []
  for (let k = 2; k <= 7; k++) {
    const base = k * 30
    const wiggle = 1 + ((k * 37) % 9) / 20 - 0.2
    out.push(
      expense('Loyer', 'home', 1650, DEMO_UID, base + 8, COUPLE),
      expense('Hydro-Québec', 'bills', round(88 * wiggle), 'lea', base + 3, COUPLE),
      expense('IGA', 'groceries', round(135 * wiggle), 'lea', base + 12, COUPLE),
      expense('Costco', 'groceries', round(190 * wiggle), DEMO_UID, base + 20, COUPLE),
      expense(k % 2 ? 'Resto thaï' : 'Pizzeria Libretto', 'food', round(62 * wiggle), DEMO_UID, base + 15, { [DEMO_UID]: 50, lea: 50 }),
      payment(round(300 * wiggle), 'lea', DEMO_UID, base + 1),
    )
    if (k === 4) out.push(expense('Billets avion Paris', 'travel', 1840, DEMO_UID, base + 18, { [DEMO_UID]: 50, lea: 50 }))
  }
  return out
}

const round = (n: number) => Math.round(n * 100) / 100

export function seedEntries(): Record<string, Entry[]> {
  const sort = (list: Entry[]) => list.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt)
  return {
    appart: sort([
      expense('Loyer', 'home', 1650, DEMO_UID, 38, COUPLE),
      expense('Hydro-Québec', 'bills', 92.4, 'lea', 33, COUPLE),
      expense('IGA', 'groceries', 148.32, 'lea', 30, COUPLE),
      payment(250, 'lea', DEMO_UID, 26),
      expense('Vidéotron internet', 'bills', 75, DEMO_UID, 22, COUPLE),
      expense('Pharmaprix', 'other', 34.18, 'lea', 18, COUPLE),
      expense('Loyer', 'home', 1650, DEMO_UID, 8, COUPLE),
      expense('Metro', 'groceries', 126.75, 'lea', 6, COUPLE),
      expense('Sushi Shop', 'food', 68.5, DEMO_UID, 4, { [DEMO_UID]: 50, lea: 50 }),
      expense('Cinéma Banque Scotia', 'fun', 36, 'lea', 2, { [DEMO_UID]: 50, lea: 50 }),
      expense('Costco', 'groceries', 214.9, DEMO_UID, 1, COUPLE),
      expense('Station Shell', 'transport', 71.2, 'lea', 0, COUPLE),
      ...olderMonths(),
    ]),
    gaspesie: sort([
      expense('Location de voiture', 'transport', 420, 'max', 25, TRIP),
      expense('Airbnb Percé', 'travel', 640, DEMO_UID, 24, TRIP),
      expense('Essence', 'transport', 96.3, 'sam', 23, TRIP),
      expense('Homard au Café de l’Atlantique', 'food', 186.4, 'lea', 22, TRIP),
      expense('Parc national Forillon', 'fun', 77.6, 'max', 21, TRIP),
      expense('Épicerie Rimouski', 'groceries', 112.85, 'sam', 21, TRIP),
      payment(120, 'sam', DEMO_UID, 15),
    ]),
    chalet: sort([
      expense('Réservation chalet', 'travel', 980, 'jo', 12, CHALET),
      expense('Épicerie du weekend', 'groceries', 243.6, DEMO_UID, 3, CHALET),
      expense('Billets de ski', 'fun', 425, 'max', 2, CHALET),
      expense('Pizza du samedi', 'food', 88.75, 'lea', 1, CHALET),
    ]),
  }
}
