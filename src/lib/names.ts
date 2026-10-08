import type { Group } from '../types'

export function nameIn(group: Group, me: string) {
  return (uid: string) => (uid === me ? 'Toi' : (group.members[uid]?.name ?? 'Ancien membre'))
}
