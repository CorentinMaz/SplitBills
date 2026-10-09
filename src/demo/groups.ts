import type { User } from 'firebase/auth'
import type { Group, Member } from '@/types'
import { displayName } from './auth'
import { newId, update, useStore } from './store'

export function useGroups(uid: string): Group[] | null {
  return useStore((s) => s.groups.filter((g) => g.memberIds.includes(uid)))
}

export function useGroup(groupId: string): Group | null | undefined {
  return useStore((s) => s.groups.find((g) => g.id === groupId) ?? null)
}

export async function createGroup(user: User, name: string) {
  const id = newId()
  update((s) => ({
    groups: [
      ...s.groups,
      {
        id,
        name,
        currency: 'CAD',
        createdBy: user.uid,
        memberIds: [user.uid],
        members: { [user.uid]: { name: displayName(user), share: 100 } },
      },
    ],
    entries: { ...s.entries, [id]: [] },
  }))
  return id
}

export async function joinGroup(user: User, groupId: string) {
  void user
  void groupId
}

export async function updateGroup(groupId: string, data: { name: string; members: Record<string, Member> }) {
  update((s) => ({ ...s, groups: s.groups.map((g) => (g.id === groupId ? { ...g, ...data } : g)) }))
}

export async function leaveGroup(group: Group, uid: string) {
  update((s) => ({
    ...s,
    groups: s.groups.map((g) => (g.id === group.id ? { ...g, memberIds: g.memberIds.filter((id) => id !== uid) } : g)),
  }))
}
