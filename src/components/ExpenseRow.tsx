import { Banknote, Receipt, Repeat } from 'lucide-react'
import { useOpenExpense } from '@/components/ExpenseDialog'
import { Button } from '@/components/ui/button'
import { categoryOf, TINTS } from '@/lib/categories'
import { relativeDay } from '@/lib/dates'
import { formatMoney } from '@/lib/money'
import { cn } from '@/lib/utils'
import type { Entry } from '@/types'

type Props = {
  entry: Entry
  groupId: string
  me: string
  nameOf: (uid: string) => string
  currency?: string
  groupName?: string
  onDeletePayment?: () => void
}

const rowClass = 'flex items-center gap-3.5 rounded-xl p-4'

export default function ExpenseRow({ entry: e, groupId, me, nameOf, currency, groupName, onDeletePayment }: Props) {
  const openExpense = useOpenExpense()
  const money = (n: number) => formatMoney(n, currency)
  const where = groupName ? `${groupName} · ` : ''

  if (e.kind === 'payment') {
    return (
      <li className={cn(rowClass, 'border-[1.5px] border-dashed')}>
        <span className={cn('grid size-12 shrink-0 place-items-center rounded-full', TINTS.green)}>
          <Banknote className="size-5" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate font-semibold">
            {nameOf(e.paidBy)} → {nameOf(e.to)}
          </span>
          <span className="text-sm text-muted-foreground">
            {where}Remboursement · {relativeDay(e.date)}
          </span>
        </span>
        <span className="flex flex-col items-end">
          <strong className="whitespace-nowrap">{money(e.amount)}</strong>
          {onDeletePayment && (
            <Button variant="link" size="sm" className="h-auto p-0 text-xs text-destructive" onClick={onDeletePayment}>
              Annuler
            </Button>
          )}
        </span>
      </li>
    )
  }

  const cat = categoryOf(e.category)
  const total = Object.values(e.shares).reduce((a, b) => a + b, 0) || 100
  const mine = (e.amount * (e.shares[me] ?? 0)) / total
  const paidByMe = e.paidBy === me
  return (
    <li>
      <button
        type="button"
        onClick={() => openExpense({ groupId, expense: e })}
        className={cn(rowClass, 'w-full bg-card text-left shadow-soft transition hover:-translate-y-0.5 hover:shadow-md')}
      >
        <span className={cn('grid size-12 shrink-0 place-items-center rounded-xl', cat.tint)}>
          <cat.icon className="size-5" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="flex items-center gap-1.5 font-semibold">
            <span className="truncate">{e.title}</span>
            {e.hasReceipt && <Receipt className="size-3.5 shrink-0 text-muted-foreground" aria-label="Ticket joint" />}
            {e.recurringId && <Repeat className="size-3.5 shrink-0 text-muted-foreground" aria-label="Chaque mois" />}
          </span>
          <span className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[13px] text-muted-foreground">
            {where && <span className="truncate">{groupName} ·</span>}
            {paidByMe ? (
              <span className="rounded-md bg-secondary px-1.5 py-0.5 text-xs font-semibold text-secondary-foreground">Payé par toi</span>
            ) : (
              <span>Payé par {nameOf(e.paidBy)}</span>
            )}
            <span>· {relativeDay(e.date)}</span>
          </span>
        </span>
        <span className="flex shrink-0 flex-col items-end text-right">
          <strong className="whitespace-nowrap">{money(mine)}</strong>
          <span className="text-[11px] text-muted-foreground">Ta part</span>
          <span className={cn('whitespace-nowrap text-[11px]', paidByMe ? 'font-semibold text-positive' : 'text-muted-foreground')}>
            {paidByMe ? 'Avancé' : 'Total'} : {money(e.amount)}
          </span>
        </span>
      </button>
    </li>
  )
}
