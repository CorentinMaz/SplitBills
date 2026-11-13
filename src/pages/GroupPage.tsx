import {
  ArrowLeftRight,
  Bell,
  ChartPie,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  CircleCheck,
  Pencil,
  Plus,
  ReceiptText,
  Scale,
  Send,
  Settings,
  Share2,
  Sparkles,
  UserPlus,
  Users,
  Wallet,
} from 'lucide-react'
import { useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { useUser } from '@/auth'
import EntryRowWide from '@/components/EntryRowWide'
import { useOpenExpense } from '@/components/ExpenseDialog'
import ExpenseRow from '@/components/ExpenseRow'
import GroupIcon from '@/components/GroupIcon'
import MonthsPicker from '@/components/MonthsPicker'
import { Loading, Money, Page } from '@/components/Page'
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
import { inMonths, monthName, monthRange, relativeDay } from '@/lib/dates'
import { shareInvite } from '@/lib/invite'
import { formatMoney, round2, today } from '@/lib/money'
import { nameIn } from '@/lib/names'
import { recordTransfers, remind } from '@/lib/settle'
import { byCategory, groupSummary, myShareOf } from '@/lib/stats'
import { cn } from '@/lib/utils'
import type { Entry, Expense, Group } from '@/types'

export default function GroupPage() {
  const { groupId = '' } = useParams()
  const group = useGroup(groupId)
  const entries = useEntries(groupId)
  // No month picked: every month. Shared by both layouts so resizing keeps the filter.
  const [months, setMonths] = useState<string[]>([])

  if (group === null) return <Navigate to="/groups" replace />
  if (!group || !entries) return <Loading />
  const period = { months, setMonths }
  return (
    <>
      <MobileGroup group={group} entries={entries} period={period} />
      <DesktopGroup group={group} entries={entries} period={period} />
    </>
  )
}

type Period = { months: string[]; setMonths: (months: string[]) => void }

/** Entries split by month, newest first, each with what was spent: refunds move money, they don't spend it. */
function byMonth(entries: Entry[]) {
  const out: { month: string; items: Entry[]; total: number }[] = []
  for (const e of entries) {
    const month = e.date.slice(0, 7)
    if (out.at(-1)?.month !== month) out.push({ month, items: [], total: 0 })
    const m = out.at(-1)!
    m.items.push(e)
    if (e.kind === 'expense') m.total = round2(m.total + e.amount)
  }
  return out
}

function useGroupData(group: Group, entries: Entry[], { months }: Period) {
  const user = useUser()
  const me = user.uid
  // Balances and debts always count everything: only what was spent follows the months.
  const summary = groupSummary(group, entries, me)
  const shown = entries.filter((e) => inMonths(e.date, months))
  const expenses = shown.filter((e): e is Expense => e.kind === 'expense')
  const spent = { total: round2(expenses.reduce((s, e) => s + e.amount, 0)), count: expenses.length }
  const current = today().slice(0, 7)
  const earliest = entries.at(-1)?.date.slice(0, 7) ?? current
  const available = monthRange(earliest < current ? earliest : current, current)
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
  return { me, summary, shown, expenses, spent, available, settleAll, invite, name: nameIn(group, me) }
}

function MonthHeader({ month, total, currency }: { month: string; total: number; currency: string }) {
  return (
    <h2 className="flex items-baseline justify-between gap-3">
      <span className="text-lg font-semibold first-letter:uppercase">{monthName(month)}</span>
      <span className="text-sm text-muted-foreground">
        Total <strong className="text-base text-foreground">{formatMoney(total, currency)}</strong>
      </span>
    </h2>
  )
}

/** What each member paid and what was theirs, over every expense: the two sides of their balance. */
function memberTotals(group: Group, entries: Entry[]) {
  const expenses = entries.filter((e): e is Expense => e.kind === 'expense')
  return Object.fromEntries(
    group.memberIds.map((id) => [
      id,
      {
        paid: round2(expenses.filter((e) => e.paidBy === id).reduce((s, e) => s + e.amount, 0)),
        part: round2(expenses.reduce((s, e) => s + myShareOf(e, id), 0)),
      },
    ]),
  )
}

function MobileGroup({ group, entries, period }: { group: Group; entries: Entry[]; period: Period }) {
  const data = useGroupData(group, entries, period)
  const { me, summary, invite } = data
  const [tab, setTab] = useState('expenses')
  const totals = memberTotals(group, entries)
  const money = (n: number) => formatMoney(n, group.currency)
  const mine = summary.balance
  const owedToMe = summary.transfers.filter((t) => t.to === me)
  const iOwe = summary.transfers.filter((t) => t.from === me)

  return (
    <Page className="md:hidden">
      <PageHeader
        back="/groups"
        actions={
          <>
            <Button size="icon" variant="secondary" className="rounded-full bg-card shadow-soft" aria-label="Inviter" onClick={invite}>
              <Share2 />
            </Button>
            <Button asChild size="icon" variant="secondary" className="rounded-full bg-card text-foreground shadow-soft">
              <Link to="settings" aria-label="Réglages">
                <Settings />
              </Link>
            </Button>
          </>
        }
      />

      <section className="flex flex-col gap-4 rounded-2xl bg-brand p-5 text-white shadow-xl shadow-teal-700/25">
        <div className="flex items-center gap-3">
          <h1 className="line-clamp-2 min-w-0 flex-1 text-2xl leading-8 font-bold tracking-tight">{group.name}</h1>
          <AvatarStack
            people={group.memberIds.map((id) => ({ id, name: group.members[id]?.name }))}
            max={4}
            ring="ring-white/90"
            className="size-8 text-[11px]"
          />
        </div>
        <div className="flex items-center justify-between gap-3 rounded-xl border border-white/20 bg-white/10 p-4">
          <span className="flex flex-col gap-1">
            <span className="flex items-center gap-2 text-[11px] font-bold tracking-wider uppercase opacity-85">
              Ton solde net
              {Math.abs(mine) > 0.005 && (
                <Badge className="rounded-full border-white/40 bg-white/15 text-[10px] tracking-normal text-white normal-case">
                  {mine > 0 ? 'Créditeur' : 'Débiteur'}
                </Badge>
              )}
            </span>
            <span className="text-[28px] leading-8 font-bold tracking-tight [&_span]:text-white">
              <Money value={mine} currency={group.currency} />
            </span>
          </span>
          {owedToMe.length > 0 && (
            <Button
              className="rounded-full bg-white text-teal-800 hover:bg-white/90"
              onClick={() => remind(owedToMe.map((t) => data.name(t.from)).join(', '), mine)}
            >
              <Send /> Relancer
            </Button>
          )}
          {iOwe.length > 0 && (
            <Button
              className="rounded-full bg-white text-teal-800 hover:bg-white/90"
              onClick={() =>
                confirm(`Enregistrer que tu as remboursé ${money(-mine)}?`) &&
                recordTransfers(iOwe.map((t) => ({ ...t, groupId: group.id })), me)
              }
            >
              <Wallet /> Régler
            </Button>
          )}
        </div>
        <div className="flex flex-wrap justify-between gap-x-3 gap-y-1 text-[13px] opacity-90">
          <span>
            Total : <strong>{money(summary.total)}</strong>
          </span>
          <span>
            Avancé : <strong>{money(totals[me]?.paid ?? 0)}</strong>
          </span>
          <span>
            Ta part : <strong>{money(totals[me]?.part ?? 0)}</strong>
          </span>
        </div>
      </section>

      <PendingTransfers group={group} data={data} />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="h-12 w-full rounded-xl">
          <TabsTrigger value="expenses" className="rounded-lg">
            <ReceiptText /> Dépenses ({summary.count})
          </TabsTrigger>
          <TabsTrigger value="members" className="rounded-lg">
            <Users /> Membres ({group.memberIds.length})
          </TabsTrigger>
          <TabsTrigger value="stats" className="rounded-lg">
            <ChartPie /> Stats
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {tab === 'expenses' && <ExpensesTab group={group} entries={entries} period={period} data={data} />}
      {tab === 'members' && <MembersTab group={group} data={data} totals={totals} />}
      {tab === 'stats' && <StatsTab group={group} period={period} data={data} totals={totals} />}
    </Page>
  )
}

type GroupData = ReturnType<typeof useGroupData>

/** Who still owes whom, folded to one line until opened. Rows that involve you come first. */
function PendingTransfers({ group, data, defaultOpen = false }: { group: Group; data: GroupData; defaultOpen?: boolean }) {
  const { me, summary, name } = data
  const [open, setOpen] = useState(defaultOpen)
  const money = (n: number) => formatMoney(n, group.currency)
  const { transfers } = summary
  if (transfers.length === 0) {
    return (
      <Card className="flex-row items-center gap-3 border-0 p-4 shadow-soft">
        <span className="grid size-10 place-items-center rounded-xl bg-secondary text-primary">
          <CircleCheck className="size-5" />
        </span>
        <span className="font-semibold">Tout le monde est quitte 🎉</span>
      </Card>
    )
  }
  const ordered = [
    ...transfers.filter((t) => t.from === me || t.to === me),
    ...transfers.filter((t) => t.from !== me && t.to !== me),
  ]
  const n = transfers.length
  const record = (t: (typeof transfers)[number], text: string) =>
    confirm(text) && recordTransfers([{ ...t, groupId: group.id }], me)
  return (
    <Card className="gap-3 border-0 p-4 shadow-soft">
      <button type="button" className="flex items-center gap-3 text-left" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
          <ArrowLeftRight className="size-5" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="font-semibold">
            {n} remboursement{n > 1 ? 's' : ''} en attente
            {Math.abs(summary.balance) > 0.005 && (
              <Money value={summary.balance} currency={group.currency} className="ml-1.5 text-sm" />
            )}
          </span>
          {!open && (
            <span className="truncate text-xs text-muted-foreground">
              {ordered.map((t) => `${name(t.from === me ? t.to : t.from)} (${money(t.amount)})`).join(' · ')}
            </span>
          )}
        </span>
        <span className="flex items-center gap-1 rounded-full bg-secondary px-3 py-1.5 text-sm font-semibold text-secondary-foreground">
          {open ? 'Masquer' : 'Voir'}
          <ChevronDown className={cn('size-4 transition', open && 'rotate-180')} />
        </span>
      </button>
      {open && (
        <>
          {ordered.map((t) => {
            const toMe = t.to === me
            const fromMe = t.from === me
            const other = fromMe ? t.to : t.from
            return (
              <div key={`${t.from}-${t.to}`} className="flex items-center gap-3 rounded-xl border bg-muted/40 p-3">
                <UserAvatar id={other} name={group.members[other]?.name} />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-semibold">
                    {toMe || fromMe ? name(other) : `${name(t.from)} → ${name(t.to)}`}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {toMe ? 'Doit te rembourser' : fromMe ? 'Tu dois rembourser' : 'Entre eux'}
                  </span>
                </span>
                <strong className={cn('whitespace-nowrap', toMe && 'text-positive', fromMe && 'text-negative')}>
                  {money(t.amount)}
                </strong>
                <span className="flex flex-col gap-1.5">
                  {toMe && (
                    <Button size="sm" variant="secondary" className="h-8 rounded-full" onClick={() => remind(name(other), t.amount)}>
                      <Bell /> Rappel
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 rounded-full"
                    onClick={() =>
                      record(
                        t,
                        toMe
                          ? `${name(other)} t'a remboursé ${money(t.amount)}?`
                          : `Enregistrer ce remboursement de ${money(t.amount)}?`,
                      )
                    }
                  >
                    <Check /> {toMe ? 'Reçu' : fromMe ? 'Payé' : 'Réglé'}
                  </Button>
                </span>
              </div>
            )
          })}
          <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <Sparkles className="size-3.5 text-primary" />
            Simplification des dettes active · {n} règlement{n > 1 ? 's' : ''} suffi{n > 1 ? 'sent' : 't'}
          </p>
        </>
      )}
    </Card>
  )
}

function ExpensesTab({ group, entries, period, data }: { group: Group; entries: Entry[]; period: Period; data: GroupData }) {
  const { me, shown, available, name } = data
  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Dépenses</h2>
        <MonthsPicker value={period.months} onChange={period.setMonths} months={available} allowAll />
      </div>
      {shown.length === 0 && (
        <p className="py-8 text-center text-muted-foreground">
          {entries.length === 0 ? "Aucune dépense pour l'instant." : 'Aucune dépense sur cette période.'}
        </p>
      )}
      {byMonth(shown).map((m) => (
        <section key={m.month} className="flex flex-col gap-3">
          <MonthHeader month={m.month} total={m.total} currency={group.currency} />
          <ul className="flex flex-col gap-3">
            {m.items.map((e) => (
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
        </section>
      ))}
    </>
  )
}

type Totals = ReturnType<typeof memberTotals>

function MembersTab({ group, data, totals, wide }: { group: Group; data: GroupData; totals: Totals; wide?: boolean }) {
  const { me, summary, name, invite } = data
  const money = (n: number) => formatMoney(n, group.currency)
  const ids = [me, ...group.memberIds.filter((id) => id !== me)].filter((id) => group.memberIds.includes(id))
  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Soldes des participants</h2>
          <p className="text-xs text-muted-foreground">Ce que chacun a payé et ce qui lui revient</p>
        </div>
        <Button variant="secondary" className="rounded-full" onClick={invite}>
          <UserPlus /> Inviter
        </Button>
      </div>
      <div className={cn('grid gap-4', wide && 'xl:grid-cols-2')}>
      {ids.map((id) => {
        const b = summary.balances[id] ?? 0
        const owesMe = summary.transfers.find((t) => t.from === id && t.to === me)
        const iOweThem = summary.transfers.find((t) => t.from === me && t.to === id)
        const t = totals[id] ?? { paid: 0, part: 0 }
        return (
          <Card key={id} className={cn('gap-4 border-0 p-4 shadow-soft', id === me && 'ring-2 ring-secondary')}>
            <div className="flex items-center gap-3">
              <UserAvatar id={id} name={group.members[id]?.name} className="size-12 rounded-xl" />
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="flex flex-wrap items-center gap-1.5 font-semibold">
                  <span className="truncate">{group.members[id]?.name}</span>
                  {id === me && <span className="text-primary">(Toi)</span>}
                  <MemberBadge balance={b} admin={id === group.createdBy} />
                </span>
                <span className="text-xs text-muted-foreground">
                  Total payé : {money(t.paid)} · Part réelle : {money(t.part)}
                </span>
              </span>
            </div>
            <Separator />
            <div className="flex items-end justify-between gap-3">
              <span className="flex flex-col">
                <span className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">Solde net</span>
                <Money value={b} currency={group.currency} className="text-xl font-bold" />
                <span className="text-xs text-muted-foreground">
                  {owesMe
                    ? `Doit ${money(owesMe.amount)} à toi`
                    : iOweThem
                      ? `Tu lui dois ${money(iOweThem.amount)}`
                      : Math.abs(b) <= 0.005
                        ? "À l'équilibre · rien à régler"
                        : b > 0
                          ? 'À recevoir'
                          : 'Doit payer'}
                </span>
              </span>
              {owesMe && (
                <Button size="sm" variant="outline" className="rounded-full text-negative" onClick={() => remind(name(id), owesMe.amount)}>
                  <Bell /> Rappel
                </Button>
              )}
              {Math.abs(b) <= 0.005 && (
                <Badge variant="secondary" className="rounded-full">
                  <CheckCheck /> À jour
                </Badge>
              )}
            </div>
          </Card>
        )
      })}
      </div>
    </>
  )
}

function MemberBadge({ balance: b, admin }: { balance: number; admin: boolean }) {
  return (
    <>
      {admin && <Badge className="rounded-full bg-secondary text-[10px] text-secondary-foreground">Organisateur</Badge>}
      {b < -0.005 && <Badge className="rounded-full bg-orange-100 text-[10px] text-orange-800">Doit rembourser</Badge>}
      {b > 0.005 && <Badge className="rounded-full bg-emerald-100 text-[10px] text-emerald-800">Créditeur</Badge>}
      {Math.abs(b) <= 0.005 && <Badge className="rounded-full bg-muted text-[10px] text-muted-foreground">Soldé</Badge>}
    </>
  )
}

function StatsTab({
  group,
  period,
  data,
  totals,
  wide,
}: {
  group: Group
  period: Period
  data: GroupData
  totals: Totals
  wide?: boolean
}) {
  const { expenses, spent, available, me } = data
  const money = (n: number) => formatMoney(n, group.currency)
  const categories = byCategory(expenses)
  const top = [...expenses].sort((a, b) => b.amount - a.amount)[0]
  const maxPaid = Math.max(...group.memberIds.map((id) => Math.max(totals[id]?.paid ?? 0, totals[id]?.part ?? 0)), 1)
  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Statistiques</h2>
        <MonthsPicker value={period.months} onChange={period.setMonths} months={available} allowAll />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Card className="gap-1 border-0 p-4 shadow-soft">
          <span className="text-xs font-semibold text-muted-foreground">Moyenne / pers.</span>
          <strong className="text-xl">{money(spent.total / Math.max(group.memberIds.length, 1))}</strong>
          <span className="text-xs text-muted-foreground">
            {spent.count} dépense{spent.count > 1 ? 's' : ''}
          </span>
        </Card>
        <Card className="gap-1 border-0 p-4 shadow-soft">
          <span className="text-xs font-semibold text-muted-foreground">Top dépense</span>
          <strong className="text-xl">{top ? money(top.amount) : '—'}</strong>
          <span className="truncate text-xs text-muted-foreground">
            {top ? `${top.title} · ${data.name(top.paidBy)}` : 'Rien sur cette période'}
          </span>
        </Card>
      </div>

      <div className={cn('grid items-start gap-4', wide && 'xl:grid-cols-2')}>
      <Card className="gap-4 border-0 p-4 shadow-soft">
        <h3 className="flex items-baseline justify-between text-sm font-bold tracking-wider uppercase">
          Dépenses par catégorie
          <span className="text-base tracking-normal normal-case">{money(spent.total)}</span>
        </h3>
        {categories.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune dépense sur cette période.</p>
        ) : (
          <>
            <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-full">
              {categories.map((c) => (
                <span key={c.id} style={{ flex: c.amount, background: categoryOf(c.id).color }} />
              ))}
            </div>
            <ul className="flex flex-col gap-2 text-sm">
              {categories.map((c) => (
                <li key={c.id} className="flex items-center gap-2.5">
                  <span className="size-2.5 rounded-full" style={{ background: categoryOf(c.id).color }} />
                  <span className="flex-1">{categoryOf(c.id).label}</span>
                  <strong>{money(c.amount)}</strong>
                  <span className="w-12 text-right text-xs text-muted-foreground">
                    {Math.round((c.amount / spent.total) * 100)} %
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>

      <Card className="gap-4 border-0 p-4 shadow-soft">
        <h3 className="text-sm font-bold tracking-wider uppercase">Contributions vs parts réelles</h3>
        <p className="-mt-2 text-xs text-muted-foreground">Depuis le début du groupe</p>
        {group.memberIds.map((id) => {
          const t = totals[id] ?? { paid: 0, part: 0 }
          const b = round2(t.paid - t.part)
          return (
            <div key={id} className="flex flex-col gap-1.5">
              <span className="flex items-baseline justify-between gap-2 text-sm">
                <span className="truncate font-semibold">
                  {group.members[id]?.name}
                  {id === me && <span className="text-primary"> (Toi)</span>}
                </span>
                <span>
                  <strong>{money(t.paid)}</strong>
                  <span className="text-xs text-muted-foreground"> / {money(t.part)}</span>
                </span>
              </span>
              <div className="relative h-2 overflow-hidden rounded-full bg-muted">
                <span className="absolute inset-y-0 left-0 rounded-full bg-primary/25" style={{ width: `${(t.part / maxPaid) * 100}%` }} />
                <span className="absolute inset-y-0 left-0 rounded-full bg-primary" style={{ width: `${(t.paid / maxPaid) * 100}%` }} />
              </div>
              <span className="flex justify-between text-[11px] text-muted-foreground">
                <span>Payé / part</span>
                <span className={cn('font-semibold', b > 0.005 && 'text-positive', b < -0.005 && 'text-negative')}>
                  {b > 0.005 ? '+ ' : b < -0.005 ? '− ' : ''}
                  {money(Math.abs(b))}
                </span>
              </span>
            </div>
          )
        })}
      </Card>
      </div>
    </>
  )
}

function DesktopGroup({ group, entries, period }: { group: Group; entries: Entry[]; period: Period }) {
  const data = useGroupData(group, entries, period)
  const { me, summary, shown: inPeriod, available, settleAll, invite } = data
  const openExpense = useOpenExpense()
  const totals = memberTotals(group, entries)
  const [view, setView] = useState('expenses')
  const [tab, setTab] = useState('all')
  const [category, setCategory] = useState('all')
  const money = (n: number) => formatMoney(n, group.currency)

  const shown = inPeriod.filter((e) => {
    if (tab === 'mine' && !(e.kind === 'expense' && e.paidBy === me)) return false
    if (tab === 'payments' && e.kind !== 'payment') return false
    if (category !== 'all' && !(e.kind === 'expense' && (e.category ?? 'other') === category)) return false
    return true
  })

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
        <div className="flex min-w-0 flex-1 basis-72 flex-col gap-1">
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
          <div className="grid grid-cols-2 rounded-xl bg-muted/80 xl:flex xl:divide-x [&_strong]:whitespace-nowrap">
            <span className="flex flex-col px-5 py-3">
              <span className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">Total engagé</span>
              <strong className="text-xl">{money(summary.total)}</strong>
            </span>
            <span className="flex flex-col px-5 py-3">
              <span className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">Tu as avancé</span>
              <strong className="text-xl">{money(totals[me]?.paid ?? 0)}</strong>
            </span>
            <span className="flex flex-col px-5 py-3">
              <span className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">Ta part</span>
              <strong className="text-xl">{money(totals[me]?.part ?? 0)}</strong>
            </span>
            <span className="flex flex-col px-5 py-3">
              <span className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">Ton solde</span>
              <Money value={summary.balance} currency={group.currency} className="text-xl font-bold whitespace-nowrap" />
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="brand" className="h-11 rounded-full px-5" onClick={() => openExpense({ groupId: group.id })}>
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

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px] 2xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="flex min-w-0 flex-col gap-4">
          <PendingTransfers group={group} data={data} defaultOpen />
          <Tabs value={view} onValueChange={setView}>
            <TabsList className="h-12 w-full max-w-md rounded-xl">
              <TabsTrigger value="expenses" className="rounded-lg">
                <ReceiptText /> Dépenses ({summary.count})
              </TabsTrigger>
              <TabsTrigger value="members" className="rounded-lg">
                <Users /> Membres ({group.memberIds.length})
              </TabsTrigger>
              <TabsTrigger value="stats" className="rounded-lg">
                <ChartPie /> Stats
              </TabsTrigger>
            </TabsList>
          </Tabs>
          {view === 'members' && <MembersTab group={group} data={data} totals={totals} wide />}
          {view === 'stats' && <StatsTab group={group} period={period} data={data} totals={totals} wide />}
          {view === 'expenses' && (
            <>
          <Card className="flex-row flex-wrap items-center justify-between gap-3 border-0 p-3 shadow-soft">
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList className="h-11 rounded-full">
                <TabsTrigger value="all" className="rounded-full px-4">
                  Toutes ({inPeriod.length})
                </TabsTrigger>
                <TabsTrigger value="mine" className="rounded-full px-4">
                  Mes dépenses
                </TabsTrigger>
                <TabsTrigger value="payments" className="rounded-full px-4">
                  Remboursements
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <MonthsPicker value={period.months} onChange={period.setMonths} months={available} allowAll />
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

          {shown.length === 0 && <p className="py-10 text-center text-muted-foreground">Aucune dépense ici pour l'instant.</p>}
          {byMonth(shown).map((m) => (
            <section key={m.month} className="flex flex-col gap-3">
              <MonthHeader month={m.month} total={m.total} currency={group.currency} />
              {byDay(m.items).map((d) => (
                <div key={d.label} className="flex flex-col gap-3">
                  <h3 className="flex items-center gap-3 text-xs font-bold tracking-wider text-muted-foreground uppercase">
                    {d.label}
                    <Separator className="flex-1" />
                  </h3>
                  <ul className="flex flex-col gap-3">
                    {d.items.map((e) => (
                      <EntryRowWide key={e.id} entry={e} group={group} me={me} />
                    ))}
                  </ul>
                </div>
              ))}
            </section>
          ))}
            </>
          )}
        </div>

        <div className="flex flex-col gap-5">
          <Card className="gap-4 border-0 p-5 shadow-soft">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Membres du groupe</h2>
              <Button variant="action" className="-mr-4" onClick={invite}>
                <UserPlus /> Inviter
              </Button>
            </div>
            {group.memberIds.map((id) => {
              const b = summary.balances[id] ?? 0
              const count = data.expenses.filter((e) => e.paidBy === id).length
              const owesMe = summary.transfers.find((t) => t.from === id && t.to === me)
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
                    {owesMe ? (
                      <button
                        type="button"
                        className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
                        onClick={() => remind(data.name(id), owesMe.amount)}
                      >
                        <Bell className="size-3" /> Rappel
                      </button>
                    ) : (
                      <span className="text-[11px] text-muted-foreground">
                        {b > 0.005 ? 'à recevoir' : b < -0.005 ? 'doit payer' : 'quitte'}
                      </span>
                    )}
                  </span>
                </div>
              )
            })}
          </Card>

        </div>
      </div>
    </Page>
  )
}

function byDay(entries: Entry[]) {
  const days: { label: string; items: Entry[] }[] = []
  for (const e of entries) {
    const label = relativeDay(e.date)
    if (days.at(-1)?.label !== label) days.push({ label, items: [] })
    days.at(-1)!.items.push(e)
  }
  return days
}
