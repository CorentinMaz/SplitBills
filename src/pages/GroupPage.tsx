import { Settings, UserPlus, Wallet } from 'lucide-react'
import { toast } from 'sonner'
import { Link, Navigate, Outlet, useParams } from 'react-router-dom'
import { useUser } from '@/auth'
import ExpenseRow from '@/components/ExpenseRow'
import { Fab, Loading, Money, Page } from '@/components/Page'
import PageHeader from '@/components/PageHeader'
import UserAvatar, { AvatarStack } from '@/components/UserAvatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { addPayment, deleteEntry, useEntries } from '@/data/entries'
import { useGroup } from '@/data/groups'
import { computeBalances, settleUp } from '@/lib/balance'
import { shareInvite } from '@/lib/invite'
import { formatMoney, today } from '@/lib/money'
import { nameIn } from '@/lib/names'
import { cn } from '@/lib/utils'
import type { Entry, Group } from '@/types'

export type GroupOutlet = { group: Group; entries: Entry[] }

export default function GroupPage() {
  const { groupId = '' } = useParams()
  const user = useUser()
  const group = useGroup(groupId)
  const entries = useEntries(groupId)

  if (group === null) return <Navigate to="/groups" replace />
  if (!group || !entries) return <Loading />

  const me = user.uid
  const name = nameIn(group, me)
  const money = (n: number) => formatMoney(n, group.currency)
  const balances = computeBalances(group.memberIds, entries)
  const transfers = settleUp(balances)
  const mine = balances[me] ?? 0
  const ordered = [
    ...transfers.filter((t) => t.from === me || t.to === me),
    ...transfers.filter((t) => t.from !== me && t.to !== me),
  ]

  async function settleAll() {
    if (!confirm(`Enregistrer ${transfers.length} remboursement${transfers.length > 1 ? 's' : ''}?`)) return
    await Promise.all(
      transfers.map((t) => addPayment(groupId, { amount: t.amount, paidBy: t.from, to: t.to, date: today(), createdBy: me })),
    )
    toast.success('Dettes soldées')
  }

  return (
    <Page>
      <PageHeader
        back="/groups"
        actions={
          <>
            <Button
              size="icon"
              variant="secondary"
              className="rounded-full"
              aria-label="Inviter"
              onClick={() => shareInvite(group).then((copied) => copied && toast.success("Lien d'invitation copié"))}
            >
              <UserPlus />
            </Button>
            <Button asChild size="icon" variant="secondary" className="rounded-full bg-muted text-foreground">
              <Link to="settings" aria-label="Réglages">
                <Settings />
              </Link>
            </Button>
          </>
        }
      />

      <div className="flex flex-col gap-5 md:grid md:grid-cols-[380px_minmax(0,1fr)] md:items-start md:gap-7">
        <div className="flex flex-col gap-5 md:sticky md:top-8">
          <section className="flex flex-col items-start gap-3 rounded-2xl bg-brand px-5 py-6 text-white shadow-xl shadow-teal-700/25">
            <Badge className="rounded-md border-0 bg-white/20 font-bold text-white">
              {group.memberIds.map((id) => `${group.members[id]?.share ?? 0} %`).join(' / ')}
            </Badge>
            <h1 className="text-[32px] leading-10 font-bold tracking-tight">{group.name}</h1>
            <AvatarStack
              people={group.memberIds.map((id) => ({ id, name: group.members[id]?.name }))}
              max={4}
              ring="ring-white/90"
              className="size-9"
            />
          </section>

          <Card className="gap-3.5 border-0 p-5 shadow-soft">
            <span className="text-muted-foreground">Ton solde total</span>
            <Money value={mine} currency={group.currency} className="text-[34px] font-bold tracking-tight" />
            {transfers.length > 0 && <Separator />}
            {ordered.map((t) => {
              const other = t.from === me ? t.to : t.from
              const text =
                t.to === me
                  ? `${name(t.from)} te doit`
                  : t.from === me
                    ? `Tu dois à ${name(t.to)}`
                    : `${name(t.from)} doit à ${name(t.to)}`
              return (
                <div key={`${t.from}-${t.to}`} className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2.5">
                    <UserAvatar id={other} name={group.members[other]?.name} className="size-7 text-[10px]" />
                    {text}
                  </span>
                  <strong className={cn(t.to === me && 'text-positive', t.from === me && 'text-negative')}>
                    {money(t.amount)}
                  </strong>
                </div>
              )
            })}
            {transfers.length > 0 ? (
              <Button variant="secondary" className="h-12 rounded-full text-base" onClick={settleAll}>
                <Wallet /> Solder les dettes
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">Tout le monde est quitte 🎉</p>
            )}
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <h2 className="text-2xl font-semibold">Dépenses</h2>
          {entries.length === 0 && <p className="py-8 text-center text-muted-foreground">Aucune dépense pour l'instant.</p>}
          <ul className="flex flex-col gap-3">
            {entries.map((e) => (
              <ExpenseRow
                key={e.id}
                entry={e}
                groupId={groupId}
                me={me}
                nameOf={name}
                currency={group.currency}
                onDeletePayment={() => confirm('Annuler ce remboursement?') && deleteEntry(groupId, e.id)}
              />
            ))}
          </ul>
        </div>
      </div>

      <Fab to="new" />
      {/* Expense dialog / drawer renders on top of the group page. */}
      <Outlet context={{ group, entries } satisfies GroupOutlet} />
    </Page>
  )
}
