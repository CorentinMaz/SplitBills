import { Users } from 'lucide-react'
import { useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { useUser } from '@/auth'
import { Button } from '@/components/ui/button'
import { joinGroup, useGroup } from '@/data/groups'

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
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-6 px-5 py-10 text-center">
      <div className="flex flex-col items-center gap-2">
        <span className="mb-3 grid size-17 place-items-center rounded-2xl bg-brand text-white shadow-lg">
          <Users className="size-8" />
        </span>
        <h1 className="text-2xl font-semibold">Invitation</h1>
        <p className="text-muted-foreground">On t'a invité·e à partager des dépenses dans un groupe SplitBills.</p>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button className="h-14 rounded-full bg-brand text-base" onClick={join}>
        Rejoindre le groupe
      </Button>
    </main>
  )
}
