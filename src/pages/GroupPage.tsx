import { Link, Navigate, useParams } from 'react-router-dom'
import { useUser } from '../auth'
import Header from '../components/Header'
import { addPayment, deleteEntry, useEntries } from '../data/entries'
import { useGroup } from '../data/groups'
import { computeBalances, settleUp } from '../lib/balance'
import { formatMoney, today } from '../lib/money'

export default function GroupPage() {
  const { groupId = '' } = useParams()
  const user = useUser()
  const group = useGroup(groupId)
  const entries = useEntries(groupId)

  if (group === null) return <Navigate to="/" replace />
  if (!group || !entries) return <div className="center muted">Chargement…</div>

  const name = (uid: string) => (uid === user.uid ? 'Toi' : (group.members[uid]?.name ?? 'Ancien membre'))
  const money = (n: number) => formatMoney(n, group.currency)
  const balances = computeBalances(group.memberIds, entries)
  const transfers = settleUp(balances)
  const totalSpent = entries.reduce((sum, e) => (e.kind === 'expense' ? sum + e.amount : sum), 0)

  return (
    <main className="page has-fab">
      <Header
        title={group.name}
        back="/"
        action={
          <Link to="settings" className="icon-btn" aria-label="Réglages">
            ⚙
          </Link>
        }
      />

      <section className="card">
        <div className="split">
          <span className="muted">Total dépensé</span>
          <strong>{money(totalSpent)}</strong>
        </div>
        <div className="shares">
          {group.memberIds.map((uid) => (
            <span key={uid} className="chip">
              {name(uid)} · {group.members[uid]?.share ?? 0} %
            </span>
          ))}
        </div>
      </section>

      <section className="card stack">
        <h2>Soldes</h2>
        {transfers.length === 0 ? (
          <p className="muted">Tout le monde est quitte 🎉</p>
        ) : (
          transfers.map((t) => (
            <div key={`${t.from}-${t.to}`} className="split">
              <span>
                <b>{name(t.from)}</b> {t.from === user.uid ? 'dois' : 'doit'} <b>{money(t.amount)}</b> à {name(t.to)}
              </span>
              <button
                className="btn small"
                onClick={() =>
                  confirm(`Enregistrer un remboursement de ${money(t.amount)}?`) &&
                  addPayment(groupId, { amount: t.amount, paidBy: t.from, to: t.to, date: today(), createdBy: user.uid })
                }
              >
                Réglé
              </button>
            </div>
          ))
        )}
      </section>

      <h2 className="section-title">Historique</h2>
      {entries.length === 0 && <p className="muted center">Aucune dépense pour l'instant.</p>}
      <ul className="list">
        {entries.map((e) =>
          e.kind === 'expense' ? (
            <li key={e.id}>
              <Link to={`e/${e.id}`} className="row">
                <span className="stack-tight">
                  <span>{e.title}</span>
                  <small className="muted">
                    {e.date} · payé par {name(e.paidBy)}
                  </small>
                </span>
                <strong>{money(e.amount)}</strong>
              </Link>
            </li>
          ) : (
            <li key={e.id} className="row payment">
              <span className="stack-tight">
                <span>
                  {name(e.paidBy)} → {name(e.to)}
                </span>
                <small className="muted">{e.date} · remboursement</small>
              </span>
              <span className="split-tight">
                <strong>{money(e.amount)}</strong>
                <button
                  className="icon-btn"
                  aria-label="Annuler le remboursement"
                  onClick={() => confirm('Annuler ce remboursement?') && deleteEntry(groupId, e.id)}
                >
                  ×
                </button>
              </span>
            </li>
          ),
        )}
      </ul>

      <Link to="new" className="fab">
        + Dépense
      </Link>
    </main>
  )
}
