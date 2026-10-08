import { computeBalances, settleUp, type Transfer } from './balance'
import { round2 } from './money'
import type { Entry, Expense, Group } from '@/types'

export function myShareOf(e: Expense, uid: string) {
  const total = Object.values(e.shares).reduce((a, b) => a + b, 0) || 100
  return (e.amount * (e.shares[uid] ?? 0)) / total
}

export function groupSummary(group: Group, entries: Entry[], uid: string) {
  const balances = computeBalances(group.memberIds, entries)
  const expenses = entries.filter((e): e is Expense => e.kind === 'expense')
  const latest = [...expenses].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt)[0]
  return {
    balances,
    balance: balances[uid] ?? 0,
    transfers: settleUp(balances),
    total: round2(expenses.reduce((s, e) => s + e.amount, 0)),
    count: expenses.length,
    latest,
  }
}

export type PersonBalance = {
  uid: string
  name: string
  /** Positive: they owe me. Negative: I owe them. */
  amount: number
  transfers: (Transfer & { groupId: string })[]
}

/** Net balance with each person across every group, from the suggested settle-up transfers. */
export function personBalances(groups: Group[], byGroup: Record<string, Entry[]>, uid: string) {
  const people = new Map<string, PersonBalance>()
  for (const g of groups) {
    for (const t of settleUp(computeBalances(g.memberIds, byGroup[g.id] ?? []))) {
      if (t.from !== uid && t.to !== uid) continue
      const other = t.from === uid ? t.to : t.from
      const p = people.get(other) ?? { uid: other, name: g.members[other]?.name ?? '?', amount: 0, transfers: [] }
      p.amount = round2(p.amount + (t.to === uid ? t.amount : -t.amount))
      p.transfers.push({ ...t, groupId: g.id })
      people.set(other, p)
    }
  }
  return [...people.values()].filter((p) => Math.abs(p.amount) > 0.005).sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
}

export function byCategory(expenses: Expense[]) {
  const totals = new Map<string, number>()
  for (const e of expenses) totals.set(e.category ?? 'other', (totals.get(e.category ?? 'other') ?? 0) + e.amount)
  return [...totals.entries()].map(([id, amount]) => ({ id, amount })).sort((a, b) => b.amount - a.amount)
}
