import { TrendingUp, Users } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { displayName, useUser } from '@/auth'
import ExpenseRow from '@/components/ExpenseRow'
import { Fab, Loading, Money, Page } from '@/components/Page'
import UserAvatar from '@/components/UserAvatar'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useAllEntries } from '@/data/entries'
import { useGroups } from '@/data/groups'
import { computeBalances } from '@/lib/balance'
import { currentMonthName } from '@/lib/dates'
import { formatMoney, round2, today } from '@/lib/money'
import { nameIn } from '@/lib/names'
import { cn } from '@/lib/utils'

export default function Home() {
  const user = useUser()
  const groups = useGroups(user.uid)
  const byGroup = useAllEntries(groups)
  const [filter, setFilter] = useState<string | null>(null)

  if (!groups || (groups.length > 0 && !byGroup)) return <Loading />

  const month = today().slice(0, 7)
  const shown = groups.filter((g) => !filter || g.id === filter)
  let spent = 0
  let balance = 0
  for (const g of shown) {
    const entries = byGroup?.[g.id] ?? []
    for (const e of entries) if (e.kind === 'expense' && e.date.startsWith(month)) spent += e.amount
    balance += computeBalances(g.memberIds, entries)[user.uid] ?? 0
  }
  balance = round2(balance)

  const recent = shown
    .flatMap((g) => (byGroup?.[g.id] ?? []).map((entry) => ({ entry, group: g })))
    .sort((a, b) => b.entry.date.localeCompare(a.entry.date) || b.entry.createdAt - a.entry.createdAt)
    .slice(0, 6)

  const fabGroup = filter ?? (groups.length === 1 ? groups[0].id : null)

  return (
    <Page>
      <div className="flex items-center gap-3 pt-2 md:hidden">
        <Link to="/profile">
          <UserAvatar id={user.uid} name={displayName(user)} />
        </Link>
        <span className="text-[28px] font-bold tracking-tight text-primary">SplitBills</span>
      </div>

      <div>
        <h1 className="text-[32px] leading-10 font-bold tracking-tight">Aperçu</h1>
        <p className="mt-1.5 text-muted-foreground">Voici un résumé de vos finances partagées ce mois-ci.</p>
      </div>

      <section className="relative flex flex-col gap-2.5 overflow-hidden rounded-xl bg-brand p-5 text-white shadow-xl shadow-teal-700/25">
        <span className="absolute -top-20 -right-16 size-56 rounded-full bg-white/10" />
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold tracking-wider uppercase opacity-85">
            Dépenses totales ({currentMonthName()})
          </span>
          <span className="grid size-9 place-items-center rounded-full bg-white/20">
            <TrendingUp className="size-5" />
          </span>
        </div>
        <span className="text-4xl font-bold tracking-tight">{formatMoney(spent)}</span>
        <Separator className="my-2 bg-white/25" />
        <div className="flex items-end justify-between">
          <span className="flex flex-col gap-0.5">
            <span className="text-xs font-bold tracking-wider uppercase opacity-85">Solde global</span>
            <span
              className={cn(
                'text-xl font-bold',
                balance > 0 && '[&_span]:text-emerald-200',
                balance < 0 && '[&_span]:text-orange-200',
              )}
            >
              <Money value={balance} />
            </span>
          </span>
          <span className="opacity-90">{balance > 0 ? 'On te doit' : balance < 0 ? 'Tu dois' : 'Tout est réglé'}</span>
        </div>
      </section>

      {groups.length > 1 && (
        <div className="no-scrollbar -mx-5 flex gap-2.5 overflow-x-auto px-5 md:mx-0 md:px-0">
          {[{ id: null, name: 'Tous' }, ...groups].map((g) => (
            <Button
              key={g.id ?? 'all'}
              variant={filter === g.id ? 'default' : 'secondary'}
              className={cn('shrink-0 rounded-full px-5', filter !== g.id && 'bg-muted text-muted-foreground')}
              onClick={() => setFilter(g.id)}
            >
              {g.name}
            </Button>
          ))}
        </div>
      )}

      <div className="mt-1 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Dépenses récentes</h2>
        <Link to="/history" className="text-xs font-bold tracking-wider text-primary uppercase">
          Voir tout
        </Link>
      </div>

      {groups.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-8 text-center text-muted-foreground">
          <Users className="size-10 text-primary" />
          <p>Crée un premier groupe pour commencer à partager tes dépenses.</p>
          <Button asChild className="rounded-full">
            <Link to="/groups">Créer un groupe</Link>
          </Button>
        </div>
      ) : recent.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">Aucune dépense pour l'instant.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {recent.map(({ entry, group }) => (
            <ExpenseRow
              key={entry.id}
              entry={entry}
              groupId={group.id}
              me={user.uid}
              nameOf={nameIn(group, user.uid)}
              currency={group.currency}
              groupName={groups.length > 1 && !filter ? group.name : undefined}
            />
          ))}
        </ul>
      )}

      <Fab to={fabGroup ? `/g/${fabGroup}/new` : '/groups'} />
    </Page>
  )
}
