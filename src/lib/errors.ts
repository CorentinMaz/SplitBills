import { useSyncExternalStore } from 'react'

let current: string | null = null
const listeners = new Set<() => void>()

/** Surface Firebase errors instead of leaving the UI stuck on "Chargement…". */
export function reportError(e: unknown) {
  console.error(e)
  const code = (e as { code?: string }).code ?? ''
  const message = (e as { message?: string }).message ?? String(e)
  if (code === 'permission-denied') {
    current = 'Accès refusé par Firestore. Les règles de sécurité sont-elles déployées? (firebase deploy --only firestore:rules)'
  } else if (/database.*does not exist|NOT_FOUND/i.test(message)) {
    current = "La base Firestore n'existe pas. Crée-la dans la console Firebase."
  } else {
    current = `Erreur Firebase : ${message}`
  }
  listeners.forEach((l) => l())
}

export function clearError() {
  current = null
  listeners.forEach((l) => l())
}

export function useLastError() {
  return useSyncExternalStore(
    (l) => (listeners.add(l), () => listeners.delete(l)),
    () => current,
  )
}
