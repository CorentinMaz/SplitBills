import { signOut, updateProfile } from 'firebase/auth'
import { doc, updateDoc } from 'firebase/firestore'
import { useState } from 'react'
import { displayName, useUser } from '../auth'
import Avatar from '../components/Avatar'
import Icon from '../components/Icon'
import { useGroups } from '../data/groups'
import { auth, db } from '../firebase'
import { reportError } from '../lib/errors'
import { setTheme, useIsDark } from '../lib/theme'

export default function Profile() {
  const user = useUser()
  const groups = useGroups(user.uid)
  const dark = useIsDark()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(displayName(user))
  const [shownName, setShownName] = useState(displayName(user))

  async function saveName() {
    const next = name.trim()
    if (!next) return
    try {
      await updateProfile(user, { displayName: next })
      await updateDoc(doc(db, 'users', user.uid), { name: next })
      // Keep the name shown to other members in sync.
      await Promise.all(
        (groups ?? []).map((g) => updateDoc(doc(db, 'groups', g.id), { [`members.${user.uid}.name`]: next })),
      )
      setShownName(next)
      setEditing(false)
    } catch (e) {
      reportError(e)
    }
  }

  return (
    <main className="page with-nav">
      <div className="profile-head">
        <Avatar id={user.uid} name={shownName} size={96} />
        {editing ? (
          <form
            className="inline-form"
            onSubmit={(e) => {
              e.preventDefault()
              saveName()
            }}
          >
            <input autoFocus value={name} onChange={(e) => setName(e.target.value)} />
            <button className="btn primary">OK</button>
          </form>
        ) : (
          <h1 className="headline">{shownName}</h1>
        )}
        <span className="muted">{user.email}</span>
      </div>

      <section className="card menu">
        <h2 className="title">Compte</h2>
        <button className="menu-row" onClick={() => setEditing(true)}>
          <span className="menu-icon">
            <Icon name="edit" />
          </span>
          <span>Modifier mon nom</span>
          <Icon name="chevron_right" />
        </button>
        <label className="menu-row">
          <span className="menu-icon">
            <Icon name="dark_mode" />
          </span>
          <span>Apparence sombre</span>
          <input type="checkbox" className="switch" checked={dark} onChange={(e) => setTheme(e.target.checked ? 'dark' : 'light')} />
        </label>
      </section>

      <button className="menu-row card danger-row" onClick={() => signOut(auth)}>
        <span className="menu-icon">
          <Icon name="logout" />
        </span>
        <span>Se déconnecter</span>
        <Icon name="chevron_right" />
      </button>
    </main>
  )
}
