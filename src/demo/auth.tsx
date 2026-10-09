import type { User } from 'firebase/auth'
import type { ReactNode } from 'react'
import { DEMO_UID } from './seed'

const user = {
  uid: DEMO_UID,
  displayName: 'Corentin',
  email: 'demo@splitbills.app',
  emailVerified: true,
  providerData: [],
  metadata: { creationTime: new Date(Date.now() - 60 * 864e5).toUTCString() },
} as unknown as User

export function AuthProvider({ children }: { children: ReactNode }) {
  return <>{children}</>
}

export function useAuth() {
  return { user: user as User | null, loading: false }
}

export function useUser() {
  return user
}

export function displayName(u: User) {
  return u.displayName || u.email?.split('@')[0] || 'Moi'
}
