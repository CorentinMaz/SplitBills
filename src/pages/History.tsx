import { useState } from 'react'
import { useUser } from '../auth'
import Avatar from '../components/Avatar'
import ExpenseRow from '../components/ExpenseRow'
import Icon from '../components/Icon'
import { displayName } from '../auth'
import { useAllEntries } from '../data/entries'
import { useGroups } from '../data/groups'
import { computeBalances } from '../lib/balance'
import { CATEGORIES } from '../lib/categories'
import { currentMonthName, monthLabel } from '../lib/dates'
import { formatMoney, round2, today } from '../lib/money'
import { nameIn } from '../lib/names'

export default function History() {
  const user = useUser()
  const groups = useGroups(user.uid)
  const byGroup = useAllEntries(groups)
  const [category, setCategory] = useState<string | null>(null)

  if (!groups || (groups.length > 0 && !byGroup)) return <div className="loading">Chargement…</div>

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

  return (
    <main className="page with-nav">
      <div className="brand-row">
        <Avatar id={user.uid} name={displayName(user)} size={40} />
        <span className="brand">Historique</span>
      </div>

      <div className="chips">
        <button className={`chip ${!category ? 'active' : ''}`} onClick={() => setCategory(null)}>
          <Icon name="history" /> Tous
        </button>
        {CATEGORIES.map((c) => (
          <button key={c.id} className={`chip ${category === c.id ? 'active' : ''}`} onClick={() => setCategory(c.id)}>
            <Icon name={c.icon} /> {c.label}
          </button>
        ))}
      </div>

      <div className="stats">
        <div className="stat-main">
          <span className="small">Ce mois-ci</span>
          <strong>{formatMoney(monthSpent)}</strong>
          <span className="small">Total dépensé en {currentMonthName()}</span>
        </div>
        <div className="stat">
          <span className="stat-icon tint-orange">
            <Icon name="arrow_downward" />
          </span>
          <span className="stack-tight">
            <strong>{formatMoney(round2(owe))}</strong>
            <span className="small muted">Tu dois</span>
          </span>
        </div>
        <div className="stat">
          <span className="stat-icon tint-green">
            <Icon name="arrow_upward" />
          </span>
          <span className="stack-tight">
            <strong>{formatMoney(round2(owed))}</strong>
            <span className="small muted">On te doit</span>
          </span>
        </div>
      </div>

      {months.length === 0 && <p className="empty">Rien à afficher.</p>}
      {months.map((m) => (
        <section key={m.label} className="stack">
          <h2 className="title">{m.label}</h2>
          <ul className="bills">
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
    </main>
  )
}
