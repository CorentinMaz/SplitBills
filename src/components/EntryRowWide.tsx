import { Banknote, EllipsisVertical, Pencil, Trash2 } from 'lucide-react'
import { useOpenExpense } from '@/components/ExpenseDialog'
import UserAvatar from '@/components/UserAvatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { deleteEntry } from '@/data/entries'
import { categoryOf, TINTS } from '@/lib/categories'
import { formatMoney } from '@/lib/money'
import { myShareOf } from '@/lib/stats'
import { cn } from '@/lib/utils'
import type { Entry, Group } from '@/types'

/** Desktop expense row: richer than the phone row, with an actions menu. */
export default function EntryRowWide({ entry: e, group, me }: { entry: Entry; group: Group; me: string }) {
  const openExpense = useOpenExpense()
  const money = (n: number) => formatMoney(n, group.currency)
  const name = (uid: string) => (uid === me ? 'Toi' : (group.members[uid]?.name ?? 'Ancien membre'))

  if (e.kind === 'payment') {
    return (
      <li className="flex items-center gap-4 rounded-xl border-[1.5px] border-dashed px-5 py-4">
        <span className={cn('grid size-12 shrink-0 place-items-center rounded-xl', TINTS.green)}>
          <Banknote className="size-5" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="font-semibold">
            {name(e.paidBy)} → {name(e.to)}
          </span>
          <span className="text-sm text-muted-foreground">Remboursement</span>
        </span>
        <strong className="text-lg">{money(e.amount)}</strong>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full" aria-label="Actions">
              <EllipsisVertical />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              variant="destructive"
              onClick={() => confirm('Annuler ce remboursement?') && deleteEntry(group.id, e.id)}
            >
              <Trash2 /> Annuler le remboursement
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </li>
    )
  }

  const cat = categoryOf(e.category)
  const parts = Object.values(e.shares).filter((s) => s > 0).length
  const mine = myShareOf(e, me)
  const edit = () => openExpense({ groupId: group.id, expense: e })
  return (
    <li className="flex items-center gap-4 rounded-xl bg-card px-5 py-4 shadow-soft transition hover:shadow-md">
      <button type="button" onClick={edit} className="flex min-w-0 flex-1 items-center gap-4 text-left">
        <span className={cn('grid size-12 shrink-0 place-items-center rounded-xl', cat.tint)}>
          <cat.icon className="size-5" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="flex items-center gap-2">
            <span className="truncate text-[17px] font-semibold">{e.title}</span>
            <Badge variant="secondary" className="rounded-full bg-muted text-muted-foreground">
              {parts} part{parts > 1 ? 's' : ''}
            </Badge>
          </span>
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <UserAvatar id={e.paidBy} name={group.members[e.paidBy]?.name} className="size-5 text-[8px]" />
            <span className={cn(e.paidBy === me && 'font-semibold text-primary')}>
              {e.paidBy === me ? 'Payé par toi' : name(e.paidBy)}
            </span>
            · {cat.label}
          </span>
        </span>
        <span className="flex flex-col items-end">
          <strong className="text-lg whitespace-nowrap">{money(e.amount)}</strong>
          {e.paidBy === me ? (
            <span className="text-xs font-semibold whitespace-nowrap text-positive">+{money(e.amount - mine)} avancé</span>
          ) : (
            <span className="text-xs whitespace-nowrap text-muted-foreground">Ta part : {money(mine)}</span>
          )}
        </span>
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="rounded-full" aria-label="Actions">
            <EllipsisVertical />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={edit}>
            <Pencil /> Modifier
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onClick={() => confirm('Supprimer cette dépense?') && deleteEntry(group.id, e.id)}
          >
            <Trash2 /> Supprimer
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  )
}
