import { Check, ChevronRight, Copy, Info, LogOut, RotateCcw, Shield, SlidersHorizontal, TriangleAlert, UserPlus, Users } from 'lucide-react'
import { useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { useUser } from '@/auth'
import DeleteGroupButton from '@/components/DeleteGroupButton'
import GroupIcon from '@/components/GroupIcon'
import { Loading, Money, Page } from '@/components/Page'
import PageHeader from '@/components/PageHeader'
import UserAvatar from '@/components/UserAvatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { useEntries } from '@/data/entries'
import { leaveGroup, updateGroup, useGroup } from '@/data/groups'
import { reportError } from '@/lib/errors'
import { shareInvite } from '@/lib/invite'
import { formatMoney } from '@/lib/money'
import { groupSummary } from '@/lib/stats'
import type { Entry, Group, Member } from '@/types'

export default function GroupSettings() {
  const { groupId = '' } = useParams()
  const group = useGroup(groupId)
  const entries = useEntries(groupId)
  if (group === null) return <Navigate to="/groups" replace />
  if (!group || !entries) return <Loading />
  return <Settings group={group} entries={entries} />
}

const fieldLabel = 'text-xs font-bold tracking-wider text-muted-foreground uppercase'

function Settings({ group, entries }: { group: Group; entries: Entry[] }) {
  const groupId = group.id
  const user = useUser()
  const navigate = useNavigate()
  const [name, setName] = useState(group.name)
  const [members, setMembers] = useState<Record<string, Member>>(group.members)
  const summary = groupSummary(group, entries, user.uid)
  const inviteUrl = `${location.origin}/join/${groupId}`

  const ids = group.memberIds
  const total = ids.reduce((sum, id) => sum + (members[id]?.share ?? 0), 0)
  const dirty = name !== group.name || ids.some((id) => members[id]?.share !== group.members[id]?.share)

  function setShare(id: string, share: number) {
    const next = { ...members, [id]: { ...members[id], share } }
    // With two people a single slider is enough: the other one gets the rest.
    if (ids.length === 2) {
      const other = ids.find((x) => x !== id)!
      next[other] = { ...next[other], share: 100 - share }
    }
    setMembers(next)
  }

  function reset() {
    setName(group.name)
    setMembers(group.members)
  }

  async function save() {
    try {
      await updateGroup(groupId, { name: name.trim() || group.name, members })
      toast.success('Groupe enregistré')
    } catch (e) {
      reportError(e)
    }
  }

  async function invite() {
    if (await shareInvite(group)) toast.success("Lien d'invitation copié")
  }

  async function copyLink() {
    await navigator.clipboard.writeText(inviteUrl)
    toast.success("Lien d'invitation copié")
  }

  async function leave() {
    if (!confirm('Quitter ce groupe? Tu ne verras plus ses dépenses.')) return
    await leaveGroup(group, user.uid)
    navigate('/groups', { replace: true })
  }

  const saveButton = (
    <Button className="h-11 rounded-full bg-brand px-6" disabled={total !== 100 || !dirty} onClick={save}>
      <Check /> Enregistrer
    </Button>
  )

  return (
    <Page>
      <div className="md:hidden">
        <PageHeader title="Paramètres" back={`/g/${groupId}`} />
      </div>

      <div className="hidden flex-col gap-4 md:flex">
        <nav className="flex items-center gap-2 text-xs font-bold tracking-wider text-muted-foreground uppercase">
          <Link to="/groups" className="hover:text-foreground">
            Groupes
          </Link>
          <ChevronRight className="size-4" />
          <Link to={`/g/${groupId}`} className="hover:text-foreground">
            {group.name}
          </Link>
          <ChevronRight className="size-4" />
          <span className="text-foreground">Paramètres</span>
        </nav>
        <div className="flex items-center gap-5">
          <GroupIcon className="size-16 [&_svg]:size-8" />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <h1 className="truncate text-[32px] font-bold tracking-tight">Paramètres du groupe : {group.name}</h1>
            <p className="text-muted-foreground">Gère les membres, la répartition par défaut et les invitations.</p>
          </div>
          <Button variant="secondary" className="h-11 rounded-full px-5" disabled={!dirty} onClick={reset}>
            <RotateCcw /> Annuler
          </Button>
          {saveButton}
        </div>
      </div>

      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start lg:gap-6">
        <div className="flex min-w-0 flex-col gap-5">
          <Card className="border-0 shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2.5 text-lg">
                <SlidersHorizontal className="size-5 text-primary" /> Informations générales
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-[1fr_200px]">
              <div className="flex flex-col gap-2">
                <Label htmlFor="name" className={fieldLabel}>
                  Nom du groupe
                </Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="h-12 rounded-xl border-0 bg-muted" />
              </div>
              <div className="flex flex-col gap-2">
                <Label className={fieldLabel}>Devise principale</Label>
                <Input value={`${group.currency} ($)`} readOnly disabled className="h-12 rounded-xl border-0 bg-muted" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-soft">
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div className="flex flex-col gap-1.5">
                <CardTitle className="flex items-center gap-2.5 text-lg">
                  <Users className="size-5 text-primary" /> Membres du groupe ({ids.length})
                </CardTitle>
                <CardDescription>Répartition par défaut des nouvelles dépenses. Ex. 70 / 30 selon vos revenus.</CardDescription>
              </div>
              <Button size="sm" className="hidden rounded-full md:flex" onClick={invite}>
                <UserPlus /> Inviter
              </Button>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <div className="hidden grid-cols-[minmax(0,1fr)_200px_120px] gap-4 rounded-lg bg-muted/70 px-4 py-2.5 text-xs font-bold tracking-wider text-muted-foreground uppercase md:grid">
                <span>Participant</span>
                <span>Part par défaut</span>
                <span className="text-right">Solde</span>
              </div>
              {ids.map((id) => {
                const b = summary.balances[id] ?? 0
                return (
                  <div
                    key={id}
                    className="flex flex-col gap-3 rounded-xl px-1 py-3 md:grid md:grid-cols-[minmax(0,1fr)_180px_110px] md:items-center md:gap-4 md:px-4"
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <UserAvatar id={id} name={members[id]?.name} className="size-11" />
                      <span className="flex min-w-0 flex-col">
                        <span className="flex items-center gap-2 font-semibold">
                          <span className="truncate">{members[id]?.name}</span>
                          {id === user.uid && (
                            <Badge variant="secondary" className="rounded-full">
                              Toi
                            </Badge>
                          )}
                        </span>
                        {id === group.createdBy ? (
                          <span className="flex items-center gap-1 text-xs font-semibold text-primary">
                            <Shield className="size-3.5" /> Admin
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">Membre</span>
                        )}
                      </span>
                      <strong className="ml-auto text-lg text-primary md:hidden">{members[id]?.share ?? 0} %</strong>
                    </span>
                    <span className="flex items-center gap-3">
                      <Slider
                        min={0}
                        max={100}
                        step={5}
                        value={[members[id]?.share ?? 0]}
                        onValueChange={([v]) => setShare(id, v)}
                        aria-label={`Part de ${members[id]?.name}`}
                      />
                      <strong className="hidden w-14 shrink-0 text-right whitespace-nowrap text-primary md:block">{members[id]?.share ?? 0} %</strong>
                    </span>
                    <span className="hidden flex-col items-end md:flex">
                      <Money value={b} currency={group.currency} className="font-bold" />
                      <span className="text-[11px] text-muted-foreground">
                        {b > 0.005 ? 'en crédit' : b < -0.005 ? 'doit de l’argent' : 'soldé'}
                      </span>
                    </span>
                  </div>
                )
              })}
              {total !== 100 && <p className="text-sm text-destructive">Total : {total} % (doit faire 100 %)</p>}
              <div className="md:hidden">{saveButton}</div>

              <div className="mt-3 flex flex-col gap-3 rounded-xl bg-muted/70 p-4 xl:flex-row xl:items-center">
                <span className="flex flex-1 flex-col">
                  <span className="font-semibold">Lien d'invitation direct</span>
                  <span className="text-sm text-muted-foreground">La personne crée un compte avec ce lien puis rejoint le groupe.</span>
                </span>
                <code className="truncate rounded-lg bg-card px-3 py-2 text-xs xl:max-w-60">{inviteUrl}</code>
                <Button variant="outline" className="rounded-full bg-card" onClick={'share' in navigator ? invite : copyLink}>
                  <Copy /> {'share' in navigator ? 'Partager' : 'Copier'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-5">
          <Card className="gap-4 border-0 p-5 shadow-soft">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Santé financière</h2>
              <Badge className={summary.transfers.length ? 'rounded-full bg-orange-100 text-orange-800' : 'rounded-full bg-emerald-100 text-emerald-800'}>
                {summary.transfers.length ? 'À équilibrer' : 'Équilibré'}
              </Badge>
            </div>
            <div className="flex flex-col gap-1 rounded-xl bg-brand p-5 text-white">
              <span className="text-xs font-bold tracking-wider uppercase opacity-85">Total cumulé engagé</span>
              <span className="flex items-baseline gap-2">
                <strong className="text-3xl tracking-tight">{formatMoney(summary.total, group.currency)}</strong>
                <Badge className="rounded-full border-0 bg-white/20 text-white">
                  {summary.count} dépense{summary.count > 1 ? 's' : ''}
                </Badge>
              </span>
              <span className="mt-2 flex justify-between border-t border-white/20 pt-2 text-sm opacity-90">
                Moyenne / participant
                <strong>{formatMoney(summary.total / Math.max(ids.length, 1), group.currency)}</strong>
              </span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-muted/70 p-4">
              <span className="flex flex-col">
                <span className="font-semibold">Remboursements en cours</span>
                <span className="text-xs text-muted-foreground">
                  {summary.transfers.length} virement{summary.transfers.length > 1 ? 's' : ''} en attente
                </span>
              </span>
              <strong className="text-lg text-negative">
                {formatMoney(summary.transfers.reduce((s, t) => s + t.amount, 0), group.currency)}
              </strong>
            </div>
            <Button asChild variant="secondary" className="rounded-full">
              <Link to={`/g/${groupId}`}>
                Voir les dépenses <ChevronRight />
              </Link>
            </Button>
          </Card>

          <Card className="gap-4 border-0 bg-destructive/5 p-5 shadow-none">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-destructive">
              <TriangleAlert className="size-5" /> Zone de danger
            </h2>
            {group.createdBy !== user.uid && Math.abs(summary.balance) > 0.005 && (
              <p className="flex gap-2 rounded-xl bg-card p-3 text-sm text-muted-foreground">
                <Info className="size-4 shrink-0 text-destructive" />
                Ton solde n'est pas à zéro ({formatMoney(summary.balance, group.currency)}). Règle-le avant de partir.
              </p>
            )}
            {/* The creator can't leave, otherwise nobody could ever delete the group. */}
            {group.createdBy === user.uid ? (
              <DeleteGroupButton group={group} count={entries.length} />
            ) : (
              <Button variant="outline" className="rounded-full border-destructive/30 bg-card text-destructive hover:text-destructive" onClick={leave}>
                <LogOut /> Quitter le groupe
              </Button>
            )}
          </Card>
        </div>
      </div>
    </Page>
  )
}
