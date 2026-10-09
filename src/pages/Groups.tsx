import { ArrowRight, CircleCheck, Clock, Plus, Receipt, Search, Users, Wallet } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useUser } from '@/auth'
import { groupColor } from '@/components/GroupIcon'
import { Eyebrow, Loading, Money, Page, StatCard } from '@/components/Page'
import { AvatarStack } from '@/components/UserAvatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAllEntries } from '@/data/entries'
import { createGroup, useGroups } from '@/data/groups'
import { TINTS } from '@/lib/categories'
import { relativeDay } from '@/lib/dates'
import { reportError } from '@/lib/errors'
import { formatMoney, round2 } from '@/lib/money'
import { groupSummary } from '@/lib/stats'
import { cn } from '@/lib/utils'
import type { Group } from '@/types'

type Summary = ReturnType<typeof groupSummary>

export default function Groups() {
  const user = useUser()
  const groups = useGroups(user.uid)
  const byGroup = useAllEntries(groups)
  const navigate = useNavigate()
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [tab, setTab] = useState('all')
  const [query, setQuery] = useState('')

  async function create() {
    if (!name.trim()) return
    try {
      const id = await createGroup(user, name.trim())
      navigate(`/g/${id}/settings`)
    } catch (e) {
      reportError(e)
    }
  }

  const summaries: Record<string, Summary> = Object.fromEntries(
    (groups ?? []).map((g) => [g.id, groupSummary(g, byGroup?.[g.id] ?? [], user.uid)]),
  )
  const settled = (g: Group) => summaries[g.id].transfers.length === 0
  const owing = (groups ?? []).filter((g) => summaries[g.id].balance < -0.005)
  const net = round2((groups ?? []).reduce((s, g) => s + summaries[g.id].balance, 0))
  const shown = (groups ?? []).filter(
    (g) =>
      (tab === 'all' || (tab === 'open' ? !settled(g) : settled(g))) &&
      g.name.toLowerCase().includes(query.trim().toLowerCase()),
  )

  const createForm = creating ? (
    <form
      className="flex gap-2 md:w-96"
      onSubmit={(e) => {
        e.preventDefault()
        create()
      }}
    >
      <Input
        autoFocus
        placeholder="Nom du groupe (ex. Appart)"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="h-11 rounded-full px-4"
      />
      <Button className="h-11 rounded-full px-5">Créer</Button>
    </form>
  ) : (
    <Button variant="brand"
      className="h-14 rounded-full text-base md:h-11 md:px-6"
      onClick={() => setCreating(true)}
    >
      <Plus /> Nouveau groupe
    </Button>
  )

  return (
    <Page>
      <div className="flex flex-col gap-4 pt-6 md:flex-row md:items-end md:justify-between md:pt-0">
        <div className="flex flex-col gap-1">
          <Eyebrow className="hidden md:flex">
            <span className="size-1.5 rounded-full bg-primary" /> Espaces partagés
          </Eyebrow>
          <h1 className="text-[32px] font-bold tracking-tight text-primary md:text-[34px] md:text-foreground">
            <span className="md:hidden">Groupes</span>
            <span className="hidden md:inline">Mes groupes</span>
          </h1>
        </div>
        {createForm}
      </div>

      {groups === null || (groups.length > 0 && !byGroup) ? (
        <Loading />
      ) : groups.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">Aucun groupe. Crée-en un, puis invite ta blonde ou tes colocs.</p>
      ) : (
        <>
          {/* Phone: compact 2-column cards. */}
          <div className="grid grid-cols-2 gap-3.5 md:hidden">
            {groups.map((g, i) => (
              <MobileCard key={g.id} group={g} index={i} balance={summaries[g.id].balance} />
            ))}
          </div>

          {/* Desktop: stats, filters and rich cards. */}
          <div className="hidden gap-5 md:grid md:grid-cols-2 lg:grid-cols-3">
            <StatCard
              label="Groupes"
              value={
                <>
                  {groups.length} <span className="text-base font-medium text-muted-foreground">au total</span>
                </>
              }
              hint={
                <span className="flex items-center gap-1 font-semibold text-positive">
                  <CircleCheck className="size-4" /> {groups.filter(settled).length} soldé{groups.filter(settled).length > 1 ? 's' : ''}
                </span>
              }
              icon={Users}
              tint={TINTS.blue}
            />
            <StatCard
              label="Solde net global"
              value={<Money value={net} />}
              hint={net > 0 ? 'On te doit globalement' : net < 0 ? 'Tu dois globalement' : 'Tout est réglé'}
              icon={Wallet}
              tint={TINTS.green}
            />
            <StatCard
              label="Règlements en attente"
              value={<span className="text-negative">{formatMoney(-owing.reduce((s, g) => s + summaries[g.id].balance, 0))}</span>}
              hint={`Sur ${owing.length} groupe${owing.length > 1 ? 's' : ''}`}
              icon={Receipt}
              tint={TINTS.orange}
            />
          </div>

          <Card className="hidden flex-row items-center justify-between gap-3 border-0 p-3 shadow-soft md:flex">
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList className="h-11 rounded-full">
                <TabsTrigger value="all" className="rounded-full px-4">
                  Tous <Badge variant="secondary" className="rounded-full">{groups.length}</Badge>
                </TabsTrigger>
                <TabsTrigger value="open" className="rounded-full px-4">
                  À régler <Badge variant="secondary" className="rounded-full">{groups.filter((g) => !settled(g)).length}</Badge>
                </TabsTrigger>
                <TabsTrigger value="settled" className="rounded-full px-4">
                  Soldés <Badge variant="secondary" className="rounded-full">{groups.filter(settled).length}</Badge>
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="relative w-72">
              <Search className="absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filtrer un groupe…"
                className="h-11 rounded-full border-0 bg-muted pl-11"
              />
            </div>
          </Card>

          <div className="hidden grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-5 md:grid">
            {shown.map((g) => (
              <DesktopCard key={g.id} group={g} index={groups.indexOf(g)} summary={summaries[g.id]} me={user.uid} />
            ))}
            {shown.length === 0 && <p className="col-span-full py-8 text-center text-muted-foreground">Aucun groupe ne correspond.</p>}
          </div>
        </>
      )}
    </Page>
  )
}

function MobileCard({ group: g, index, balance: bal }: { group: Group; index: number; balance: number }) {
  return (
    <Link to={`/g/${g.id}`} className="group">
      <Card className="h-full gap-0 overflow-hidden border-0 py-0 shadow-soft transition group-hover:-translate-y-0.5 group-hover:shadow-md">
        <div className={cn('bg-dots h-16', groupColor(index))} />
        <div className="-mt-5 px-4">
          <AvatarStack people={g.memberIds.map((id) => ({ id, name: g.members[id]?.name }))} className="size-9" />
        </div>
        <div className="flex min-w-0 flex-col gap-0.5 px-4 pt-2.5 pb-3">
          <span className="truncate text-lg font-semibold">{g.name}</span>
          <span className="text-sm text-muted-foreground">
            {g.memberIds.length} membre{g.memberIds.length > 1 ? 's' : ''}
          </span>
        </div>
        <div
          className={cn(
            'mx-4 mt-auto border-t py-3 text-[13px] font-bold text-muted-foreground',
            bal > 0.005 && 'text-positive',
            bal < -0.005 && 'text-negative',
          )}
        >
          {bal > 0.005
            ? `On te doit ${formatMoney(bal, g.currency)}`
            : bal < -0.005
              ? `Tu dois ${formatMoney(-bal, g.currency)}`
              : 'Tout est réglé'}
        </div>
      </Card>
    </Link>
  )
}

function DesktopCard({ group: g, index, summary, me }: { group: Group; index: number; summary: Summary; me: string }) {
  const bal = summary.balance
  const settled = summary.transfers.length === 0
  const myShare = g.members[me]?.share ?? 0
  return (
    <Card className="gap-0 overflow-hidden border-0 py-0 shadow-soft transition hover:-translate-y-0.5 hover:shadow-md">
      <div className={cn('bg-dots relative h-28 p-4', groupColor(index))}>
        <div className="flex gap-2">
          <Badge className="rounded-full border-0 bg-white/20 text-white">
            <Users /> {g.memberIds.length} membre{g.memberIds.length > 1 ? 's' : ''}
          </Badge>
          <Badge className={cn('rounded-full border-0', settled ? 'bg-white/85 text-slate-700' : 'bg-emerald-200 text-emerald-900')}>
            {settled ? 'Soldé' : 'Actif'}
          </Badge>
        </div>
        <span className="absolute -bottom-6 left-5 grid size-12 place-items-center rounded-xl bg-card text-primary shadow-md">
          <Users className="size-6" />
        </span>
      </div>
      <div className="flex flex-col gap-4 px-5 pt-9 pb-5">
        <div>
          <Link to={`/g/${g.id}`} className="block truncate text-xl font-semibold hover:underline">
            {g.name}
          </Link>
          <span className="flex items-center gap-1 text-xs font-semibold text-muted-foreground">
            <Clock className="size-3.5" />
            {summary.latest ? `Dernier ajout ${relativeDay(summary.latest.date).toLowerCase()}` : 'Aucune dépense'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <AvatarStack people={g.memberIds.map((id) => ({ id, name: g.members[id]?.name }))} max={4} className="size-9 text-xs" />
          <span className="text-sm text-muted-foreground">{formatMoney(summary.total, g.currency)} engagés</span>
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="flex justify-between text-xs font-bold">
            <span>Ta part par défaut</span>
            <span className="text-primary">{myShare} %</span>
          </span>
          <Progress value={myShare} className="h-2" />
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 bg-muted/70 px-5 py-4">
        <span className="flex flex-col">
          <span
            className={cn(
              'text-[11px] font-bold tracking-wider uppercase',
              bal > 0.005 ? 'text-positive' : bal < -0.005 ? 'text-negative' : 'text-muted-foreground',
            )}
          >
            {bal > 0.005 ? 'On te doit' : bal < -0.005 ? 'Tu dois' : 'Solde'}
          </span>
          <Money value={bal} currency={g.currency} className="text-2xl font-bold" />
        </span>
        <Button asChild variant="outline" className="rounded-full bg-card">
          <Link to={`/g/${g.id}`}>
            Détails <ArrowRight />
          </Link>
        </Button>
      </div>
    </Card>
  )
}
