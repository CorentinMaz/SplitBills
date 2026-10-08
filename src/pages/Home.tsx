import { useState } from 'react'
import { Link } from 'react-router-dom'
import { displayName, useUser } from '../auth'
import Avatar from '../components/Avatar'
import ExpenseRow from '../components/ExpenseRow'
import Icon from '../components/Icon'
import { useAllEntries } from '../data/entries'
import { useGroups } from '../data/groups'
import { computeBalances } from '../lib/balance'
import { currentMonthName } from '../lib/dates'
import { formatMoney, round2, today } from '../lib/money'
import { nameIn } from '../lib/names'

export default function Home() {
  const user = useUser()
  const groups = useGroups(user.uid)
  const byGroup = useAllEntries(groups)
  const [filter, setFilter] = useState<string | null>(null)

  if (!groups || (groups.length > 0 && !byGroup)) return <div className="loading">Chargement…</div>

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
    <main className="page with-nav">
      <div className="brand-row mobile-only">
        <Link to="/profile">
          <Avatar id={user.uid} name={displayName(user)} size={40} />
        </Link>
        <span className="brand">SplitBills</span>
      </div>

      <div>
        <h1 className="display">Aperçu</h1>
        <p className="muted lead">Voici un résumé de vos finances partagées ce mois-ci.</p>
      </div>

      <section className="hero-card">
        <div className="split">
          <span className="label-caps">Dépenses totales ({currentMonthName()})</span>
          <span className="glass-icon">
            <Icon name="trending_up" />
          </span>
        </div>
        <span className="hero-amount">{formatMoney(spent)}</span>
        <hr />
        <div className="split end">
          <span className="stack-tight">
            <span className="label-caps">Solde global</span>
            <span className={`hero-balance ${balance > 0 ? 'pos' : balance < 0 ? 'neg' : ''}`}>
              {balance > 0 ? '+ ' : balance < 0 ? '− ' : ''}
              {formatMoney(Math.abs(balance))}
            </span>
          </span>
          <span className="hero-note">{balance > 0 ? 'On te doit' : balance < 0 ? 'Tu dois' : 'Tout est réglé'}</span>
        </div>
      </section>

      {groups.length > 1 && (
        <div className="chips">
          <button className={`chip ${!filter ? 'active' : ''}`} onClick={() => setFilter(null)}>
            Tous
          </button>
          {groups.map((g) => (
            <button key={g.id} className={`chip ${filter === g.id ? 'active' : ''}`} onClick={() => setFilter(g.id)}>
              {g.name}
            </button>
          ))}
        </div>
      )}

      <div className="section-head">
        <h2 className="title">Dépenses récentes</h2>
        <Link to="/history" className="label-caps link">
          Voir tout
        </Link>
      </div>

      {groups.length === 0 ? (
        <div className="empty">
          <Icon name="group" />
          <p>Crée un premier groupe pour commencer à partager tes dépenses.</p>
          <Link to="/groups" className="btn primary">
            Créer un groupe
          </Link>
        </div>
      ) : recent.length === 0 ? (
        <p className="empty">Aucune dépense pour l'instant.</p>
      ) : (
        <ul className="bills">
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

      <Link to={fabGroup ? `/g/${fabGroup}/new` : '/groups'} className="fab" aria-label="Ajouter une dépense">
        <Icon name="add" />
      </Link>
    </main>
  )
}
