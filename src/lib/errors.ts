import { toast } from 'sonner'

/** Surface Firebase errors as a toast instead of leaving the UI stuck. */
export function reportError(e: unknown) {
  console.error(e)
  const code = (e as { code?: string }).code ?? ''
  const message = (e as { message?: string }).message ?? String(e)
  if (code === 'permission-denied') {
    toast.error('Accès refusé par Firestore', {
      description: 'Les règles sont-elles déployées? (firebase deploy --only firestore:rules)',
    })
  } else if (/database.*does not exist|NOT_FOUND/i.test(message)) {
    toast.error("La base Firestore n'existe pas", { description: 'Crée-la dans la console Firebase.' })
  } else {
    toast.error('Erreur Firebase', { description: message })
  }
}
