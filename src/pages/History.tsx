import { ArrowDown, ArrowUp, Banknote, ChevronLeft, ChevronRight, Download, History as HistoryIcon, Plus, Search, TrendingUp, Wallet, X } from 'lucide-react'
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { displayName, useUser } from '@/auth'
import { useOpenExpense } from '@/components/ExpenseDialog'
import ExpenseRow from '@/components/ExpenseRow'
import MonthsPicker from '@/components/MonthsPicker'
import { Eyebrow, Loading, Money, Page, StatCard } from '@/components/Page'
import UserAvatar from '@/components/UserAvatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useAllEntries } from '@/data/entries'
import { useGroups } from '@/data/groups'
import { computeBalances } from '@/lib/balance'
import { CATEGORIES, categoryOf, TINTS } from '@/lib/categories'
import { currentMonthName, inMonths, monthName, monthRange, periodLabel } from '@/lib/dates'
import { formatMoney, round2, today } from '@/lib/money'
import { nameIn } from '@/lib/names'
import { myShareOf } from '@/lib/stats'
import { cn } from '@/lib/utils'
import type { Entry, Group } from '@/types'

const PAGE_SIZE = 10
const dayFmt = new Intl.DateTimeFormat('fr-CA', { day: '2-digit', month: 'short' })

export default function History() {
  const user = useUser()
  const groups = useGroups(user.uid)
  const byGroup = useAllEntries(groups)
  const openExpense = useOpenExpense()
  const [params, setParams] = useSearchParams()
  const q = params.get('q')?.trim().toLowerCase() ?? ''
  const [category, setCategory] = useState<string>('all')
  const [groupFilter, setGroupFilter] = useState('all')
  // ?month=2026-09,2026-10 comes from the stats page; none means every month.
  const [months, setMonths] = useState(() => params.get('month')?.split(',').filter(Boolean) ?? [])
  const [payer, setPayer] = useState('all')
  const [page, setPage] = useState(0)

  if (!groups || (groups.length > 0 && !byGroup)) return <Loading />

  const thisMonth = today().slice(0, 7)
  // The cards follow the picked months, this month otherwise.
  const cardMonths = months.length ? months : [thisMonth]
  const cardLabel = months.length ? periodLabel(months) : currentMonthName()
  let monthSpent = 0
  let monthMine = 0
  let monthCount = 0
  let owed = 0
  let owe = 0
  for (const g of groups) {
    const entries = byGroup?.[g.id] ?? []
    for (const e of entries) {
      if (e.kind !== 'expense' || !inMonths(e.date, cardMonths)) continue
      monthSpent += e.amount
      const mine = myShareOf(e, user.uid)
      monthMine += mine
      if (mine > 0) monthCount++
    }
    const b = computeBalances(g.memberIds, entries)[user.uid] ?? 0
    if (b > 0) owed += b
    else owe -= b
  }

  const all = groups
    .flatMap((g) => (byGroup?.[g.id] ?? []).map((entry) => ({ entry, group: g })))
    .sort((a, b) => b.entry.date.localeCompare(a.entry.date) || b.entry.createdAt - a.entry.createdAt)
  const earliest = [...all.map((x) => x.entry.date.slice(0, 7)), ...months, thisMonth].sort()[0]
  const available = monthRange(earliest, thisMonth)

  const matches = ({ entry, group }: { entry: Entry; group: Group }) => {
    if (category !== 'all' && !(entry.kind === 'expense' && (entry.category ?? 'other') === category)) return false
    if (q && !(entry.kind === 'expense' && entry.title.toLowerCase().includes(q))) return false
    if (groupFilter !== 'all' && group.id !== groupFilter) return false
    if (!inMonths(entry.date, months)) return false
    if (payer === 'me' && entry.paidBy !== user.uid) return false
    if (payer === 'others' && entry.paidBy === user.uid) return false
    return true
  }
  const filtered = all.filter(matches)
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const current = Math.min(page, pages - 1)
  const slice = filtered.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE)

  // Refunds move money between people: they aren't spending, so totals leave them out.
  const spentOf = (items: typeof filtered) =>
    round2(items.reduce((s, { entry }) => s + (entry.kind === 'expense' ? entry.amount : 0), 0))
  const mineOf = (items: typeof filtered) =>
    round2(items.reduce((s, { entry }) => s + (entry.kind === 'expense' ? myShareOf(entry, user.uid) : 0), 0))

  const byMonth: { month: string; items: typeof filtered }[] = []
  for (const item of filtered) {
    const month = item.entry.date.slice(0, 7)
    if (byMonth.at(-1)?.month !== month) byMonth.push({ month, items: [] })
    byMonth.at(-1)!.items.push(item)
  }

  const reset = <T,>(set: (v: T) => void) => (v: T) => {
    set(v)
    setPage(0)
  }
  const chips = [{ id: 'all', label: 'Tous', icon: HistoryIcon }, ...CATEGORIES]
  const searchChip = q && (
    <Badge variant="secondary" className="h-8 gap-1.5 rounded-full px-3 text-sm">
      « {params.get('q')} »
      <button aria-label="Effacer la recherche" className="rounded-full hover:text-destructive" onClick={() => setParams({})}>
        <X className="size-3.5" />
      </button>
    </Badge>
  )

  return (
    <Page>
      {/* ---------- Phone ---------- */}
      <div className="flex flex-col gap-5 md:hidden">
        <div className="flex items-center gap-3 pt-2">
          <UserAvatar id={user.uid} name={displayName(user)} />
          <h1 className="text-[28px] font-bold tracking-tight text-primary">Historique</h1>
        </div>
        {searchChip}
        <div className="no-scrollbar -mx-5 flex gap-2.5 overflow-x-auto px-5">
          {chips.map((c) => (
            <Button
              key={c.id}
              variant={category === c.id ? 'default' : 'secondary'}
              className={cn('shrink-0 rounded-full px-4', category !== c.id && 'bg-muted text-muted-foreground')}
              onClick={() => setCategory(c.id)}
            >
              <c.icon /> {c.label}
            </Button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="row-span-2 flex flex-col justify-between gap-2.5 rounded-xl bg-gradient-to-br from-teal-50 to-teal-200 p-5 text-teal-900 dark:from-teal-900/40 dark:to-teal-700/40 dark:text-teal-100">
            <span className="text-sm">{months.length ? 'Sur la période' : 'Ce mois-ci'}</span>
            <strong className="text-3xl tracking-tight">{formatMoney(monthSpent)}</strong>
            <span className="text-sm">
              Total dépensé {months.length ? '' : 'en '}
              {cardLabel}
            </span>
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
        <MonthsPicker value={months} onChange={reset(setMonths)} months={available} allowAll className="self-start" />
        {byMonth.length > 1 && (
          <div className="flex items-center justify-between rounded-xl bg-muted/70 p-4">
            <span className="flex flex-col">
              <span className="font-semibold first-letter:uppercase">Total {periodLabel(months)}</span>
              <span className="text-xs text-muted-foreground">Ta part {formatMoney(mineOf(filtered))}</span>
            </span>
            <strong className="text-xl">{formatMoney(spentOf(filtered))}</strong>
          </div>
        )}
        {byMonth.length === 0 && <p className="py-8 text-center text-muted-foreground">Rien à afficher.</p>}
        {byMonth.map((m) => (
          <section key={m.month} className="flex flex-col gap-3">
            <h2 className="flex items-baseline justify-between gap-3">
              <span className="text-lg font-semibold first-letter:uppercase">{monthName(m.month)}</span>
              <span className="text-sm text-muted-foreground">
                Total <strong className="text-base text-foreground">{formatMoney(spentOf(m.items))}</strong>
              </span>
            </h2>
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
      </div>

      {/* ---------- Desktop ---------- */}
      <div className="hidden flex-col gap-6 md:flex">
        <div className="flex items-end justify-between gap-4">
          <div className="flex flex-col gap-1">
            <Eyebrow>Transactions · vue globale</Eyebrow>
            <h1 className="text-[34px] font-bold tracking-tight">Historique des dépenses</h1>
            <p className="text-muted-foreground">Retrouve et filtre toutes tes dépenses à travers tes groupes.</p>
          </div>
          <Button variant="brand" className="h-11 rounded-full px-6" onClick={() => openExpense()}>
            <Plus /> Nouvelle dépense
          </Button>
        </div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          <StatCard
            label={`Volume ${cardLabel}`}
            value={formatMoney(monthSpent)}
            hint="Total des dépenses engagées"
            icon={Banknote}
            tint={TINTS.blue}
          />
          <StatCard
            label="Ta part nette"
            value={<span className="text-primary">{formatMoney(monthMine)}</span>}
            hint={`${monthCount} dépense${monthCount > 1 ? 's' : ''} concernée${monthCount > 1 ? 's' : ''}`}
            icon={Wallet}
            tint={TINTS.teal}
          />
          <StatCard
            label="Solde à équilibrer"
            value={<Money value={round2(owed - owe)} />}
            hint={owed - owe > 0 ? 'On te doit globalement' : owed - owe < 0 ? 'Tu dois globalement' : 'Tout est réglé'}
            icon={TrendingUp}
            tint={TINTS.violet}
          />
        </div>

        <Card className="gap-4 border-0 p-5 shadow-soft">
          <div className="flex flex-wrap gap-3">
            <div className="relative w-full max-w-xs">
              <Search className="absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={params.get('q') ?? ''}
                onChange={(e) => {
                  setParams(e.target.value ? { q: e.target.value } : {}, { replace: true })
                  setPage(0)
                }}
                placeholder="Rechercher une dépense…"
                className="h-11 rounded-full border-0 bg-muted pl-11"
              />
            </div>
            <MonthsPicker value={months} onChange={reset(setMonths)} months={available} allowAll className="h-11" />
            <FilterSelect value={groupFilter} onChange={reset(setGroupFilter)} options={[['all', 'Tous les groupes'], ...groups.map((g) => [g.id, g.name] as [string, string])]} />
            <FilterSelect value={category} onChange={reset(setCategory)} options={[['all', 'Toutes les catégories'], ...CATEGORIES.map((c) => [c.id, c.label] as [string, string])]} />
            <FilterSelect value={payer} onChange={reset(setPayer)} options={[['all', 'Payé par : tous'], ['me', 'Payé par : moi'], ['others', 'Payé par : les autres']]} />
            <Button
              variant="outline"
              className="ml-auto h-11 rounded-full bg-card px-5"
              disabled={filtered.length === 0}
              onClick={() => downloadCsv(filtered, user.uid)}
            >
              <Download /> Exporter (CSV)
            </Button>
          </div>
          <span className="flex flex-wrap items-baseline justify-between gap-2 text-xs font-bold tracking-wider text-muted-foreground uppercase">
            {filtered.length} résultat{filtered.length > 1 ? 's' : ''}
            <span>
              Total <span className="text-base text-foreground normal-case">{formatMoney(spentOf(filtered))}</span>
              {' · '}Ta part <span className="text-base text-primary normal-case">{formatMoney(mineOf(filtered))}</span>
            </span>
          </span>
          {byMonth.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {byMonth.map((m) => (
                <Badge key={m.month} variant="secondary" className="h-8 gap-1.5 rounded-full bg-muted px-3 text-sm text-foreground">
                  <span className="first-letter:uppercase">{monthName(m.month)}</span>
                  <strong>{formatMoney(spentOf(m.items))}</strong>
                </Badge>
              ))}
            </div>
          )}
        </Card>

        <Card className="gap-0 overflow-hidden border-0 py-0 shadow-soft">
          <Table>
            <TableHeader className="bg-muted/60">
              <TableRow className="hover:bg-transparent">
                {['Date', 'Dépense & catégorie', 'Groupe', 'Payé par', 'Ta part / total'].map((h, i) => (
                  <TableHead
                    key={h}
                    className={cn('h-12 text-xs font-bold tracking-wider uppercase', i === 0 && 'pl-6', i === 4 && 'pr-6 text-right')}
                  >
                    {h}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {slice.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-12 text-center text-muted-foreground">
                    Aucune dépense ne correspond.
                  </TableCell>
                </TableRow>
              )}
              {slice.map(({ entry: e, group }) => {
                const isExpense = e.kind === 'expense'
                const cat = isExpense ? categoryOf(e.category) : null
                const name = nameIn(group, user.uid)
                return (
                  <TableRow
                    key={e.id}
                    className={cn(isExpense && 'cursor-pointer')}
                    onClick={() => isExpense && openExpense({ groupId: group.id, expense: e })}
                  >
                    <TableCell className="py-4 pl-6 font-semibold whitespace-nowrap">
                      {dayFmt.format(new Date(e.date + 'T12:00'))}
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-3">
                        <span className={cn('grid size-10 shrink-0 place-items-center rounded-full', cat?.tint ?? TINTS.green)}>
                          {cat ? <cat.icon className="size-4.5" /> : <Banknote className="size-4.5" />}
                        </span>
                        <span className="flex flex-col">
                          <span className="font-semibold">{isExpense ? e.title : `${name(e.paidBy)} → ${name(e.to)}`}</span>
                          <span className="text-[11px] font-bold tracking-wider text-primary uppercase" style={cat ? { color: cat.color } : undefined}>
                            {cat?.label ?? 'Remboursement'}
                          </span>
                        </span>
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="rounded-full bg-muted text-foreground">
                        {group.name}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-2.5">
                        <UserAvatar id={e.paidBy} name={group.members[e.paidBy]?.name} className="size-8 text-[11px]" />
                        <span className="flex flex-col items-start">
                          {name(e.paidBy)}
                          {isExpense &&
                            (e.paidBy === user.uid ? (
                              <span className="rounded-md bg-secondary px-1.5 py-0.5 text-[11px] font-semibold text-secondary-foreground">
                                Payé par toi
                              </span>
                            ) : (
                              <span className="text-[11px] text-muted-foreground">Avancé par tiers</span>
                            ))}
                        </span>
                      </span>
                    </TableCell>
                    <TableCell className="pr-6 text-right">
                      {isExpense ? (
                        <span className="flex flex-col items-end">
                          <strong className={cn('text-base', e.paidBy === user.uid && 'text-positive')}>
                            {formatMoney(myShareOf(e, user.uid), group.currency)}
                          </strong>
                          <span className="text-xs text-muted-foreground">Total note : {formatMoney(e.amount, group.currency)}</span>
                        </span>
                      ) : (
                        <span className="flex flex-col items-end">
                          <strong>{formatMoney(e.amount, group.currency)}</strong>
                          <span className="text-xs text-muted-foreground">Remboursement</span>
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
          <div className="flex items-center justify-between border-t bg-muted/40 px-6 py-3.5 text-sm text-muted-foreground">
            <span>
              {filtered.length === 0
                ? 'Aucun résultat'
                : `Affichage de ${current * PAGE_SIZE + 1}–${Math.min((current + 1) * PAGE_SIZE, filtered.length)} sur ${filtered.length}`}
            </span>
            <span className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="rounded-full" disabled={current === 0} onClick={() => setPage(current - 1)} aria-label="Page précédente">
                <ChevronLeft />
              </Button>
              {Array.from({ length: pages }, (_, i) => (
                <Button
                  key={i}
                  variant={i === current ? 'default' : 'ghost'}
                  size="icon"
                  className="rounded-full"
                  onClick={() => setPage(i)}
                >
                  {i + 1}
                </Button>
              ))}
              <Button variant="ghost" size="icon" className="rounded-full" disabled={current >= pages - 1} onClick={() => setPage(current + 1)} aria-label="Page suivante">
                <ChevronRight />
              </Button>
            </span>
          </div>
        </Card>
      </div>
    </Page>
  )
}

function FilterSelect({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={cn('!h-11 rounded-full border-0 bg-muted px-4 font-medium', value !== 'all' && 'bg-secondary text-secondary-foreground')}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map(([v, label]) => (
          <SelectItem key={v} value={v}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

/** Saves the filtered rows as a CSV that Excel and Numbers open in French: semicolons, decimal commas. */
function downloadCsv(items: { entry: Entry; group: Group }[], me: string) {
  const num = (n: number) => round2(n).toFixed(2).replace('.', ',')
  const cell = (v: string) => (/[;"\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)
  const rows = [['Date', 'Dépense', 'Catégorie', 'Groupe', 'Payé par', 'Montant', 'Ta part', 'Devise']]
  for (const { entry: e, group } of items) {
    const name = nameIn(group, me)
    rows.push(
      e.kind === 'expense'
        ? [e.date, e.title, categoryOf(e.category).label, group.name, name(e.paidBy), num(e.amount), num(myShareOf(e, me)), group.currency]
        : [e.date, `${name(e.paidBy)} → ${name(e.to)}`, 'Remboursement', group.name, name(e.paidBy), num(e.amount), '', group.currency],
    )
  }
  const csv = '\uFEFF' + rows.map((r) => r.map(cell).join(';')).join('\r\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `splitbills-${today()}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
