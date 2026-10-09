import { Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { deleteGroup } from '@/data/groups'
import { reportError } from '@/lib/errors'
import type { Group } from '@/types'

/** Creator-only. Asks to type the group name, since this erases every expense for every member. */
export default function DeleteGroupButton({ group, count }: { group: Group; count: number }) {
  const navigate = useNavigate()
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)

  async function confirmDelete() {
    setBusy(true)
    try {
      await deleteGroup(group)
      toast.success(`« ${group.name} » a été supprimé`)
      navigate('/groups', { replace: true })
    } catch (e) {
      reportError(e)
      setBusy(false)
    }
  }

  return (
    <AlertDialog onOpenChange={(open) => !open && setTyped('')}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" className="rounded-full">
          <Trash2 /> Supprimer le groupe
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="rounded-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle>Supprimer « {group.name} » ?</AlertDialogTitle>
          <AlertDialogDescription>
            Le groupe et ses {count} dépense{count > 1 ? 's' : ''} seront effacés pour les {group.memberIds.length} membres. On ne
            peut pas revenir en arrière.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex flex-col gap-2">
          <span className="text-sm">
            Écris <strong>{group.name}</strong> pour confirmer :
          </span>
          <Input value={typed} onChange={(e) => setTyped(e.target.value)} autoFocus className="h-11 rounded-xl" />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel className="rounded-full">Annuler</AlertDialogCancel>
          <Button
            variant="destructive"
            className="rounded-full"
            disabled={typed.trim() !== group.name.trim() || busy}
            onClick={confirmDelete}
          >
            <Trash2 /> {busy ? 'Suppression…' : 'Supprimer définitivement'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
