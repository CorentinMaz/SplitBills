import { useSyncExternalStore } from 'react'

export type ThemePref = 'light' | 'dark' | null

const KEY = 'theme'
const listeners = new Set<() => void>()

function read(): ThemePref {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'light' || v === 'dark' ? v : null
  } catch {
    return null
  }
}

function apply() {
  const pref = read()
  // Light unless the user picked dark in the profile; the system setting is ignored.
  const dark = pref === 'dark'
  document.documentElement.dataset.theme = dark ? 'dark' : 'light'
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0b1117' : '#f7f9fb')
  listeners.forEach((l) => l())
}

apply()

export function setTheme(pref: ThemePref) {
  try {
    if (pref) localStorage.setItem(KEY, pref)
    else localStorage.removeItem(KEY)
  } catch {
    // Storage blocked: the choice just won't survive a reload.
  }
  apply()
}

export function useIsDark() {
  return useSyncExternalStore(
    (l) => (listeners.add(l), () => listeners.delete(l)),
    () => read() === 'dark',
  )
}
