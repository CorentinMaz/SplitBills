import { Link, Navigate, useParams } from 'react-router-dom'
import { useUser } from '../auth'
import Avatar, { AvatarStack } from '../components/Avatar'
import ExpenseRow from '../components/ExpenseRow'
import Header from '../components/Header'
import Icon from '../components/Icon'
import { addPayment, deleteEntry, useEntries } from '../data/entries'
import { useGroup } from '../data/groups'
import { computeBalances, settleUp } from '../lib/balance'
import { shareInvite } from '../lib/invite'
import { formatMoney, today } from '../lib/money'
import { nameIn } from '../lib/names'

export default function GroupPage() {
  const { groupId = '' } = useParams()
  const user = useUser()
  const group = useGroup(groupId)
  const entries = useEntries(groupId)

  if (group === null) return <Navigate to="/groups" replace />
  if (!group || !entries) return <div className="loading">Chargement…</div>

  const me = user.uid
  const name = nameIn(group, me)
  const money = (n: number) => formatMoney(n, group.currency)
  const balances = computeBalances(group.memberIds, entries)
  const transfers = settleUp(balances)
  const mine = balances[me] ?? 0
  const myTransfers = transfers.filter((t) => t.from === me || t.to === me)
  const others = transfers.filter((t) => t.from !== me && t.to !== me)

  async function settleAll() {
    if (!confirm(`Enregistrer ${transfers.length} remboursement${transfers.length > 1 ? 's' : ''}?`)) return
    await Promise.all(
      transfers.map((t) => addPayment(groupId, { amount: t.amount, paidBy: t.from, to: t.to, date: today(), createdBy: me })),
    )
  }

  return (
    <main className="page with-nav">
      <Header
        back="/groups"
        actions={
          <>
            <button className="round-btn tonal" aria-label="Inviter" onClick={() => shareInvite(group).then((copied) => copied && alert('Lien copié!'))}>
              <Icon name="person_add" />
            </button>
            <Link to="settings" className="round-btn" aria-label="Réglages">
              <Icon name="settings" />
            </Link>
          </>
        }
      />

      <section className="group-hero">
        <span className="pill-tag">
          {group.memberIds.map((id) => `${group.members[id]?.share ?? 0} %`).join(' / ')}
        </span>
        <h1 className="display">{group.name}</h1>
        <AvatarStack people={group.memberIds.map((id) => ({ id, name: group.members[id]?.name }))} max={4} size={38} />
      </section>

      <section className="card stack">
        <span className="muted">Ton solde total</span>
        <span className={`big-balance ${mine > 0 ? 'pos' : mine < 0 ? 'neg' : ''}`}>
          {mine > 0 ? '+ ' : mine < 0 ? '− ' : ''}
          {money(Math.abs(mine))}
        </span>
        {transfers.length > 0 && <hr />}
        {[...myTransfers, ...others].map((t) => {
          const other = t.from === me ? t.to : t.from
          const text =
            t.to === me
              ? `${name(t.from)} te doit`
              : t.from === me
                ? `Tu dois à ${name(t.to)}`
                : `${name(t.from)} doit à ${name(t.to)}`
          return (
            <div key={`${t.from}-${t.to}`} className="split">
              <span className="row-left">
                <Avatar id={other} name={group.members[other]?.name} size={26} />
                {text}
              </span>
              <strong className={t.to === me ? 'pos' : t.from === me ? 'neg' : ''}>{money(t.amount)}</strong>
            </div>
          )
        })}
        {transfers.length > 0 ? (
          <button className="btn tonal" onClick={settleAll}>
            <Icon name="account_balance_wallet" /> Solder les dettes
          </button>
        ) : (
          <p className="muted small">Tout le monde est quitte 🎉</p>
        )}
      </section>

      <h2 className="headline">Dépenses</h2>
      {entries.length === 0 && <p className="empty">Aucune dépense pour l'instant.</p>}
      <ul className="bills">
        {entries.map((e) => (
          <ExpenseRow
            key={e.id}
            entry={e}
            groupId={groupId}
            me={me}
            nameOf={name}
            currency={group.currency}
            onDeletePayment={() => confirm('Annuler ce remboursement?') && deleteEntry(groupId, e.id)}
          />
        ))}
      </ul>

      <Link to="new" className="fab" aria-label="Ajouter une dépense">
        <Icon name="add" />
      </Link>
    </main>
  )
}
