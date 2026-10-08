import { useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { useUser } from '../auth'
import Avatar from '../components/Avatar'
import Header from '../components/Header'
import Icon from '../components/Icon'
import { leaveGroup, updateGroup, useGroup } from '../data/groups'
import { reportError } from '../lib/errors'
import { shareInvite } from '../lib/invite'
import type { Group, Member } from '../types'

export default function GroupSettings() {
  const { groupId = '' } = useParams()
  const group = useGroup(groupId)
  if (group === null) return <Navigate to="/groups" replace />
  if (!group) return <div className="loading">Chargement…</div>
  return <Settings group={group} />
}

function Settings({ group }: { group: Group }) {
  const groupId = group.id
  const user = useUser()
  const navigate = useNavigate()
  const [name, setName] = useState(group.name)
  const [editingName, setEditingName] = useState(false)
  const [members, setMembers] = useState<Record<string, Member>>(group.members)
  const [saved, setSaved] = useState(true)
  const [copied, setCopied] = useState(false)

  const ids = group.memberIds
  const total = ids.reduce((sum, id) => sum + (members[id]?.share ?? 0), 0)

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
    try {
      await updateGroup(groupId, { name: name.trim() || group.name, members })
      setSaved(true)
      setEditingName(false)
    } catch (e) {
      reportError(e)
    }
  }

  async function leave() {
    if (!confirm('Quitter ce groupe? Tu ne verras plus ses dépenses.')) return
    await leaveGroup(group, user.uid)
    navigate('/groups', { replace: true })
  }

  return (
    <main className="page with-nav">
      <Header title="Paramètres" back={`/g/${groupId}`} />

      <section className="card group-id">
        <span className="group-tile">
          <Icon name="group" fill />
        </span>
        {editingName ? (
          <input autoFocus value={name} onChange={(e) => (setName(e.target.value), setSaved(false))} />
        ) : (
          <span className="stack-tight grow">
            <span className="headline">{name}</span>
            <span className="muted small">
              {ids.length} membre{ids.length > 1 ? 's' : ''}
            </span>
          </span>
        )}
        <button className="round-btn tonal" aria-label="Renommer" onClick={() => setEditingName(!editingName)}>
          <Icon name={editingName ? 'check' : 'edit'} />
        </button>
      </section>

      <section className="card stack">
        <div className="split">
          <h2 className="title">Membres ({ids.length})</h2>
          <button className="link-btn label-caps" onClick={() => shareInvite(group).then(setCopied)}>
            <Icon name="person_add" /> Inviter
          </button>
        </div>
        <p className="muted small">Répartition par défaut des nouvelles dépenses. Ex. 70 / 30 selon vos revenus.</p>
        {ids.map((id) => (
          <div key={id} className="member">
            <Avatar id={id} name={members[id]?.name} size={44} />
            <span className="member-main">
              <span className="split">
                <span className="stack-tight">
                  <strong>
                    {members[id]?.name}
                    {id === user.uid && ' (toi)'}
                  </strong>
                  <span className={`small ${id === group.createdBy ? 'accent' : 'muted'}`}>
                    {id === group.createdBy ? 'Admin' : 'Membre'}
                  </span>
                </span>
                <strong className="share-pct">{members[id]?.share ?? 0} %</strong>
              </span>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={members[id]?.share ?? 0}
                onChange={(e) => setShare(id, Number(e.target.value))}
                aria-label={`Part de ${members[id]?.name}`}
              />
            </span>
          </div>
        ))}
        {total !== 100 && <p className="error">Total : {total} % (doit faire 100 %)</p>}
        <button className="btn gradient" disabled={total !== 100 || saved} onClick={save}>
          {saved ? (
            <>
              <Icon name="check" /> Enregistré
            </>
          ) : (
            'Enregistrer'
          )}
        </button>
      </section>

      <section className="card stack">
        <h2 className="title">Inviter</h2>
        <p className="muted small">La personne crée un compte avec ce lien puis rejoint le groupe.</p>
        <button className="btn tonal" onClick={() => shareInvite(group).then(setCopied)}>
          <Icon name={copied ? 'check' : 'share'} /> {copied ? 'Lien copié' : 'Partager le lien'}
        </button>
      </section>

      <button className="menu-row card danger-row" onClick={leave}>
        <span className="menu-icon">
          <Icon name="logout" />
        </span>
        <span>Quitter le groupe</span>
        <Icon name="chevron_right" />
      </button>
    </main>
  )
}
