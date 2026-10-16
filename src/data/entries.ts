import { addDoc, collection, deleteDoc, doc, getDoc, onSnapshot, orderBy, query, setDoc, updateDoc } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { db } from '../firebase'
import { reportError } from '@/lib/errors'
import { notifyMembers } from '@/lib/notify'

// A permission error on expenses means the group was deleted or we left it: the group page redirects, no toast needed.
const ignoreGone = (e: unknown) => (e as { code?: string }).code !== 'permission-denied' && reportError(e)
import type { Entry, Expense, Group, Payment } from '../types'

const entriesOf = (groupId: string) => collection(db, 'groups', groupId, 'expenses')
const receiptOf = (groupId: string, expenseId: string) => doc(db, 'groups', groupId, 'receipts', expenseId)

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

export async function addExpense(groupId: string, data: Omit<Expense, 'id' | 'kind' | 'createdAt'>) {
  const ref = await addDoc(entriesOf(groupId), { ...data, kind: 'expense', createdAt: Date.now() })
  notifyMembers(groupId, ref.id)
  return ref
}

export function updateExpense(groupId: string, id: string, data: Partial<Omit<Expense, 'id' | 'kind'>>) {
  return updateDoc(doc(entriesOf(groupId), id), data)
}

export async function addPayment(groupId: string, data: Omit<Payment, 'id' | 'kind' | 'createdAt'>) {
  const ref = await addDoc(entriesOf(groupId), { ...data, kind: 'payment', createdAt: Date.now() })
  notifyMembers(groupId, ref.id)
  return ref
}

export async function deleteEntry(groupId: string, id: string) {
  await deleteDoc(doc(entriesOf(groupId), id))
  deleteDoc(receiptOf(groupId, id)).catch(() => {})
}

/** Stores the receipt photo (a JPEG data URL) of an expense and flags the expense. */
export async function setReceipt(groupId: string, expenseId: string, image: string) {
  await setDoc(receiptOf(groupId, expenseId), { image, createdAt: Date.now() })
  await updateDoc(doc(entriesOf(groupId), expenseId), { hasReceipt: true })
}

export async function removeReceipt(groupId: string, expenseId: string) {
  await updateDoc(doc(entriesOf(groupId), expenseId), { hasReceipt: false })
  await deleteDoc(receiptOf(groupId, expenseId))
}

/** The receipt photo of an expense: undefined while loading, null when there is none. */
export function useReceipt(groupId: string | undefined, expenseId: string | undefined) {
  const [image, setImage] = useState<string | null | undefined>(groupId && expenseId ? undefined : null)
  useEffect(() => {
    if (!groupId || !expenseId) return
    let live = true
    getDoc(receiptOf(groupId, expenseId))
      .then((snap) => live && setImage((snap.data()?.image as string | undefined) ?? null))
      .catch((e) => {
        ignoreGone(e)
        if (live) setImage(null)
      })
    return () => {
      live = false
    }
  }, [groupId, expenseId])
  return image
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
