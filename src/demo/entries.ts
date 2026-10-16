import type { Entry, Expense, Group, Payment } from '@/types'
import { getState, newId, update, useStore } from './store'

const receipts = new Map<string, string>()

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
  receipts.delete(`${groupId}/${id}`)
}

export async function setReceipt(groupId: string, expenseId: string, image: string) {
  receipts.set(`${groupId}/${expenseId}`, image)
  await updateExpense(groupId, expenseId, { hasReceipt: true })
}

export async function removeReceipt(groupId: string, expenseId: string) {
  receipts.delete(`${groupId}/${expenseId}`)
  await updateExpense(groupId, expenseId, { hasReceipt: false })
}

export function useReceipt(groupId: string | undefined, expenseId: string | undefined): string | null | undefined {
  if (!groupId || !expenseId) return null
  const key = `${groupId}/${expenseId}`
  const stored = receipts.get(key)
  if (stored) return stored
  // Seeded expenses flagged with a receipt get a drawn one, so the design can be seen without scanning.
  const entry = getState().entries[groupId]?.find((e) => e.id === expenseId)
  if (!entry || entry.kind !== 'expense' || !entry.hasReceipt) return null
  const image = fakeReceipt(entry)
  receipts.set(key, image)
  return image
}

function fakeReceipt(e: Expense) {
  const canvas = document.createElement('canvas')
  canvas.width = 600
  canvas.height = 900
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#f7f6f2'
  ctx.fillRect(0, 0, 600, 900)
  ctx.fillStyle = '#222'
  ctx.textAlign = 'center'
  ctx.font = 'bold 34px monospace'
  ctx.fillText(e.title.toUpperCase(), 300, 80)
  ctx.font = '22px monospace'
  ctx.fillText('1234 rue Sainte-Catherine, Montréal', 300, 120)
  ctx.fillText(e.date, 300, 152)
  ctx.textAlign = 'left'
  const items = ['LAIT 2L', 'PAIN', 'POULET', 'POMMES', 'FROMAGE', 'CAFÉ', 'PÂTES', 'TOMATES']
  let rest = e.amount
  let y = 230
  items.forEach((item, i) => {
    const price = i === items.length - 1 ? rest : Math.round((rest / (items.length - i)) * (0.6 + (i % 3) * 0.3) * 100) / 100
    rest = Math.round((rest - price) * 100) / 100
    ctx.fillText(item, 60, y)
    ctx.textAlign = 'right'
    ctx.fillText(price.toFixed(2), 540, y)
    ctx.textAlign = 'left'
    y += 44
  })
  ctx.fillText('-'.repeat(30), 60, y + 10)
  ctx.font = 'bold 28px monospace'
  ctx.fillText('TOTAL', 60, y + 60)
  ctx.textAlign = 'right'
  ctx.fillText(e.amount.toFixed(2), 540, y + 60)
  ctx.textAlign = 'center'
  ctx.font = '22px monospace'
  ctx.fillText('MERCI, À BIENTÔT !', 300, y + 140)
  return canvas.toDataURL('image/jpeg', 0.8)
}

export function useAllEntries(groups: Group[] | null): Record<string, Entry[]> | null {
  const entries = useStore((s) => s.entries)
  if (!groups) return null
  return Object.fromEntries(groups.map((g) => [g.id, entries[g.id] ?? []]))
}
