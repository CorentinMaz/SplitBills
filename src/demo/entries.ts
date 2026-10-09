import type { Entry, Expense, Group, Payment } from '@/types'
import { newId, update, useStore } from './store'

const sorted = (list: Entry[]) => [...list].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt)

function setEntries(groupId: string, fn: (list: Entry[]) => Entry[]) {
  update((s) => ({ ...s, entries: { ...s.entries, [groupId]: sorted(fn(s.entries[groupId] ?? [])) } }))
}

export function useEntries(groupId: string): Entry[] | null {
  return useStore((s) => s.entries[groupId] ?? [])
}

export async function addExpense(groupId: string, data: Omit<Expense, 'id' | 'kind' | 'createdAt'>) {
  setEntries(groupId, (list) => [...list, { ...data, id: newId(), kind: 'expense', createdAt: Date.now() }])
}

export async function updateExpense(groupId: string, id: string, data: Partial<Omit<Expense, 'id' | 'kind'>>) {
  setEntries(groupId, (list) => list.map((e) => (e.id === id && e.kind === 'expense' ? { ...e, ...data } : e)))
}

export async function addPayment(groupId: string, data: Omit<Payment, 'id' | 'kind' | 'createdAt'>) {
  setEntries(groupId, (list) => [...list, { ...data, id: newId(), kind: 'payment', createdAt: Date.now() }])
}

export async function deleteEntry(groupId: string, id: string) {
  setEntries(groupId, (list) => list.filter((e) => e.id !== id))
}

export function useAllEntries(groups: Group[] | null): Record<string, Entry[]> | null {
  const entries = useStore((s) => s.entries)
  if (!groups) return null
  return Object.fromEntries(groups.map((g) => [g.id, entries[g.id] ?? []]))
}
