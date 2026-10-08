import { signOut } from 'firebase/auth'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useUser } from '../auth'
import Header from '../components/Header'
import { createGroup, useGroups } from '../data/groups'
import { auth } from '../firebase'

export default function Groups() {
  const user = useUser()
  const groups = useGroups(user.uid)
  const navigate = useNavigate()
  const [name, setName] = useState('')

  async function create() {
    if (!name.trim()) return
    const id = await createGroup(user, name.trim())
    navigate(`/g/${id}/settings`)
  }

  return (
    <main className="page">
      <Header
        title="Mes groupes"
        action={
          <button className="icon-btn" onClick={() => signOut(auth)} aria-label="Déconnexion" title="Déconnexion">
            ⎋
          </button>
        }
      />

      {groups === null ? (
        <p className="muted center">Chargement…</p>
      ) : groups.length === 0 ? (
        <p className="muted center">Aucun groupe. Crée-en un ci-dessous, puis invite ta blonde ou tes colocs.</p>
      ) : (
        <ul className="list">
          {groups.map((g) => (
            <li key={g.id}>
              <Link to={`/g/${g.id}`} className="row">
                <span>{g.name}</span>
                <span className="muted">{g.memberIds.length} membre{g.memberIds.length > 1 ? 's' : ''} ›</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <form
        className="card inline"
        onSubmit={(e) => {
          e.preventDefault()
          create()
        }}
      >
        <input placeholder="Nouveau groupe (ex. Appart)" value={name} onChange={(e) => setName(e.target.value)} />
        <button className="btn primary">Créer</button>
      </form>
    </main>
  )
}
