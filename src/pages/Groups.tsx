import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useUser } from '../auth'
import { AvatarStack } from '../components/Avatar'
import Icon from '../components/Icon'
import { useAllEntries } from '../data/entries'
import { createGroup, useGroups } from '../data/groups'
import { computeBalances } from '../lib/balance'
import { reportError } from '../lib/errors'
import { formatMoney } from '../lib/money'

const HEADERS = ['teal', 'blue', 'violet', 'orange', 'pink', 'indigo']

export default function Groups() {
  const user = useUser()
  const groups = useGroups(user.uid)
  const byGroup = useAllEntries(groups)
  const navigate = useNavigate()
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')

  async function create() {
    if (!name.trim()) return
    try {
      const id = await createGroup(user, name.trim())
      navigate(`/g/${id}/settings`)
    } catch (e) {
      reportError(e)
    }
  }

  return (
    <main className="page with-nav">
      <h1 className="display brand-title">Groupes</h1>

      {creating ? (
        <form
          className="card inline-form"
          onSubmit={(e) => {
            e.preventDefault()
            create()
          }}
        >
          <input autoFocus placeholder="Nom du groupe (ex. Appart)" value={name} onChange={(e) => setName(e.target.value)} />
          <button className="btn primary">Créer</button>
        </form>
      ) : (
        <button className="btn gradient big" onClick={() => setCreating(true)}>
          <Icon name="add" /> Nouveau groupe
        </button>
      )}

      {groups === null ? (
        <div className="loading">Chargement…</div>
      ) : groups.length === 0 ? (
        <p className="empty">Aucun groupe. Crée-en un, puis invite ta blonde ou tes colocs.</p>
      ) : (
        <div className="group-grid">
          {groups.map((g, i) => {
            const entries = byGroup?.[g.id]
            const bal = entries ? (computeBalances(g.memberIds, entries)[user.uid] ?? 0) : 0
            return (
              <Link key={g.id} to={`/g/${g.id}`} className="group-card">
                <span className={`group-card-head solid-${HEADERS[i % HEADERS.length]}`} />
                <span className="group-card-avatars">
                  <AvatarStack people={g.memberIds.map((id) => ({ id, name: g.members[id]?.name }))} size={38} />
                </span>
                <span className="group-card-body">
                  <span className="title">{g.name}</span>
                  <span className="muted small">
                    {g.memberIds.length} membre{g.memberIds.length > 1 ? 's' : ''}
                  </span>
                </span>
                <span className={`group-card-foot ${bal > 0.005 ? 'pos' : bal < -0.005 ? 'neg' : ''}`}>
                  {!entries
                    ? '…'
                    : bal > 0.005
                      ? `On te doit ${formatMoney(bal, g.currency)}`
                      : bal < -0.005
                        ? `Tu dois ${formatMoney(-bal, g.currency)}`
                        : 'Tout est réglé'}
                </span>
              </Link>
            )
          })}
        </div>
      )}
    </main>
  )
}
