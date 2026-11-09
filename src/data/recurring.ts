import { addDoc, collection, deleteDoc, doc, getDocs, onSnapshot, runTransaction, updateDoc } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { db } from '../firebase'
import { reportError } from '@/lib/errors'
import { today } from '@/lib/money'
import { dueMonths, occurrenceDate } from '@/lib/recurring'
import type { Group, Recurring } from '../types'

const rulesOf = (groupId: string) => collection(db, 'groups', groupId, 'recurring')

export function useRecurring(groupId: string) {
  const [rules, setRules] = useState<Recurring[] | null>(null)
  useEffect(
    () =>
      onSnapshot(
        rulesOf(groupId),
        (snap) => setRules(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Recurring)),
        (e) => {
          if ((e as { code?: string }).code !== 'permission-denied') reportError(e)
          setRules([])
        },
      ),
    [groupId],
  )
  return rules
}

type RuleData = Omit<Recurring, 'id' | 'lastMonth' | 'createdAt'>

export async function addRecurring(groupId: string, data: RuleData) {
  await addDoc(rulesOf(groupId), { ...data, lastMonth: null, createdAt: Date.now() })
  await runRecurring(groupId)
}

/** Changes apply from the next month added: expenses already added stay as they are. */
export async function updateRecurring(groupId: string, id: string, data: Partial<RuleData>) {
  await updateDoc(doc(rulesOf(groupId), id), data)
  await runRecurring(groupId)
}

/** Stops the rule. The expenses it already added stay in the group. */
export function deleteRecurring(groupId: string, id: string) {
  return deleteDoc(doc(rulesOf(groupId), id))
}

/**
 * Adds the expenses whose day has come. Each rule runs in a transaction that also moves
 * `lastMonth`, so two phones opening the app at once can't add the same month twice,
 * and an expense deleted by hand doesn't come back.
 */
export async function runRecurring(groupId: string) {
  const now = today()
  const rules = await getDocs(rulesOf(groupId))
  for (const snap of rules.docs) {
    if (dueMonths(snap.data() as Recurring, now).length === 0) continue
    await runTransaction(db, async (tx) => {
      const fresh = await tx.get(snap.ref)
      if (!fresh.exists()) return
      const rule = { id: fresh.id, ...fresh.data() } as Recurring
      const months = dueMonths(rule, now)
      if (months.length === 0) return
      for (const month of months) {
        tx.set(doc(db, 'groups', groupId, 'expenses', `${rule.id}-${month}`), {
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
        })
      }
      tx.update(snap.ref, { lastMonth: months.at(-1) })
    })
  }
}

/** Adds what's due in every group when the app opens, and again when it comes back to the front. */
export function useRecurringRunner(groups: Group[] | null) {
  const key = groups?.map((g) => g.id).join(',') ?? ''
  useEffect(() => {
    if (!key) return
    // A background job: offline, it just tries again next time, so no error toast.
    const run = () => key.split(',').forEach((id) => runRecurring(id).catch(console.error))
    run()
    const onVisible = () => document.visibilityState === 'visible' && run()
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [key])
}
