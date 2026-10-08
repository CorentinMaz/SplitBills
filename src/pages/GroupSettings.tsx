import { Check, ChevronRight, LogOut, Pencil, Share2, UserPlus, Users } from 'lucide-react'
import { useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { useUser } from '@/auth'
import { Loading, Page } from '@/components/Page'
import PageHeader from '@/components/PageHeader'
import UserAvatar from '@/components/UserAvatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { leaveGroup, updateGroup, useGroup } from '@/data/groups'
import { reportError } from '@/lib/errors'
import { shareInvite } from '@/lib/invite'
import type { Group, Member } from '@/types'

export default function GroupSettings() {
  const { groupId = '' } = useParams()
  const group = useGroup(groupId)
  if (group === null) return <Navigate to="/groups" replace />
  if (!group) return <Loading />
  return <Settings group={group} />
}

function Settings({ group }: { group: Group }) {
  const groupId = group.id
  const user = useUser()
  const navigate = useNavigate()
  const [name, setName] = useState(group.name)
  const [editingName, setEditingName] = useState(false)
  const [members, setMembers] = useState<Record<string, Member>>(group.members)
  const [dirty, setDirty] = useState(false)

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
    setDirty(true)
  }

  async function save() {
    try {
      await updateGroup(groupId, { name: name.trim() || group.name, members })
      setDirty(false)
      setEditingName(false)
      toast.success('Groupe enregistré')
    } catch (e) {
      reportError(e)
    }
  }

  async function invite() {
    if (await shareInvite(group)) toast.success("Lien d'invitation copié")
  }

  async function leave() {
    if (!confirm('Quitter ce groupe? Tu ne verras plus ses dépenses.')) return
    await leaveGroup(group, user.uid)
    navigate('/groups', { replace: true })
  }

  return (
    <Page className="max-w-2xl">
      <PageHeader title="Paramètres" back={`/g/${groupId}`} />

      <Card className="flex-row items-center gap-4 border-0 p-5 shadow-soft">
        <span className="grid size-15 shrink-0 place-items-center rounded-2xl bg-brand text-white">
          <Users className="size-7" />
        </span>
        {editingName ? (
          <Input
            autoFocus
            value={name}
            onChange={(e) => (setName(e.target.value), setDirty(true))}
            className="h-11 flex-1 text-lg"
          />
        ) : (
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-2xl font-semibold">{name}</span>
            <span className="text-sm text-muted-foreground">
              {ids.length} membre{ids.length > 1 ? 's' : ''}
            </span>
          </span>
        )}
        <Button
          size="icon"
          variant="secondary"
          className="rounded-full"
          aria-label="Renommer"
          onClick={() => setEditingName(!editingName)}
        >
          {editingName ? <Check /> : <Pencil />}
        </Button>
      </Card>

      <Card className="border-0 shadow-soft">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex flex-col gap-1.5">
            <CardTitle className="text-lg">Membres ({ids.length})</CardTitle>
            <CardDescription>Répartition par défaut des nouvelles dépenses. Ex. 70 / 30 selon vos revenus.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          {ids.map((id) => (
            <div key={id} className="flex items-start gap-3.5">
              <UserAvatar id={id} name={members[id]?.name} className="size-11" />
              <div className="flex min-w-0 flex-1 flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="flex flex-col">
                    <strong>
                      {members[id]?.name}
                      {id === user.uid && ' (toi)'}
                    </strong>
                    <span className={id === group.createdBy ? 'text-sm font-semibold text-primary' : 'text-sm text-muted-foreground'}>
                      {id === group.createdBy ? 'Admin' : 'Membre'}
                    </span>
                  </span>
                  <strong className="text-lg text-primary">{members[id]?.share ?? 0} %</strong>
                </div>
                <Slider
                  min={0}
                  max={100}
                  step={5}
                  value={[members[id]?.share ?? 0]}
                  onValueChange={([v]) => setShare(id, v)}
                  aria-label={`Part de ${members[id]?.name}`}
                />
              </div>
            </div>
          ))}
          {total !== 100 && <p className="text-sm text-destructive">Total : {total} % (doit faire 100 %)</p>}
          <Button
            className="h-12 rounded-full bg-brand text-base"
            disabled={total !== 100 || !dirty}
            onClick={save}
          >
            {dirty ? 'Enregistrer' : (
              <>
                <Check /> Enregistré
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-soft">
        <CardHeader>
          <CardTitle className="text-lg">Inviter</CardTitle>
          <CardDescription>La personne crée un compte avec ce lien puis rejoint le groupe.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="secondary" className="h-12 w-full rounded-full text-base" onClick={invite}>
            {'share' in navigator ? <Share2 /> : <UserPlus />} Partager le lien
          </Button>
        </CardContent>
      </Card>

      <Card className="border-0 p-0 shadow-soft">
        <button className="flex items-center gap-3.5 px-6 py-4 text-left text-destructive" onClick={leave}>
          <span className="grid size-10 place-items-center rounded-full bg-destructive/10">
            <LogOut className="size-5" />
          </span>
          <span className="flex-1">Quitter le groupe</span>
          <ChevronRight className="size-5" />
        </button>
      </Card>
    </Page>
  )
}
