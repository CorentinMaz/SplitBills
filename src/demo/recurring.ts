import { useEffect } from 'react'
import { today } from '@/lib/money'
import { dueMonths, occurrenceDate } from '@/lib/recurring'
import type { Entry, Group, Recurring } from '@/types'
import { getState, newId, update, useStore } from './store'

const sorted = (list: Entry[]) => [...list].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt)

function setRules(groupId: string, fn: (list: Recurring[]) => Recurring[]) {
  update((s) => ({ ...s, recurring: { ...s.recurring, [groupId]: fn(s.recurring[groupId] ?? []) } }))
}

export function useRecurring(groupId: string): Recurring[] | null {
  return useStore((s) => s.recurring[groupId] ?? [])
}

type RuleData = Omit<Recurring, 'id' | 'lastMonth' | 'createdAt'>

export async function addRecurring(groupId: string, data: RuleData) {
  setRules(groupId, (list) => [...list, { ...data, id: newId(), lastMonth: null, createdAt: Date.now() }])
  await runRecurring(groupId)
}

export async function updateRecurring(groupId: string, id: string, data: Partial<RuleData>) {
  setRules(groupId, (list) => list.map((r) => (r.id === id ? { ...r, ...data } : r)))
  await runRecurring(groupId)
}

export async function deleteRecurring(groupId: string, id: string) {
  setRules(groupId, (list) => list.filter((r) => r.id !== id))
}

export async function runRecurring(groupId: string) {
  const now = today()
  for (const rule of getState().recurring[groupId] ?? []) {
    const months = dueMonths(rule, now)
    if (months.length === 0) continue
    const added: Entry[] = months.map((month) => ({
      id: `${rule.id}-${month}`,
      kind: 'expense',
      title: rule.title,
      category: rule.category ?? 'other',
      amount: rule.amount,
      paidBy: rule.paidBy,
      shares: rule.shares,
      date: occurrenceDate(month, rule.day),
      recurringId: rule.id,
      createdBy: rule.createdBy,
      createdAt: Date.now(),
    }))
    update((s) => ({ ...s, entries: { ...s.entries, [groupId]: sorted([...(s.entries[groupId] ?? []), ...added]) } }))
    setRules(groupId, (list) => list.map((r) => (r.id === rule.id ? { ...r, lastMonth: months.at(-1)! } : r)))
  }
}

export function useRecurringRunner(groups: Group[] | null) {
  const key = groups?.map((g) => g.id).join(',') ?? ''
  useEffect(() => {
    if (key) key.split(',').forEach((id) => runRecurring(id))
  }, [key])
}
