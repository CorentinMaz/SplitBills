import { toast } from 'sonner'
import { addPayment } from '@/data/entries'
import { reportError } from './errors'
import { formatMoney, today } from './money'
import type { Transfer } from './balance'

/** Records each transfer as a payment in its group. */
export async function recordTransfers(transfers: (Transfer & { groupId: string })[], createdBy: string) {
  try {
    await Promise.all(
      transfers.map((t) =>
        addPayment(t.groupId, { amount: t.amount, paidBy: t.from, to: t.to, date: today(), createdBy }),
      ),
    )
    toast.success(transfers.length > 1 ? 'Remboursements enregistrés' : 'Remboursement enregistré')
  } catch (e) {
    reportError(e)
  }
}

/** Friendly nudge through the share sheet, or the clipboard on desktop. */
export async function remind(name: string, amount: number) {
  const text = `Petit rappel 🙂 Il reste ${formatMoney(amount)} à régler entre nous sur SplitBills. ${location.origin}`
  if (navigator.share) {
    await navigator.share({ title: 'SplitBills', text }).catch(() => {})
  } else {
    await navigator.clipboard.writeText(text)
    toast.success(`Rappel copié`, { description: `Colle-le dans ta conversation avec ${name}.` })
  }
}
