import { CalendarDays, Camera, ChevronRight, Plus, TrendingDown, TrendingUp, Users, Wallet } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { displayName, useUser } from '@/auth'
import Donut from '@/components/Donut'
import { useOpenExpense } from '@/components/ExpenseDialog'
import ExpenseRow from '@/components/ExpenseRow'
import GroupIcon from '@/components/GroupIcon'
import { Eyebrow, Fab, Loading, Money, Page } from '@/components/Page'
import UserAvatar, { AvatarStack } from '@/components/UserAvatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { useAllEntries } from '@/data/entries'
import { useGroups } from '@/data/groups'
import { categoryOf } from '@/lib/categories'
import { currentMonthName, relativeDay } from '@/lib/dates'
import { formatMoney, round2, today } from '@/lib/money'
import { nameIn } from '@/lib/names'
import { recordTransfers, remind } from '@/lib/settle'
import { byCategory, groupSummary, personBalances } from '@/lib/stats'
import { cn } from '@/lib/utils'
import type { Entry, Expense, Group } from '@/types'

export default function Home() {
  const user = useUser()
  const groups = useGroups(user.uid)
  const byGroup = useAllEntries(groups)
  const [filter, setFilter] = useState<string | null>(null)

  if (!groups || (groups.length > 0 && !byGroup)) return <Loading />
  const data = byGroup ?? {}

  const month = today().slice(0, 7)
  const shown = groups.filter((g) => !filter || g.id === filter)
  const summaries = Object.fromEntries(groups.map((g) => [g.id, groupSummary(g, data[g.id] ?? [], user.uid)]))
  const monthExpenses = (gs: Group[]) =>
    gs.flatMap((g) => (data[g.id] ?? []).filter((e): e is Expense => e.kind === 'expense' && e.date.startsWith(month)))
  const spent = monthExpenses(shown).reduce((s, e) => s + e.amount, 0)
  const balance = round2(shown.reduce((s, g) => s + summaries[g.id].balance, 0))

  const recent = (gs: Group[], n: number) =>
    gs
      .flatMap((g) => (data[g.id] ?? []).map((entry) => ({ entry, group: g })))
      .sort((a, b) => b.entry.date.localeCompare(a.entry.date) || b.entry.createdAt - a.entry.createdAt)
      .slice(0, n)

  return (
    <>
      <MobileHome
        groups={groups}
        filter={filter}
        setFilter={setFilter}
        spent={spent}
        balance={balance}
        recent={recent(shown, 6)}
      />
      <DesktopHome
        groups={groups}
        data={data}
        summaries={summaries}
        balance={round2(groups.reduce((s, g) => s + summaries[g.id].balance, 0))}
        monthExpenses={monthExpenses(groups)}
        recent={recent(groups, 5)}
      />
    </>
  )
}

type Recent = { entry: Entry; group: Group }[]

function MobileHome({
  groups,
  filter,
  setFilter,
  spent,
  balance,
  recent,
}: {
  groups: Group[]
  filter: string | null
  setFilter: (id: string | null) => void
  spent: number
  balance: number
  recent: Recent
}) {
  const user = useUser()
  const fabGroup = filter ?? (groups.length === 1 ? groups[0].id : undefined)
  return (
    <Page className="md:hidden">
      <div className="flex items-center gap-3 pt-2">
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
        <div className="no-scrollbar -mx-5 flex gap-2.5 overflow-x-auto px-5">
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

      <RecentList groups={groups} recent={recent} showGroup={groups.length > 1 && !filter} />
      <Fab groupId={fabGroup} />
    </Page>
  )
}

function RecentList({ groups, recent, showGroup }: { groups: Group[]; recent: Recent; showGroup: boolean }) {
  const user = useUser()
  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center text-muted-foreground">
        <Users className="size-10 text-primary" />
        <p>Crée un premier groupe pour commencer à partager tes dépenses.</p>
        <Button asChild className="rounded-full">
          <Link to="/groups">Créer un groupe</Link>
        </Button>
      </div>
    )
  }
  if (recent.length === 0) return <p className="py-8 text-center text-muted-foreground">Aucune dépense pour l'instant.</p>
  return (
    <ul className="flex flex-col gap-3">
      {recent.map(({ entry, group }) => (
        <ExpenseRow
          key={entry.id}
          entry={entry}
          groupId={group.id}
          me={user.uid}
          nameOf={nameIn(group, user.uid)}
          currency={group.currency}
          groupName={showGroup ? group.name : undefined}
        />
      ))}
    </ul>
  )
}

function DesktopHome({
  groups,
  data,
  summaries,
  balance,
  monthExpenses,
  recent,
}: {
  groups: Group[]
  data: Record<string, Entry[]>
  summaries: Record<string, ReturnType<typeof groupSummary>>
  balance: number
  monthExpenses: Expense[]
  recent: Recent
}) {
  const user = useUser()
  const openExpense = useOpenExpense()
  const people = personBalances(groups, data, user.uid)
  const owedBy = people.filter((p) => p.amount > 0)
  const owedTo = people.filter((p) => p.amount < 0)
  const owed = round2(owedBy.reduce((s, p) => s + p.amount, 0))
  const owe = round2(-owedTo.reduce((s, p) => s + p.amount, 0))
  const categories = byCategory(monthExpenses)
  const monthTotal = categories.reduce((s, c) => s + c.amount, 0)
  const firstName = displayName(user).split(' ')[0]

  return (
    <Page className="hidden md:flex">
      <div className="flex items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <Eyebrow>
            Espace partagé <span className="size-1.5 rounded-full bg-primary" />
            <span className="font-semibold tracking-normal text-foreground normal-case">Synchronisé en temps réel</span>
          </Eyebrow>
          <h1 className="text-[34px] font-bold tracking-tight">Bonjour, {firstName} 👋</h1>
        </div>
        <Badge variant="outline" className="h-10 gap-2 rounded-full bg-card px-4 text-sm font-semibold capitalize">
          <CalendarDays className="size-4 text-primary" />
          {currentMonthName()} {today().slice(0, 4)}
        </Badge>
      </div>

      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        <div className="relative flex flex-col justify-between gap-3 overflow-hidden rounded-xl bg-brand p-5 md:col-span-2 lg:col-span-1 text-white shadow-xl shadow-teal-700/25">
          <span className="absolute -top-16 -right-12 size-44 rounded-full bg-white/10" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold tracking-wider uppercase opacity-85">Solde net global</span>
            <span className="grid size-10 place-items-center rounded-full bg-white/20">
              <Wallet className="size-5" />
            </span>
          </div>
          <span className="text-[34px] font-bold tracking-tight [&_span]:text-white">
            <Money value={balance} />
          </span>
          <span className="text-sm opacity-85">
            {balance > 0
              ? 'Tu es créditeur sur l’ensemble de tes groupes.'
              : balance < 0
                ? 'Tu as un peu de retard à rembourser.'
                : 'Tout le monde est quitte.'}
          </span>
        </div>

        <Card className="justify-between gap-3 border-0 p-5 shadow-soft">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2.5 font-semibold">
              <span className="grid size-8 place-items-center rounded-full bg-emerald-100 text-emerald-700">
                <TrendingUp className="size-4" />
              </span>
              On te doit
            </span>
            <Badge className="rounded-full bg-emerald-100 text-emerald-800">
              {owedBy.length} personne{owedBy.length > 1 ? 's' : ''}
            </Badge>
          </div>
          <span className="text-[34px] font-bold tracking-tight text-positive">{formatMoney(owed)}</span>
          <span className="text-sm text-muted-foreground">À récupérer sur {groups.length} groupe{groups.length > 1 ? 's' : ''}</span>
        </Card>

        <Card className="justify-between gap-3 border-0 p-5 shadow-soft">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2.5 font-semibold">
              <span className="grid size-8 place-items-center rounded-full bg-orange-100 text-orange-700">
                <TrendingDown className="size-4" />
              </span>
              Tu dois
            </span>
            <Badge className="rounded-full bg-orange-100 text-orange-800">
              {owedTo.length} personne{owedTo.length > 1 ? 's' : ''}
            </Badge>
          </div>
          <span className="text-[34px] font-bold tracking-tight text-negative">{formatMoney(owe)}</span>
          {owe > 0 ? (
            <Button
              variant="link"
              className="h-auto justify-start p-0 text-xs font-bold tracking-wider uppercase"
              onClick={() =>
                confirm(`Enregistrer le remboursement de ${formatMoney(owe)}?`) &&
                recordTransfers(
                  owedTo.flatMap((p) => p.transfers.filter((t) => t.from === user.uid)),
                  user.uid,
                )
              }
            >
              Tout régler
            </Button>
          ) : (
            <span className="text-sm text-muted-foreground">Aucune dette en cours 🎉</span>
          )}
        </Card>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-5">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-semibold">Groupes actifs</h2>
              <p className="text-sm text-muted-foreground">Partages en cours avec répartition automatique</p>
            </div>
            <Button asChild variant="secondary" className="rounded-full">
              <Link to="/groups">
                <Plus /> Créer un groupe
              </Link>
            </Button>
          </div>
          {groups.length === 0 ? (
            <RecentList groups={groups} recent={[]} showGroup={false} />
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {groups.slice(0, 4).map((g) => (
                <GroupMiniCard key={g.id} group={g} summary={summaries[g.id]} />
              ))}
            </div>
          )}

          <div className="mt-2 flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-semibold">Dernières dépenses</h2>
              <p className="text-sm text-muted-foreground">Activité synchronisée récente</p>
            </div>
            <Link to="/history" className="flex items-center gap-1 text-xs font-bold tracking-wider text-primary uppercase">
              Voir tout l'historique <ChevronRight className="size-4" />
            </Link>
          </div>
          {groups.length > 0 && <RecentList groups={groups} recent={recent} showGroup={groups.length > 1} />}
        </div>

        <div className="flex flex-col gap-5">
          <Card className="gap-4 border-0 p-5 shadow-soft">
            <div>
              <h2 className="text-xl font-semibold">Équilibres directs</h2>
              <p className="text-sm text-muted-foreground">Règlements avec tes proches</p>
            </div>
            {people.length === 0 && <p className="text-sm text-muted-foreground">Personne ne doit rien à personne 🎉</p>}
            {people.map((p) => (
              <div key={p.uid} className="flex items-center gap-3 rounded-xl bg-muted/70 p-3">
                <UserAvatar id={p.uid} name={p.name} />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-semibold">{p.name}</span>
                  <span className={cn('text-xs font-semibold', p.amount > 0 ? 'text-positive' : 'text-negative')}>
                    {p.amount > 0 ? 'Te doit' : 'Tu lui dois'} {formatMoney(Math.abs(p.amount))}
                  </span>
                </span>
                {p.amount > 0 ? (
                  <Button size="sm" variant="secondary" className="rounded-full" onClick={() => remind(p.name, p.amount)}>
                    Relancer
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    className="rounded-full"
                    onClick={() =>
                      confirm(`Enregistrer que tu as remboursé ${formatMoney(-p.amount)} à ${p.name}?`) &&
                      recordTransfers(
                        p.transfers.filter((t) => t.from === user.uid),
                        user.uid,
                      )
                    }
                  >
                    Régler
                  </Button>
                )}
              </div>
            ))}
          </Card>

          <Card className="gap-4 border-0 p-5 shadow-soft">
            <div>
              <h2 className="text-xl font-semibold">Répartition du mois</h2>
              <p className="text-sm text-muted-foreground">Dépenses totales : {formatMoney(monthTotal)}</p>
            </div>
            <div className="flex justify-center py-2">
              <Donut slices={categories.map((c) => ({ value: c.amount, color: categoryOf(c.id).color }))}>
                <span className="flex flex-col">
                  <span className="text-xs font-bold tracking-wider text-muted-foreground uppercase">{currentMonthName()}</span>
                  <span className="text-xl font-bold">{formatMoney(monthTotal)}</span>
                </span>
              </Donut>
            </div>
            <ul className="flex flex-col gap-2">
              {categories.length === 0 && <li className="text-sm text-muted-foreground">Aucune dépense ce mois-ci.</li>}
              {categories.map((c) => {
                const cat = categoryOf(c.id)
                return (
                  <li key={c.id} className="flex items-center gap-2.5 text-sm">
                    <span className="size-2.5 rounded-full" style={{ background: cat.color }} />
                    <span className="flex-1">{cat.label}</span>
                    <strong>{Math.round((c.amount / monthTotal) * 100)} %</strong>
                    <span className="w-20 text-right text-muted-foreground">{formatMoney(c.amount)}</span>
                  </li>
                )
              })}
            </ul>
          </Card>

          <Card className="gap-3 border-0 bg-secondary p-5 shadow-none">
            <span className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-full bg-brand text-white">
                <Camera className="size-5" />
              </span>
              <h2 className="text-lg font-semibold text-secondary-foreground">Scan de tickets</h2>
            </span>
            <p className="text-sm text-secondary-foreground/80">
              Prends ton ticket de caisse en photo. SplitBills lit le total, le magasin et la date pour toi.
            </p>
            <Button
              variant="link"
              className="h-auto justify-start p-0 text-xs font-bold tracking-wider uppercase"
              onClick={() => openExpense()}
            >
              Essayer avec un ticket <Camera />
            </Button>
          </Card>
        </div>
      </div>
    </Page>
  )
}

function GroupMiniCard({ group, summary }: { group: Group; summary: ReturnType<typeof groupSummary> }) {
  const bal = summary.balance
  return (
    <Link to={`/g/${group.id}`} className="group">
      <Card className="h-full gap-4 border-0 border-t-4 border-t-primary p-5 shadow-soft transition group-hover:-translate-y-0.5 group-hover:shadow-md">
        <div className="flex items-start gap-3">
          <GroupIcon className="size-10 rounded-xl [&_svg]:size-5" />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-lg font-semibold">{group.name}</span>
            <span className="text-xs text-muted-foreground">
              {group.memberIds.length} membre{group.memberIds.length > 1 ? 's' : ''}
            </span>
          </span>
          <Badge
            className={cn(
              'rounded-full',
              bal > 0.005 && 'bg-emerald-100 text-emerald-800',
              bal < -0.005 && 'bg-orange-100 text-orange-800',
              Math.abs(bal) <= 0.005 && 'bg-muted text-muted-foreground',
            )}
          >
            <Money value={bal} currency={group.currency} />
          </Badge>
        </div>
        <div className="flex items-center justify-between gap-2 rounded-lg bg-muted px-3 py-2 text-xs font-semibold">
          <span className="truncate">Dernier ajout : {summary.latest?.title ?? '—'}</span>
          <span className="shrink-0 text-muted-foreground">{summary.latest ? relativeDay(summary.latest.date) : ''}</span>
        </div>
        <div className="flex items-center justify-between">
          <AvatarStack people={group.memberIds.map((id) => ({ id, name: group.members[id]?.name }))} className="size-8 text-xs" />
          <span
            className={cn(
              'flex items-center gap-1 text-xs font-bold',
              bal > 0.005 ? 'text-positive' : bal < -0.005 ? 'text-negative' : 'text-muted-foreground',
            )}
          >
            {bal > 0.005
              ? `On te doit ${formatMoney(bal, group.currency)}`
              : bal < -0.005
                ? `Tu dois ${formatMoney(-bal, group.currency)}`
                : 'Équilibré'}
            <ChevronRight className="size-4" />
          </span>
        </div>
      </Card>
    </Link>
  )
}
