import { ArrowDownRight, ArrowUpRight, ChevronRight, Hash, HandCoins, Wallet, X } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useUser } from '@/auth'
import MonthPicker from '@/components/MonthPicker'
import MonthlyColumns from '@/components/MonthlyColumns'
import { Eyebrow, Loading, Page } from '@/components/Page'
import { useOpenExpense } from '@/components/ExpenseDialog'
import UserAvatar from '@/components/UserAvatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAllEntries } from '@/data/entries'
import { useGroups } from '@/data/groups'
import { categoryOf, TINTS } from '@/lib/categories'
import { monthName, monthRange, relativeDay, shiftMonth } from '@/lib/dates'
import { formatMoney, today } from '@/lib/money'
import { myShareOf } from '@/lib/stats'
import { cn } from '@/lib/utils'
import type { Expense } from '@/types'

type Metric = 'share' | 'paid'

const METRIC_LABEL: Record<Metric, string> = { share: 'Ma part', paid: "Ce que j'ai payé" }

export default function Stats() {
  const user = useUser()
  const groups = useGroups(user.uid)
  const byGroup = useAllEntries(groups)
  const current = today().slice(0, 7)
  const [month, setMonth] = useState(current)
  const [metric, setMetric] = useState<Metric>('share')
  // Clicking a group or category bar narrows the detail list to it.
  const [focus, setFocus] = useState<{ kind: 'group' | 'category'; id: string } | null>(null)
  const [sort, setSort] = useState<'date' | 'amount'>('date')
  const openExpense = useOpenExpense()

  if (!groups || (groups.length > 0 && !byGroup)) return <Loading />

  const me = user.uid
  const expenses = groups.flatMap((g) =>
    (byGroup?.[g.id] ?? []).filter((e): e is Expense => e.kind === 'expense').map((e) => ({ e, g })),
  )
  const valueOf = (e: Expense) => (metric === 'share' ? myShareOf(e, me) : e.paidBy === me ? e.amount : 0)
  const inMonth = (m: string) => expenses.filter(({ e }) => e.date.startsWith(m))
  const sum = (list: { e: Expense }[]) => list.reduce((s, { e }) => s + valueOf(e), 0)

  const earliest = expenses.reduce((min, { e }) => (e.date.slice(0, 7) < min ? e.date.slice(0, 7) : min), current)
  const series = monthRange(shiftMonth(current, -11), current)
    .reverse()
    .map((m) => ({ month: m, value: sum(inMonth(m)) }))

  const thisMonth = inMonth(month)
  const total = sum(thisMonth)
  const lastMonth = inMonth(shiftMonth(month, -1))
  const shareOf = (list: { e: Expense }[]) => list.reduce((s, { e }) => s + myShareOf(e, me), 0)
  const paidOf = (list: { e: Expense }[]) => list.reduce((s, { e }) => s + (e.paidBy === me ? e.amount : 0), 0)
  const share = shareOf(thisMonth)
  const paid = paidOf(thisMonth)
  const prevShare = shareOf(lastMonth)
  const prevPaid = paidOf(lastMonth)
  const count = thisMonth.filter(({ e }) => myShareOf(e, me) > 0 || e.paidBy === me).length

  const perGroup = groups
    .map((g) => {
      const list = thisMonth.filter((x) => x.g.id === g.id)
      return { group: g, value: sum(list), groupTotal: list.reduce((s, { e }) => s + e.amount, 0) }
    })
    .filter((x) => x.value > 0.005)
    .sort((a, b) => b.value - a.value)

  const perCategory = [...thisMonth.reduce((map, { e }) => {
    const id = e.category ?? 'other'
    map.set(id, (map.get(id) ?? 0) + valueOf(e))
    return map
  }, new Map<string, number>())]
    .map(([id, value]) => ({ id, value }))
    .filter((x) => x.value > 0.005)
    .sort((a, b) => b.value - a.value)

  const toggleFocus = (kind: 'group' | 'category', id: string) =>
    setFocus((f) => (f?.kind === kind && f.id === id ? null : { kind, id }))
  const detail = thisMonth
    .filter(({ e }) => myShareOf(e, me) > 0.005 || e.paidBy === me)
    .filter(({ e, g }) => !focus || (focus.kind === 'group' ? g.id === focus.id : (e.category ?? 'other') === focus.id))
    .sort((a, b) =>
      sort === 'amount'
        ? valueOf(b.e) - valueOf(a.e)
        : b.e.date.localeCompare(a.e.date) || b.e.createdAt - a.e.createdAt,
    )
  const detailShare = detail.reduce((s, { e }) => s + myShareOf(e, me), 0)
  const detailPaid = detail.reduce((s, { e }) => s + (e.paidBy === me ? e.amount : 0), 0)
  const focusLabel =
    focus && (focus.kind === 'group' ? groups.find((g) => g.id === focus.id)?.name : categoryOf(focus.id).label)

  const label = month === current ? 'ce mois-ci' : `en ${monthName(month, false)}`

  return (
    <Page>
      <div className="flex flex-col gap-4 pt-2 md:flex-row md:items-end md:justify-between md:pt-0">
        <div className="flex flex-col gap-1">
          <Eyebrow>Suivi personnel</Eyebrow>
          <h1 className="text-[32px] font-bold tracking-tight md:text-[34px]">Mes dépenses</h1>
          <p className="text-muted-foreground">Combien tu dépenses chaque mois, et où.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Tabs value={metric} onValueChange={(v) => setMetric(v as Metric)}>
            <TabsList className="h-10 rounded-full">
              {(['share', 'paid'] as Metric[]).map((m) => (
                <TabsTrigger key={m} value={m} className="rounded-full px-4">
                  {METRIC_LABEL[m]}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <MonthPicker value={month} onChange={setMonth} earliest={earliest} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:gap-5 lg:grid-cols-4">
        <Tile label={`Ma part ${label}`} value={formatMoney(share)} icon={Wallet} tint={TINTS.teal}>
          <Delta now={share} before={prevShare} month={month} />
        </Tile>
        <Tile label="J'ai payé" value={formatMoney(paid)} icon={HandCoins} tint={TINTS.blue}>
          <Delta now={paid} before={prevPaid} month={month} />
        </Tile>
        <Tile
          label={paid >= share ? 'Avancé pour les autres' : 'Avancé par les autres'}
          value={formatMoney(Math.abs(paid - share))}
          icon={paid >= share ? ArrowUpRight : ArrowDownRight}
          tint={TINTS.orange}
        >
          <span className="text-muted-foreground">J'ai payé moins ma part</span>
        </Tile>
        <Tile label="Dépenses" value={String(count)} icon={Hash} tint={TINTS.violet}>
          <span className="text-muted-foreground">Où j'ai une part</span>
        </Tile>
      </div>

      <Card className="gap-4 border-0 p-5 shadow-soft md:p-6">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">{METRIC_LABEL[metric]} sur 12 mois</h2>
            <p className="text-sm text-muted-foreground">Clique sur un mois pour le détailler.</p>
          </div>
          <span className="text-right text-sm text-muted-foreground">
            Moyenne
            <strong className="block text-base text-foreground">
              {formatMoney(series.reduce((s, d) => s + d.value, 0) / series.length)} / mois
            </strong>
          </span>
        </div>
        <MonthlyColumns data={series} selected={month} onSelect={setMonth} />
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="gap-4 border-0 p-5 shadow-soft md:p-6">
          <div>
            <h2 className="text-xl font-semibold">Par groupe</h2>
            <p className="text-sm text-muted-foreground first-letter:uppercase">{label} · clique pour filtrer le détail</p>
          </div>
          {perGroup.length === 0 && <Empty />}
          {perGroup.map(({ group, value, groupTotal }) => (
            <BarRow
              key={group.id}
              label={group.name}
              value={value}
              active={focus?.kind === 'group' ? focus.id === group.id : undefined}
              onClick={() => toggleFocus('group', group.id)}
              max={perGroup[0].value}
              share={total ? value / total : 0}
              color="var(--primary)"
              hint={`Total du groupe : ${formatMoney(groupTotal, group.currency)}`}
            />
          ))}
        </Card>

        <Card className="gap-4 border-0 p-5 shadow-soft md:p-6">
          <div>
            <h2 className="text-xl font-semibold">Par catégorie</h2>
            <p className="text-sm text-muted-foreground first-letter:uppercase">{label} · clique pour filtrer le détail</p>
          </div>
          {perCategory.length === 0 && <Empty />}
          {perCategory.map(({ id, value }) => {
            const cat = categoryOf(id)
            return (
              <BarRow
                key={id}
                label={
                  <span className="flex items-center gap-2.5">
                    <span className={cn('grid size-8 place-items-center rounded-full', cat.tint)}>
                      <cat.icon className="size-4" />
                    </span>
                    {cat.label}
                  </span>
                }
                value={value}
                active={focus?.kind === 'category' ? focus.id === id : undefined}
                onClick={() => toggleFocus('category', id)}
                max={perCategory[0].value}
                share={total ? value / total : 0}
                color={cat.color}
              />
            )
          })}
        </Card>
      </div>

      <Card className="gap-4 border-0 p-5 shadow-soft md:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Détail des dépenses</h2>
            <p className="text-sm text-muted-foreground first-letter:uppercase">
              {label} · {detail.length} dépense{detail.length > 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {focus && (
              <Badge variant="secondary" className="h-8 gap-1.5 rounded-full px-3 text-sm">
                {focusLabel}
                <button aria-label="Retirer le filtre" className="rounded-full hover:text-destructive" onClick={() => setFocus(null)}>
                  <X className="size-3.5" />
                </button>
              </Badge>
            )}
            <Tabs value={sort} onValueChange={(v) => setSort(v as 'date' | 'amount')}>
              <TabsList className="h-9 rounded-full">
                <TabsTrigger value="date" className="rounded-full px-3 text-xs">
                  Par date
                </TabsTrigger>
                <TabsTrigger value="amount" className="rounded-full px-3 text-xs">
                  Par montant
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {detail.length === 0 ? (
          <Empty />
        ) : (
          <>
            {/* Phone: compact rows. */}
            <ul className="flex flex-col md:hidden">
              {detail.map(({ e, g }) => {
                const cat = categoryOf(e.category)
                return (
                  <li key={e.id}>
                    <button
                      type="button"
                      onClick={() => openExpense({ groupId: g.id, expense: e })}
                      className="flex w-full items-center gap-3 border-b py-3 text-left"
                    >
                      <span className={cn('grid size-10 shrink-0 place-items-center rounded-full', cat.tint)}>
                        <cat.icon className="size-4.5" />
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate font-semibold">{e.title}</span>
                        <span className="truncate text-xs text-muted-foreground">
                          {g.name} · {relativeDay(e.date)} · {e.paidBy === me ? 'payé par toi' : `payé par ${g.members[e.paidBy]?.name ?? '?'}`}
                        </span>
                      </span>
                      <span className="flex flex-col items-end">
                        <strong>{formatMoney(myShareOf(e, me), g.currency)}</strong>
                        <span className="text-[11px] whitespace-nowrap text-muted-foreground">sur {formatMoney(e.amount, g.currency)}</span>
                      </span>
                    </button>
                  </li>
                )
              })}
              <li className="flex justify-between pt-3 text-sm font-semibold">
                <span>Total</span>
                <span>
                  Ma part {formatMoney(detailShare)} · payé {formatMoney(detailPaid)}
                </span>
              </li>
            </ul>

            {/* Desktop: full table. */}
            <div className="hidden overflow-hidden rounded-xl border md:block">
              <Table>
                <TableHeader className="bg-muted/60">
                  <TableRow className="hover:bg-transparent">
                    {['Date', 'Dépense', 'Groupe', 'Payé par', 'Total', 'Ma part', "J'ai payé"].map((h, i) => (
                      <TableHead
                        key={h}
                        className={cn('h-11 text-xs font-bold tracking-wider uppercase', i === 0 && 'pl-5', i >= 4 && 'text-right', i === 6 && 'pr-5')}
                      >
                        {h}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detail.map(({ e, g }) => {
                    const cat = categoryOf(e.category)
                    const mine = myShareOf(e, me)
                    return (
                      <TableRow key={e.id} className="cursor-pointer" onClick={() => openExpense({ groupId: g.id, expense: e })}>
                        <TableCell className="pl-5 whitespace-nowrap text-muted-foreground">{relativeDay(e.date)}</TableCell>
                        <TableCell>
                          <span className="flex items-center gap-3">
                            <span className={cn('grid size-9 shrink-0 place-items-center rounded-full', cat.tint)}>
                              <cat.icon className="size-4" />
                            </span>
                            <span className="flex flex-col">
                              <span className="font-semibold">{e.title}</span>
                              <span className="text-xs text-muted-foreground">{cat.label}</span>
                            </span>
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="rounded-full bg-muted text-foreground">
                            {g.name}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="flex items-center gap-2">
                            <UserAvatar id={e.paidBy} name={g.members[e.paidBy]?.name} className="size-6 text-[9px]" />
                            {e.paidBy === me ? 'Toi' : (g.members[e.paidBy]?.name ?? '?')}
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">{formatMoney(e.amount, g.currency)}</TableCell>
                        <TableCell className="text-right">
                          <strong>{formatMoney(mine, g.currency)}</strong>
                          <span className="block text-xs text-muted-foreground">{Math.round((mine / e.amount) * 100)} %</span>
                        </TableCell>
                        <TableCell className="pr-5 text-right">
                          {e.paidBy === me ? <strong>{formatMoney(e.amount, g.currency)}</strong> : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
                <TableFooter className="bg-muted/60">
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={5} className="pl-5 font-semibold">
                      Total
                    </TableCell>
                    <TableCell className="text-right font-bold">{formatMoney(detailShare)}</TableCell>
                    <TableCell className="pr-5 text-right font-bold">{formatMoney(detailPaid)}</TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          </>
        )}

        <Button asChild variant="action" className="-ml-4 self-start">
          <Link to={`/history?month=${month}`}>
            Ouvrir dans l'historique <ChevronRight />
          </Link>
        </Button>
      </Card>
    </Page>
  )
}

/** Change vs the previous month. Spending more is shown as the "bad" direction. */
function Delta({ now, before, month }: { now: number; before: number; month: string }) {
  if (before <= 0) return <span className="text-muted-foreground">Rien le mois d'avant</span>
  const pct = Math.round(((now - before) / before) * 100)
  return (
    <span className={cn('flex items-center gap-1 font-semibold', pct > 0 ? 'text-negative' : 'text-positive')}>
      {pct > 0 ? <ArrowUpRight className="size-4" /> : <ArrowDownRight className="size-4" />}
      {Math.abs(pct)} % vs {monthName(shiftMonth(month, -1), false)}
    </span>
  )
}

function Tile({
  label,
  value,
  icon: Icon,
  tint,
  children,
}: {
  label: string
  value: string
  icon: typeof Wallet
  tint: string
  children: ReactNode
}) {
  return (
    <Card className="gap-2 border-0 p-4 shadow-soft md:p-5">
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-bold tracking-wider text-muted-foreground uppercase">{label}</span>
        <span className={cn('hidden size-9 shrink-0 place-items-center rounded-full md:grid', tint)}>
          <Icon className="size-4.5" />
        </span>
      </div>
      <strong className="text-2xl tracking-tight md:text-3xl">{value}</strong>
      <span className="text-xs md:text-sm">{children}</span>
    </Card>
  )
}

function BarRow({
  label,
  value,
  max,
  share,
  color,
  hint,
  active,
  onClick,
}: {
  label: ReactNode
  value: number
  max: number
  share: number
  color: string
  hint?: string
  /** true: this row is the filter; false: another row is; undefined: no filter. */
  active?: boolean
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={!!active}
      className={cn(
        '-mx-2 flex flex-col gap-1.5 rounded-xl px-2 py-1.5 text-left transition hover:bg-muted/70',
        active && 'bg-muted/70 ring-2 ring-primary/40',
        active === false && 'opacity-45 hover:opacity-100',
      )}
    >
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="min-w-0 truncate font-medium">{label}</span>
        <span className="flex shrink-0 items-baseline gap-2">
          <strong>{formatMoney(value)}</strong>
          <span className="w-10 text-right text-xs text-muted-foreground">{Math.round(share * 100)} %</span>
        </span>
      </div>
      <div className="h-2.5 rounded-full bg-muted">
        <div className="h-full rounded-full" style={{ width: `${Math.max((value / max) * 100, 2)}%`, background: color }} />
      </div>
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </button>
  )
}

function Empty() {
  return <p className="py-6 text-center text-sm text-muted-foreground">Aucune dépense ce mois-là.</p>
}
