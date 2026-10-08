import type { Group } from '../types'

/** Returns true when the link was copied (no native share sheet available). */
export async function shareInvite(group: Group) {
  const url = `${location.origin}/join/${group.id}`
  if (navigator.share) {
    await navigator.share({ title: 'SplitBills', text: `Rejoins « ${group.name} » sur SplitBills`, url }).catch(() => {})
    return false
  }
  await navigator.clipboard.writeText(url)
  return true
}
