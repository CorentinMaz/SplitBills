import { signOut, updateProfile } from 'firebase/auth'
import { doc, updateDoc } from 'firebase/firestore'
import { ChevronRight, LogOut, Moon, Pencil } from 'lucide-react'
import { useState } from 'react'
import { displayName, useUser } from '@/auth'
import { Page } from '@/components/Page'
import UserAvatar from '@/components/UserAvatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { useGroups } from '@/data/groups'
import { auth, db } from '@/firebase'
import { reportError } from '@/lib/errors'
import { setTheme, useIsDark } from '@/lib/theme'

const rowIcon = 'grid size-10 shrink-0 place-items-center rounded-full bg-muted'

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
    <Page className="max-w-xl">
      <div className="flex flex-col items-center gap-2 pt-6 text-center">
        <UserAvatar id={user.uid} name={shownName} className="mb-2 size-24 text-3xl shadow-xl shadow-teal-700/25" />
        {editing ? (
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              saveName()
            }}
          >
            <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} className="h-10" />
            <Button>OK</Button>
          </form>
        ) : (
          <h1 className="text-2xl font-semibold">{shownName}</h1>
        )}
        <span className="text-muted-foreground">{user.email}</span>
      </div>

      <Card className="border-0 shadow-soft">
        <CardHeader>
          <CardTitle className="text-lg">Compte</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-1">
          <button className="flex items-center gap-3.5 py-2.5 text-left" onClick={() => setEditing(true)}>
            <span className={rowIcon}>
              <Pencil className="size-5" />
            </span>
            <span className="flex-1">Modifier mon nom</span>
            <ChevronRight className="size-5 text-muted-foreground" />
          </button>
          <label className="flex cursor-pointer items-center gap-3.5 py-2.5">
            <span className={rowIcon}>
              <Moon className="size-5" />
            </span>
            <span className="flex-1">Apparence sombre</span>
            <Switch checked={dark} onCheckedChange={(on) => setTheme(on ? 'dark' : 'light')} />
          </label>
        </CardContent>
      </Card>

      <Card className="border-0 p-0 shadow-soft">
        <button className="flex items-center gap-3.5 px-6 py-4 text-left text-destructive" onClick={() => signOut(auth)}>
          <span className={`${rowIcon} bg-destructive/10`}>
            <LogOut className="size-5" />
          </span>
          <span className="flex-1">Se déconnecter</span>
          <ChevronRight className="size-5" />
        </button>
      </Card>
    </Page>
  )
}
