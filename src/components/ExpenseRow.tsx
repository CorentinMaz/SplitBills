import { Banknote } from 'lucide-react'
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
  return (
    <li>
      <button
        type="button"
        onClick={() => openExpense({ groupId, expense: e })}
        className={cn(rowClass, 'w-full bg-card text-left shadow-soft transition hover:-translate-y-0.5 hover:shadow-md')}
      >
        <span className={cn('grid size-12 shrink-0 place-items-center rounded-full', cat.tint)}>
          <cat.icon className="size-5" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-[17px] font-semibold">{e.title}</span>
          <span className="text-sm text-muted-foreground">
            {where}
            {e.paidBy === me ? 'Payé par toi' : `Payé par ${nameOf(e.paidBy)}`} · {relativeDay(e.date)}
          </span>
        </span>
        <span className="flex flex-col items-end text-right">
          <strong className="whitespace-nowrap text-[17px]">{money(e.amount)}</strong>
          <span className="whitespace-nowrap text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
            Ta part {money(mine)}
          </span>
        </span>
      </button>
    </li>
  )
}
