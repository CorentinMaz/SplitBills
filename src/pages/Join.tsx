import { useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { useUser } from '../auth'
import Icon from '../components/Icon'
import { joinGroup, useGroup } from '../data/groups'

export default function Join() {
  const { groupId = '' } = useParams()
  const user = useUser()
  const navigate = useNavigate()
  // Non-members can't read the group, so this resolves to null until we've joined.
  const group = useGroup(groupId)
  const [error, setError] = useState<string | null>(null)

  if (group?.memberIds.includes(user.uid)) return <Navigate to={`/g/${groupId}`} replace />

  async function join() {
    try {
      await joinGroup(user, groupId)
      navigate(`/g/${groupId}`, { replace: true })
    } catch {
      setError("Lien d'invitation invalide ou expiré.")
    }
  }

  return (
    <main className="page auth">
      <div className="auth-hero">
        <span className="logo-tile">
          <Icon name="group" fill />
        </span>
        <h1 className="headline">Invitation</h1>
        <p className="muted">On t'a invité·e à partager des dépenses dans un groupe SplitBills.</p>
      </div>
      {error && <p className="error center">{error}</p>}
      <button className="btn gradient big" onClick={join}>
        Rejoindre le groupe
      </button>
    </main>
  )
}
