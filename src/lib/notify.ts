import { auth } from '../firebase'

/**
 * Asks the notify worker (worker/) to push this new entry to the other members' phones.
 * Fire-and-forget: a missed notification must never get in the way of saving an expense.
 */
export function notifyMembers(groupId: string, entryId: string) {
  const url = import.meta.env.VITE_NOTIFY_URL
  const user = auth.currentUser
  if (!url || !user) return
  user
    .getIdToken()
    .then((token) =>
      fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId, entryId }),
      }),
    )
    .catch(console.error)
}
