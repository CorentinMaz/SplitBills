import { Plus } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useUser } from '@/auth'
import { Loading, Page } from '@/components/Page'
import { AvatarStack } from '@/components/UserAvatar'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useAllEntries } from '@/data/entries'
import { createGroup, useGroups } from '@/data/groups'
import { computeBalances } from '@/lib/balance'
import { reportError } from '@/lib/errors'
import { formatMoney } from '@/lib/money'
import { cn } from '@/lib/utils'

const HEADERS = ['bg-teal-600', 'bg-blue-600', 'bg-violet-600', 'bg-orange-500', 'bg-pink-600', 'bg-indigo-600']

export default function Groups() {
  const user = useUser()
  const groups = useGroups(user.uid)
  const byGroup = useAllEntries(groups)
  const navigate = useNavigate()
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')

  async function create() {
    if (!name.trim()) return
    try {
      const id = await createGroup(user, name.trim())
      navigate(`/g/${id}/settings`)
    } catch (e) {
      reportError(e)
    }
  }

  return (
    <Page>
      <div className="flex flex-col gap-4 pt-6 md:flex-row md:items-center md:justify-between md:pt-0">
        <h1 className="text-[32px] font-bold tracking-tight text-primary">Groupes</h1>
        {creating ? (
          <form
            className="flex gap-2 md:w-96"
            onSubmit={(e) => {
              e.preventDefault()
              create()
            }}
          >
            <Input autoFocus placeholder="Nom du groupe (ex. Appart)" value={name} onChange={(e) => setName(e.target.value)} className="h-11 rounded-full px-4" />
            <Button className="h-11 rounded-full px-5">Créer</Button>
          </form>
        ) : (
          <Button
            className="h-14 rounded-full bg-brand text-base shadow-lg shadow-teal-700/30 md:h-11 md:px-6"
            onClick={() => setCreating(true)}
          >
            <Plus /> Nouveau groupe
          </Button>
        )}
      </div>

      {groups === null ? (
        <Loading />
      ) : groups.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">Aucun groupe. Crée-en un, puis invite ta blonde ou tes colocs.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3.5 md:grid-cols-[repeat(auto-fill,minmax(220px,1fr))] md:gap-5">
          {groups.map((g, i) => {
            const entries = byGroup?.[g.id]
            const bal = entries ? (computeBalances(g.memberIds, entries)[user.uid] ?? 0) : 0
            return (
              <Link key={g.id} to={`/g/${g.id}`} className="group">
                <Card className="h-full gap-0 overflow-hidden border-0 py-0 shadow-soft transition group-hover:-translate-y-0.5 group-hover:shadow-md">
                  <div className={cn('bg-dots h-16', HEADERS[i % HEADERS.length])} />
                  <div className="-mt-5 px-4">
                    <AvatarStack people={g.memberIds.map((id) => ({ id, name: g.members[id]?.name }))} className="size-9" />
                  </div>
                  <div className="flex min-w-0 flex-col gap-0.5 px-4 pt-2.5 pb-3">
                    <span className="truncate text-lg font-semibold">{g.name}</span>
                    <span className="text-sm text-muted-foreground">
                      {g.memberIds.length} membre{g.memberIds.length > 1 ? 's' : ''}
                    </span>
                  </div>
                  <div
                    className={cn(
                      'mx-4 mt-auto border-t py-3 text-[13px] font-bold text-muted-foreground',
                      bal > 0.005 && 'text-positive',
                      bal < -0.005 && 'text-negative',
                    )}
                  >
                    {!entries
                      ? '…'
                      : bal > 0.005
                        ? `On te doit ${formatMoney(bal, g.currency)}`
                        : bal < -0.005
                          ? `Tu dois ${formatMoney(-bal, g.currency)}`
                          : 'Tout est réglé'}
                  </div>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </Page>
  )
}
