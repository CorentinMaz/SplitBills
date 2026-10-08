import type { Entry } from '../types'
import { round2 } from './money'

/** Positive balance: the group owes this member. Negative: this member owes the group. */
export function computeBalances(memberIds: string[], entries: Entry[]) {
  const balances: Record<string, number> = Object.fromEntries(memberIds.map((id) => [id, 0]))

  for (const e of entries) {
    balances[e.paidBy] = (balances[e.paidBy] ?? 0) + e.amount
    if (e.kind === 'payment') {
      balances[e.to] = (balances[e.to] ?? 0) - e.amount
      continue
    }
    const total = Object.values(e.shares).reduce((a, b) => a + b, 0) || 100
    for (const [uid, share] of Object.entries(e.shares)) {
      balances[uid] = (balances[uid] ?? 0) - (e.amount * share) / total
    }
  }

  for (const id of Object.keys(balances)) balances[id] = round2(balances[id])
  return balances
}

export type Transfer = { from: string; to: string; amount: number }

/** Greedy settle-up: fewest transfers in the common case, exact for two people. */
export function settleUp(balances: Record<string, number>): Transfer[] {
  const debtors = Object.entries(balances).filter(([, b]) => b < -0.005).map(([id, b]) => ({ id, amt: -b }))
  const creditors = Object.entries(balances).filter(([, b]) => b > 0.005).map(([id, b]) => ({ id, amt: b }))
  debtors.sort((a, b) => b.amt - a.amt)
  creditors.sort((a, b) => b.amt - a.amt)

  const transfers: Transfer[] = []
  let i = 0
  let j = 0
  while (i < debtors.length && j < creditors.length) {
    const amount = round2(Math.min(debtors[i].amt, creditors[j].amt))
    if (amount > 0) transfers.push({ from: debtors[i].id, to: creditors[j].id, amount })
    debtors[i].amt -= amount
    creditors[j].amt -= amount
    if (debtors[i].amt < 0.005) i++
    if (creditors[j].amt < 0.005) j++
  }
  return transfers
}
