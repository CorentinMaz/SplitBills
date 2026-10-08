import { useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { useUser } from '../auth'
import Header from '../components/Header'
import { leaveGroup, updateGroup, useGroup } from '../data/groups'
import type { Group, Member } from '../types'

export default function GroupSettings() {
  const { groupId = '' } = useParams()
  const group = useGroup(groupId)
  if (group === null) return <Navigate to="/" replace />
  if (!group) return <div className="center muted">Chargement…</div>
  return <Settings group={group} />
}

function Settings({ group }: { group: Group }) {
  const groupId = group.id
  const user = useUser()
  const navigate = useNavigate()
  const [name, setName] = useState(group.name)
  const [members, setMembers] = useState<Record<string, Member>>(group.members)
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)

  const ids = group.memberIds
  const total = ids.reduce((sum, id) => sum + (members[id]?.share ?? 0), 0)
  const inviteUrl = `${location.origin}/join/${groupId}`

  function setShare(id: string, share: number) {
    const next = { ...members, [id]: { ...members[id], share } }
    // With two people a single slider is enough: the other one gets the rest.
    if (ids.length === 2) {
      const other = ids.find((x) => x !== id)!
      next[other] = { ...next[other], share: 100 - share }
    }
    setMembers(next)
    setSaved(false)
  }

  async function save() {
    await updateGroup(groupId, { name: name.trim() || group.name, members: members })
    setSaved(true)
  }

  async function invite() {
    const text = `Rejoins « ${group.name} » sur SplitBills`
    if (navigator.share) {
      await navigator.share({ title: 'SplitBills', text, url: inviteUrl }).catch(() => {})
    } else {
      await navigator.clipboard.writeText(inviteUrl)
      setCopied(true)
    }
  }

  async function leave() {
    if (!confirm('Quitter ce groupe? Tu ne verras plus ses dépenses.')) return
    await leaveGroup(group, user.uid)
    navigate('/', { replace: true })
  }

  return (
    <main className="page">
      <Header title="Réglages" back={`/g/${groupId}`} />

      <section className="card stack">
        <label>
          Nom du groupe
          <input value={name} onChange={(e) => (setName(e.target.value), setSaved(false))} />
        </label>
      </section>

      <section className="card stack">
        <h2>Répartition par défaut</h2>
        <p className="muted small">Ex. 70 / 30 si vos revenus sont différents. S'applique aux nouvelles dépenses.</p>
        {ids.map((id) => (
          <div key={id} className="stack-tight">
            <div className="split">
              <span>{id === user.uid ? `${members[id]?.name} (moi)` : members[id]?.name}</span>
              <strong>{members[id]?.share ?? 0} %</strong>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={members[id]?.share ?? 0}
              onChange={(e) => setShare(id, Number(e.target.value))}
            />
          </div>
        ))}
        {total !== 100 && <p className="error">Total : {total} % (doit faire 100 %)</p>}
        <button className="btn primary" disabled={total !== 100} onClick={save}>
          {saved ? 'Enregistré ✓' : 'Enregistrer'}
        </button>
      </section>

      <section className="card stack">
        <h2>Inviter</h2>
        <p className="muted small">Envoie ce lien. La personne crée un compte puis rejoint le groupe.</p>
        <code className="invite">{inviteUrl}</code>
        <button className="btn" onClick={invite}>
          {copied ? 'Lien copié ✓' : 'Partager le lien'}
        </button>
      </section>

      <button className="btn danger" onClick={leave}>
        Quitter le groupe
      </button>
    </main>
  )
}
