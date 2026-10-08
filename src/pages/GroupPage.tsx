import { ChevronRight, Pencil, Plus, Scale, Settings, Sparkles, UserPlus, Users, Wallet } from 'lucide-react'
import { useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { useUser } from '@/auth'
import EntryRowWide from '@/components/EntryRowWide'
import { useOpenExpense } from '@/components/ExpenseDialog'
import ExpenseRow from '@/components/ExpenseRow'
import GroupIcon from '@/components/GroupIcon'
import { Fab, Loading, Money, Page } from '@/components/Page'
import PageHeader from '@/components/PageHeader'
import UserAvatar, { AvatarStack } from '@/components/UserAvatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { deleteEntry, useEntries } from '@/data/entries'
import { useGroup } from '@/data/groups'
import { CATEGORIES, categoryOf } from '@/lib/categories'
import { relativeDay } from '@/lib/dates'
import { shareInvite } from '@/lib/invite'
import { formatMoney } from '@/lib/money'
import { nameIn } from '@/lib/names'
import { recordTransfers } from '@/lib/settle'
import { byCategory, groupSummary } from '@/lib/stats'
import { cn } from '@/lib/utils'
import type { Entry, Expense, Group } from '@/types'

export default function GroupPage() {
  const { groupId = '' } = useParams()
  const group = useGroup(groupId)
  const entries = useEntries(groupId)

  if (group === null) return <Navigate to="/groups" replace />
  if (!group || !entries) return <Loading />
  return (
    <>
      <MobileGroup group={group} entries={entries} />
      <DesktopGroup group={group} entries={entries} />
    </>
  )
}

function useGroupData(group: Group, entries: Entry[]) {
  const user = useUser()
  const me = user.uid
  const summary = groupSummary(group, entries, me)
  async function settleAll() {
    const n = summary.transfers.length
    if (!confirm(`Enregistrer ${n} remboursement${n > 1 ? 's' : ''}?`)) return
    await recordTransfers(
      summary.transfers.map((t) => ({ ...t, groupId: group.id })),
      me,
    )
  }
  async function invite() {
    if (await shareInvite(group)) toast.success("Lien d'invitation copié")
  }
  return { me, summary, settleAll, invite, name: nameIn(group, me) }
}

function MobileGroup({ group, entries }: { group: Group; entries: Entry[] }) {
  const { me, summary, settleAll, invite, name } = useGroupData(group, entries)
  const { transfers, balance: mine } = summary
  const ordered = [
    ...transfers.filter((t) => t.from === me || t.to === me),
    ...transfers.filter((t) => t.from !== me && t.to !== me),
  ]
  return (
    <Page className="md:hidden">
      <PageHeader
        back="/groups"
        actions={
          <>
            <Button size="icon" variant="secondary" className="rounded-full" aria-label="Inviter" onClick={invite}>
              <UserPlus />
            </Button>
            <Button asChild size="icon" variant="secondary" className="rounded-full bg-muted text-foreground">
              <Link to="settings" aria-label="Réglages">
                <Settings />
              </Link>
            </Button>
          </>
        }
      />

      <section className="flex flex-col items-start gap-3 rounded-2xl bg-brand px-5 py-6 text-white shadow-xl shadow-teal-700/25">
        <Badge className="rounded-md border-0 bg-white/20 font-bold text-white">
          {group.memberIds.map((id) => `${group.members[id]?.share ?? 0} %`).join(' / ')}
        </Badge>
        <h1 className="text-[32px] leading-10 font-bold tracking-tight">{group.name}</h1>
        <AvatarStack
          people={group.memberIds.map((id) => ({ id, name: group.members[id]?.name }))}
          max={4}
          ring="ring-white/90"
          className="size-9"
        />
      </section>

      <Card className="gap-3.5 border-0 p-5 shadow-soft">
        <span className="text-muted-foreground">Ton solde total</span>
        <Money value={mine} currency={group.currency} className="text-[34px] font-bold tracking-tight" />
        {transfers.length > 0 && <Separator />}
        {ordered.map((t) => {
          const other = t.from === me ? t.to : t.from
          const text =
            t.to === me ? `${name(t.from)} te doit` : t.from === me ? `Tu dois à ${name(t.to)}` : `${name(t.from)} doit à ${name(t.to)}`
          return (
            <div key={`${t.from}-${t.to}`} className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2.5">
                <UserAvatar id={other} name={group.members[other]?.name} className="size-7 text-[10px]" />
                {text}
              </span>
              <strong className={cn(t.to === me && 'text-positive', t.from === me && 'text-negative')}>
                {formatMoney(t.amount, group.currency)}
              </strong>
            </div>
          )
        })}
        {transfers.length > 0 ? (
          <Button variant="secondary" className="h-12 rounded-full text-base" onClick={settleAll}>
            <Wallet /> Solder les dettes
          </Button>
        ) : (
          <p className="text-sm text-muted-foreground">Tout le monde est quitte 🎉</p>
        )}
      </Card>

      <h2 className="text-2xl font-semibold">Dépenses</h2>
      {entries.length === 0 && <p className="py-8 text-center text-muted-foreground">Aucune dépense pour l'instant.</p>}
      <ul className="flex flex-col gap-3">
        {entries.map((e) => (
          <ExpenseRow
            key={e.id}
            entry={e}
            groupId={group.id}
            me={me}
            nameOf={name}
            currency={group.currency}
            onDeletePayment={() => confirm('Annuler ce remboursement?') && deleteEntry(group.id, e.id)}
          />
        ))}
      </ul>
      <Fab groupId={group.id} />
    </Page>
  )
}

function DesktopGroup({ group, entries }: { group: Group; entries: Entry[] }) {
  const { me, summary, settleAll, invite, name } = useGroupData(group, entries)
  const openExpense = useOpenExpense()
  const [tab, setTab] = useState('all')
  const [category, setCategory] = useState('all')
  const money = (n: number) => formatMoney(n, group.currency)

  const expenses = entries.filter((e): e is Expense => e.kind === 'expense')
  const shown = entries.filter((e) => {
    if (tab === 'mine' && !(e.kind === 'expense' && e.paidBy === me)) return false
    if (tab === 'payments' && e.kind !== 'payment') return false
    if (category !== 'all' && !(e.kind === 'expense' && (e.category ?? 'other') === category)) return false
    return true
  })
  const days: { label: string; items: Entry[] }[] = []
  for (const e of shown) {
    const label = relativeDay(e.date)
    if (days.at(-1)?.label !== label) days.push({ label, items: [] })
    days.at(-1)!.items.push(e)
  }
  const categories = byCategory(expenses)

  return (
    <Page className="hidden md:flex">
      <div className="flex items-center justify-between">
        <nav className="flex items-center gap-2 text-sm">
          <Link to="/groups" className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-muted-foreground uppercase hover:text-foreground">
            <Users className="size-4" /> Groupes
          </Link>
          <ChevronRight className="size-4 text-muted-foreground" />
          <span className="font-semibold">{group.name}</span>
        </nav>
        <Badge className="rounded-full bg-secondary text-secondary-foreground">
          Répartition {group.memberIds.map((id) => `${group.members[id]?.share ?? 0} %`).join(' / ')}
        </Badge>
      </div>

      <Card className="flex-row flex-wrap items-center gap-6 border-0 bg-gradient-to-r from-card to-secondary/60 p-6 shadow-soft">
        <GroupIcon className="size-16 [&_svg]:size-8" />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="flex items-center gap-2">
            <h1 className="truncate text-[32px] font-bold tracking-tight">{group.name}</h1>
            <Button asChild variant="ghost" size="icon" className="rounded-full">
              <Link to="settings" aria-label="Modifier le groupe">
                <Pencil />
              </Link>
            </Button>
          </span>
          <span className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="size-2 rounded-full bg-positive" />
            {group.memberIds.length} membre{group.memberIds.length > 1 ? 's' : ''} actif{group.memberIds.length > 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex divide-x rounded-xl bg-muted/80">
            <span className="flex flex-col px-5 py-3">
              <span className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">Total engagé</span>
              <strong className="text-xl">{money(summary.total)}</strong>
            </span>
            <span className="flex flex-col px-5 py-3">
              <span className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">Ton solde</span>
              <Money value={summary.balance} currency={group.currency} className="text-xl font-bold" />
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button className="h-11 rounded-full bg-brand px-5" onClick={() => openExpense({ groupId: group.id })}>
              <Plus /> Ajouter
            </Button>
            <Button
              variant="secondary"
              className="h-11 rounded-full px-5"
              disabled={summary.transfers.length === 0}
              onClick={settleAll}
            >
              <Scale /> Équilibrer
            </Button>
            <Button asChild variant="secondary" size="icon" className="size-11 rounded-full bg-muted text-foreground">
              <Link to="settings" aria-label="Paramètres">
                <Settings />
              </Link>
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-4">
          <Card className="flex-row flex-wrap items-center justify-between gap-3 border-0 p-3 shadow-soft">
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList className="h-11 rounded-full">
                <TabsTrigger value="all" className="rounded-full px-4">
                  Toutes ({entries.length})
                </TabsTrigger>
                <TabsTrigger value="mine" className="rounded-full px-4">
                  Mes dépenses
                </TabsTrigger>
                <TabsTrigger value="payments" className="rounded-full px-4">
                  Remboursements
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="!h-11 w-48 rounded-full border-0 bg-muted">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les catégories</SelectItem>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    <c.icon /> {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Card>

          {days.length === 0 && <p className="py-10 text-center text-muted-foreground">Aucune dépense ici pour l'instant.</p>}
          {days.map((d) => (
            <section key={d.label} className="flex flex-col gap-3">
              <h3 className="flex items-center gap-3 text-xs font-bold tracking-wider text-muted-foreground uppercase">
                {d.label}
                <Separator className="flex-1" />
              </h3>
              <ul className="flex flex-col gap-3">
                {d.items.map((e) => (
                  <EntryRowWide key={e.id} entry={e} group={group} me={me} />
                ))}
              </ul>
            </section>
          ))}
        </div>

        <div className="flex flex-col gap-5">
          <Card className="gap-4 border-0 p-5 shadow-soft">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Membres du groupe</h2>
              <Button variant="link" className="h-auto gap-1 p-0 text-sm font-semibold" onClick={invite}>
                <UserPlus className="size-4" /> Inviter
              </Button>
            </div>
            {group.memberIds.map((id) => {
              const b = summary.balances[id] ?? 0
              const count = expenses.filter((e) => e.paidBy === id).length
              return (
                <div key={id} className={cn('flex items-center gap-3 rounded-xl p-2.5', id === me && 'bg-muted/70')}>
                  <UserAvatar id={id} name={group.members[id]?.name} />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate font-semibold">
                      {group.members[id]?.name}
                      {id === me && ' (toi)'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {id === group.createdBy ? 'Admin · ' : ''}
                      {count} dépense{count > 1 ? 's' : ''} · {group.members[id]?.share ?? 0} %
                    </span>
                  </span>
                  <span className="flex flex-col items-end">
                    <Money value={b} currency={group.currency} className="font-bold" />
                    <span className="text-[11px] text-muted-foreground">
                      {b > 0.005 ? 'à recevoir' : b < -0.005 ? 'doit payer' : 'quitte'}
                    </span>
                  </span>
                </div>
              )
            })}
          </Card>

          <Card className="gap-4 border-0 p-5 shadow-soft">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <Sparkles className="size-5 text-primary" /> Règlements optimisés
              </h2>
              <Badge variant="secondary" className="rounded-full">
                {summary.transfers.length} étape{summary.transfers.length > 1 ? 's' : ''}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">Le minimum de virements pour que tout le monde soit quitte.</p>
            {summary.transfers.length === 0 && <p className="text-sm font-semibold text-positive">Tout est réglé 🎉</p>}
            {summary.transfers.map((t) => (
              <div key={`${t.from}-${t.to}`} className="flex items-center gap-3 rounded-xl bg-muted/70 p-3">
                <span className="flex min-w-0 flex-1 items-center gap-1.5 text-sm">
                  <span className="truncate font-semibold">{name(t.from)}</span>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                  <span className="truncate font-semibold text-primary">{name(t.to)}</span>
                </span>
                <strong>{money(t.amount)}</strong>
                <Button
                  size="sm"
                  className="rounded-full"
                  onClick={() =>
                    confirm(`Enregistrer ce remboursement de ${money(t.amount)}?`) &&
                    recordTransfers([{ ...t, groupId: group.id }], me)
                  }
                >
                  Régler
                </Button>
              </div>
            ))}
          </Card>

          <Card className="gap-4 border-0 p-5 shadow-soft">
            <h2 className="text-lg font-semibold">Synthèse</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1 rounded-xl bg-muted/70 p-3.5">
                <span className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">Moyenne / pers.</span>
                <strong className="text-xl">{money(summary.total / Math.max(group.memberIds.length, 1))}</strong>
              </div>
              <div className="flex flex-col gap-1 rounded-xl bg-muted/70 p-3.5">
                <span className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">Dépenses</span>
                <strong className="text-xl">{money(summary.total)}</strong>
                <span className="text-xs text-muted-foreground">{summary.count} transaction{summary.count > 1 ? 's' : ''}</span>
              </div>
            </div>
            {categories.length > 0 && (
              <>
                <span className="text-sm text-muted-foreground">Répartition par catégorie</span>
                <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-full">
                  {categories.map((c) => (
                    <span key={c.id} style={{ flex: c.amount, background: categoryOf(c.id).color }} />
                  ))}
                </div>
                <ul className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                  {categories.map((c) => (
                    <li key={c.id} className="flex items-center gap-1.5">
                      <span className="size-2 rounded-full" style={{ background: categoryOf(c.id).color }} />
                      {categoryOf(c.id).label} ({Math.round((c.amount / summary.total) * 100)} %)
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Card>
        </div>
      </div>
    </Page>
  )
}
