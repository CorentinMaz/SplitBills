import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, updateDoc } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { db } from '../firebase'
import type { Entry, Expense, Payment } from '../types'

const entriesOf = (groupId: string) => collection(db, 'groups', groupId, 'expenses')

export function useEntries(groupId: string) {
  const [entries, setEntries] = useState<Entry[] | null>(null)
  useEffect(
    () =>
      onSnapshot(query(entriesOf(groupId), orderBy('date', 'desc')), (snap) =>
        setEntries(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Entry)),
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
