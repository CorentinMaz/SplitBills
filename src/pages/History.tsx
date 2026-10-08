import { ArrowDown, ArrowUp, History as HistoryIcon } from 'lucide-react'
import { useState } from 'react'
import { displayName, useUser } from '@/auth'
import ExpenseRow from '@/components/ExpenseRow'
import { Loading, Page } from '@/components/Page'
import UserAvatar from '@/components/UserAvatar'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useAllEntries } from '@/data/entries'
import { useGroups } from '@/data/groups'
import { computeBalances } from '@/lib/balance'
import { CATEGORIES, TINTS } from '@/lib/categories'
import { currentMonthName, monthLabel } from '@/lib/dates'
import { formatMoney, round2, today } from '@/lib/money'
import { nameIn } from '@/lib/names'
import { cn } from '@/lib/utils'

export default function History() {
  const user = useUser()
  const groups = useGroups(user.uid)
  const byGroup = useAllEntries(groups)
  const [category, setCategory] = useState<string | null>(null)

  if (!groups || (groups.length > 0 && !byGroup)) return <Loading />

  const month = today().slice(0, 7)
  let monthSpent = 0
  let owed = 0
  let owe = 0
  for (const g of groups) {
    const entries = byGroup?.[g.id] ?? []
    for (const e of entries) if (e.kind === 'expense' && e.date.startsWith(month)) monthSpent += e.amount
    const b = computeBalances(g.memberIds, entries)[user.uid] ?? 0
    if (b > 0) owed += b
    else owe -= b
  }

  const all = groups
    .flatMap((g) => (byGroup?.[g.id] ?? []).map((entry) => ({ entry, group: g })))
    .filter(({ entry }) => !category || (entry.kind === 'expense' && (entry.category ?? 'other') === category))
    .sort((a, b) => b.entry.date.localeCompare(a.entry.date) || b.entry.createdAt - a.entry.createdAt)

  const months: { label: string; items: typeof all }[] = []
  for (const item of all) {
    const label = monthLabel(item.entry.date)
    if (months.at(-1)?.label !== label) months.push({ label, items: [] })
    months.at(-1)!.items.push(item)
  }

  const chips = [{ id: null, label: 'Tous', icon: HistoryIcon }, ...CATEGORIES]

  return (
    <Page>
      <div className="flex items-center gap-3 pt-2 md:pt-0">
        <UserAvatar id={user.uid} name={displayName(user)} className="md:hidden" />
        <h1 className="text-[28px] font-bold tracking-tight text-primary md:text-[32px]">Historique</h1>
      </div>

      <div className="no-scrollbar -mx-5 flex gap-2.5 overflow-x-auto px-5 md:mx-0 md:flex-wrap md:px-0">
        {chips.map((c) => (
          <Button
            key={c.id ?? 'all'}
            variant={category === c.id ? 'default' : 'secondary'}
            className={cn('shrink-0 rounded-full px-4', category !== c.id && 'bg-muted text-muted-foreground')}
            onClick={() => setCategory(c.id)}
          >
            <c.icon /> {c.label}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="row-span-2 flex flex-col justify-between gap-2.5 rounded-xl bg-gradient-to-br from-teal-50 to-teal-200 p-5 text-teal-900 md:row-span-1 dark:from-teal-900/40 dark:to-teal-700/40 dark:text-teal-100">
          <span className="text-sm">Ce mois-ci</span>
          <strong className="text-3xl tracking-tight">{formatMoney(monthSpent)}</strong>
          <span className="text-sm">Total dépensé en {currentMonthName()}</span>
        </div>
        {[
          { label: 'Tu dois', value: owe, icon: ArrowDown, tint: TINTS.orange },
          { label: 'On te doit', value: owed, icon: ArrowUp, tint: TINTS.green },
        ].map((s) => (
          <Card key={s.label} className="flex-row items-center gap-3 border-0 p-3.5 shadow-soft">
            <span className={cn('grid size-10 shrink-0 place-items-center rounded-full', s.tint)}>
              <s.icon className="size-5" />
            </span>
            <span className="flex flex-col">
              <strong>{formatMoney(round2(s.value))}</strong>
              <span className="text-sm text-muted-foreground">{s.label}</span>
            </span>
          </Card>
        ))}
      </div>

      {months.length === 0 && <p className="py-8 text-center text-muted-foreground">Rien à afficher.</p>}
      {months.map((m) => (
        <section key={m.label} className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">{m.label}</h2>
          <ul className="flex flex-col gap-3">
            {m.items.map(({ entry, group }) => (
              <ExpenseRow
                key={entry.id}
                entry={entry}
                groupId={group.id}
                me={user.uid}
                nameOf={nameIn(group, user.uid)}
                currency={group.currency}
                groupName={groups.length > 1 ? group.name : undefined}
              />
            ))}
          </ul>
        </section>
      ))}
    </Page>
  )
}
