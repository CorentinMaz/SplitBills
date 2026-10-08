import { useSyncExternalStore } from 'react'

export type ThemePref = 'light' | 'dark' | null

const KEY = 'theme'
const media = window.matchMedia('(prefers-color-scheme: dark)')
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
  if (pref) document.documentElement.dataset.theme = pref
  else delete document.documentElement.dataset.theme
  const dark = pref ? pref === 'dark' : media.matches
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0b1117' : '#f7f9fb')
  listeners.forEach((l) => l())
}

apply()
media.addEventListener('change', apply)

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
    () => {
      const pref = read()
      return pref ? pref === 'dark' : media.matches
    },
  )
}
