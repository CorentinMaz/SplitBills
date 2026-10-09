import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, updateDoc } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { db } from '../firebase'
import { reportError } from '@/lib/errors'

// A permission error on expenses means the group was deleted or we left it: the group page redirects, no toast needed.
const ignoreGone = (e: unknown) => (e as { code?: string }).code !== 'permission-denied' && reportError(e)
import type { Entry, Expense, Group, Payment } from '../types'

const entriesOf = (groupId: string) => collection(db, 'groups', groupId, 'expenses')

export function useEntries(groupId: string) {
  const [entries, setEntries] = useState<Entry[] | null>(null)
  useEffect(
    () =>
      onSnapshot(
        query(entriesOf(groupId), orderBy('date', 'desc')),
        (snap) => setEntries(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Entry)),
        (e) => {
          ignoreGone(e)
          setEntries([])
        },
      ),
    [groupId],
  )
  return entries
}

export function addExpense(groupId: string, data: Omit<Expense, 'id' | 'kind' | 'createdAt'>) {
  return addDoc(entriesOf(groupId), { ...data, kind: 'expense', createdAt: Date.now() })
}

export function updateExpense(groupId: string, id: string, data: Partial<Omit<Expense, 'id' | 'kind'>>) {
  return updateDoc(doc(entriesOf(groupId), id), data)
}

export function addPayment(groupId: string, data: Omit<Payment, 'id' | 'kind' | 'createdAt'>) {
  return addDoc(entriesOf(groupId), { ...data, kind: 'payment', createdAt: Date.now() })
}

export function deleteEntry(groupId: string, id: string) {
  return deleteDoc(doc(entriesOf(groupId), id))
}

/** Live entries for several groups at once, keyed by group id. Null until every group has loaded. */
export function useAllEntries(groups: Group[] | null) {
  const [byGroup, setByGroup] = useState<Record<string, Entry[]>>({})
  const key = groups?.map((g) => g.id).join(',') ?? ''

  useEffect(() => {
    if (!key) return
    const unsubs = key.split(',').map((groupId) =>
      onSnapshot(
        query(entriesOf(groupId), orderBy('date', 'desc')),
        (snap) =>
          setByGroup((prev) => ({ ...prev, [groupId]: snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Entry) })),
        (e) => {
          ignoreGone(e)
          setByGroup((prev) => ({ ...prev, [groupId]: [] }))
        },
      ),
    )
    return () => unsubs.forEach((u) => u())
  }, [key])

  if (!groups) return null
  if (groups.some((g) => !byGroup[g.id])) return null
  return Object.fromEntries(groups.map((g) => [g.id, byGroup[g.id]]))
}
