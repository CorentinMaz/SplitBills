import type { User } from 'firebase/auth'
import {
  addDoc,
  arrayUnion,
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDocs,
  onSnapshot,
  query,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { displayName } from '../auth'
import { reportError } from '@/lib/errors'
import { db } from '../firebase'
import type { Group, Member } from '../types'

export function useGroups(uid: string) {
  const [groups, setGroups] = useState<Group[] | null>(null)
  useEffect(
    () =>
      onSnapshot(
        query(collection(db, 'groups'), where('memberIds', 'array-contains', uid)),
        (snap) => setGroups(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Group)),
        (e) => {
          reportError(e)
          setGroups([])
        },
      ),
    [uid],
  )
  return groups
}

export function useGroup(groupId: string) {
  const [group, setGroup] = useState<Group | null | undefined>(undefined)
  useEffect(
    () =>
      onSnapshot(
        doc(db, 'groups', groupId),
        (snap) => setGroup(snap.exists() ? ({ id: snap.id, ...snap.data() } as Group) : null),
        () => setGroup(null),
      ),
    [groupId],
  )
  return group
}

export async function createGroup(user: User, name: string) {
  const ref = await addDoc(collection(db, 'groups'), {
    name,
    currency: 'CAD',
    createdBy: user.uid,
    memberIds: [user.uid],
    members: { [user.uid]: { name: displayName(user), share: 100 } satisfies Member },
  })
  return ref.id
}

export async function joinGroup(user: User, groupId: string) {
  // New members start at 0 % so existing ratios stay valid until someone edits them.
  await updateDoc(doc(db, 'groups', groupId), {
    memberIds: arrayUnion(user.uid),
    [`members.${user.uid}`]: { name: displayName(user), share: 0 } satisfies Member,
  })
}

export async function updateGroup(groupId: string, data: { name: string; members: Record<string, Member> }) {
  await updateDoc(doc(db, 'groups', groupId), data)
}

export async function leaveGroup(group: Group, uid: string) {
  await updateDoc(doc(db, 'groups', group.id), {
    memberIds: group.memberIds.filter((id) => id !== uid),
    [`members.${uid}`]: deleteField(),
  })
}

/**
 * Deletes the group and all its expenses. Firestore doesn't cascade to subcollections,
 * so expenses go first (in batches of 500), then the group itself. Rules only let the creator do this.
 */
export async function deleteGroup(group: Group) {
  const expenses = await getDocs(collection(db, 'groups', group.id, 'expenses'))
  for (let i = 0; i < expenses.docs.length; i += 500) {
    const batch = writeBatch(db)
    expenses.docs.slice(i, i + 500).forEach((d) => batch.delete(d.ref))
    await batch.commit()
  }
  await deleteDoc(doc(db, 'groups', group.id))
}
