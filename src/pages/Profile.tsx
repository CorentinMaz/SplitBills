import { sendPasswordResetEmail, signOut, updateProfile } from 'firebase/auth'
import { doc, updateDoc } from 'firebase/firestore'
import { BadgeCheck, ChevronRight, KeyRound, LogOut, Moon, Pencil, Users } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { displayName, useUser } from '@/auth'
import { Eyebrow, Money, Page } from '@/components/Page'
import UserAvatar from '@/components/UserAvatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { useAllEntries } from '@/data/entries'
import { useGroups } from '@/data/groups'
import { auth, db } from '@/firebase'
import { reportError } from '@/lib/errors'
import { formatMoney, today } from '@/lib/money'
import { groupSummary, myShareOf } from '@/lib/stats'
import { setTheme, useIsDark } from '@/lib/theme'

const rowIcon = 'grid size-10 shrink-0 place-items-center rounded-full bg-muted'
const sinceFmt = new Intl.DateTimeFormat('fr-CA', { month: 'long', year: 'numeric' })

export default function Profile() {
  const user = useUser()
  const groups = useGroups(user.uid)
  const byGroup = useAllEntries(groups)
  const dark = useIsDark()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(displayName(user))
  const [shownName, setShownName] = useState(displayName(user))

  const month = today().slice(0, 7)
  let myMonth = 0
  let received = 0
  for (const g of groups ?? []) {
    for (const e of byGroup?.[g.id] ?? []) {
      if (e.kind === 'expense' && e.date.startsWith(month)) myMonth += myShareOf(e, user.uid)
      if (e.kind === 'payment' && e.to === user.uid) received += e.amount
    }
  }
  const viaGoogle = user.providerData.some((p) => p.providerId === 'google.com')
  const since = user.metadata.creationTime ? sinceFmt.format(new Date(user.metadata.creationTime)) : '—'

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
      toast.success('Nom mis à jour')
    } catch (e) {
      reportError(e)
    }
  }

  async function resetPassword() {
    if (!user.email) return
    try {
      await sendPasswordResetEmail(auth, user.email)
      toast.success('Courriel envoyé', { description: `Vérifie ta boîte ${user.email}.` })
    } catch (e) {
      reportError(e)
    }
  }

  return (
    <Page>
      <div className="hidden flex-col gap-1 md:flex">
        <Eyebrow>Espace personnel</Eyebrow>
        <h1 className="text-[34px] font-bold tracking-tight">Mon profil & paramètres</h1>
      </div>

      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[340px_minmax(0,1fr)] lg:items-start lg:gap-6">
        <div className="flex flex-col gap-5">
          <Card className="items-center gap-3 border-0 bg-gradient-to-b from-secondary/60 to-card p-6 text-center shadow-none md:shadow-soft">
            <UserAvatar id={user.uid} name={shownName} className="mb-1 size-24 text-3xl shadow-xl shadow-teal-700/25" />
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
              <h2 className="text-2xl font-semibold">{shownName}</h2>
            )}
            <span className="text-muted-foreground">{user.email}</span>
            {(user.emailVerified || viaGoogle) && (
              <Badge className="rounded-full bg-emerald-100 text-emerald-800">
                <BadgeCheck /> Compte vérifié
              </Badge>
            )}
            <dl className="mt-2 grid w-full grid-cols-[auto_1fr] gap-x-4 gap-y-3 rounded-xl bg-muted/70 p-4 text-left text-sm">
              <dt className="text-xs font-bold tracking-wider text-muted-foreground uppercase">Membre depuis</dt>
              <dd className="text-right font-semibold capitalize">{since}</dd>
              <dt className="text-xs font-bold tracking-wider text-muted-foreground uppercase">Groupes</dt>
              <dd className="text-right font-semibold">{groups?.length ?? '…'}</dd>
              <dt className="text-xs font-bold tracking-wider text-muted-foreground uppercase">Connexion</dt>
              <dd className="text-right font-semibold">{viaGoogle ? 'Google' : 'Courriel'}</dd>
            </dl>
            <Button variant="secondary" className="w-full rounded-full" onClick={() => setEditing(true)}>
              <Pencil /> Modifier mon nom
            </Button>
          </Card>

          <Card className="gap-3 border-0 p-5 shadow-soft">
            <span className="text-xs font-bold tracking-wider text-muted-foreground uppercase">Activité financière</span>
            <div className="grid grid-cols-2 gap-3">
              <span className="flex flex-col">
                <strong className="text-2xl">{formatMoney(myMonth)}</strong>
                <span className="text-xs text-muted-foreground">Ta part ce mois-ci</span>
              </span>
              <span className="flex flex-col items-end text-right">
                <strong className="text-2xl text-positive">{formatMoney(received)}</strong>
                <span className="text-xs text-muted-foreground">Remboursements reçus</span>
              </span>
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-5">
          <Card className="border-0 shadow-soft">
            <CardHeader>
              <CardTitle className="text-lg">Préférences</CardTitle>
              <CardDescription>Apparence de l'app sur cet appareil.</CardDescription>
            </CardHeader>
            <CardContent>
              <label className="flex cursor-pointer items-center gap-3.5 rounded-xl bg-muted/50 p-3">
                <span className={rowIcon}>
                  <Moon className="size-5" />
                </span>
                <span className="flex flex-1 flex-col">
                  <span className="font-medium">Apparence sombre</span>
                  <span className="text-xs text-muted-foreground">Le mode clair est utilisé par défaut.</span>
                </span>
                <Switch checked={dark} onCheckedChange={(on) => setTheme(on ? 'dark' : 'light')} />
              </label>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-soft">
            <CardHeader>
              <CardTitle className="text-lg">Mes groupes</CardTitle>
              <CardDescription>Ton solde dans chaque groupe.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {(groups ?? []).length === 0 && <p className="text-sm text-muted-foreground">Aucun groupe pour l'instant.</p>}
              {(groups ?? []).map((g) => (
                <Link key={g.id} to={`/g/${g.id}`} className="flex items-center gap-3.5 rounded-xl p-2.5 hover:bg-muted/60">
                  <span className="grid size-10 place-items-center rounded-xl bg-secondary text-secondary-foreground">
                    <Users className="size-5" />
                  </span>
                  <span className="flex flex-1 flex-col">
                    <span className="font-semibold">{g.name}</span>
                    <span className="text-xs text-muted-foreground">Ta part : {g.members[user.uid]?.share ?? 0} %</span>
                  </span>
                  {byGroup && <Money value={groupSummary(g, byGroup[g.id] ?? [], user.uid).balance} currency={g.currency} className="font-bold" />}
                  <ChevronRight className="size-5 text-muted-foreground" />
                </Link>
              ))}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-soft">
            <CardHeader>
              <CardTitle className="text-lg">Sécurité</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-1">
              {!viaGoogle && (
                <button className="flex items-center gap-3.5 rounded-xl p-2.5 text-left hover:bg-muted/60" onClick={resetPassword}>
                  <span className={rowIcon}>
                    <KeyRound className="size-5" />
                  </span>
                  <span className="flex-1">Changer mon mot de passe</span>
                  <ChevronRight className="size-5 text-muted-foreground" />
                </button>
              )}
              <button
                className="flex items-center gap-3.5 rounded-xl p-2.5 text-left text-destructive hover:bg-destructive/5"
                onClick={() => signOut(auth)}
              >
                <span className={`${rowIcon} bg-destructive/10`}>
                  <LogOut className="size-5" />
                </span>
                <span className="flex-1">Se déconnecter</span>
                <ChevronRight className="size-5" />
              </button>
            </CardContent>
          </Card>
        </div>
      </div>
    </Page>
  )
}
