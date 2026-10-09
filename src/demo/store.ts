import { useSyncExternalStore } from 'react'
import type { Entry, Group } from '@/types'
import { seedEntries, seedGroups } from './seed'

/** In-memory database for `npm run demo`: same shapes as Firestore, nothing leaves the browser. */
type State = { groups: Group[]; entries: Record<string, Entry[]> }

let state: State = { groups: seedGroups(), entries: seedEntries() }
const listeners = new Set<() => void>()
let nextId = 1000

export function update(fn: (s: State) => State) {
  state = fn(state)
  listeners.forEach((l) => l())
}

export function newId() {
  return `demo-${nextId++}`
}

function subscribe(l: () => void) {
  listeners.add(l)
  return () => listeners.delete(l)
}

/** Subscribes to the whole state (a stable snapshot) and derives from it on render. */
export function useStore<T>(select: (s: State) => T) {
  return select(useSyncExternalStore(subscribe, () => state))
}

export function getState() {
  return state
}
