import { onAuthStateChanged, type User } from 'firebase/auth'
import { doc, setDoc } from 'firebase/firestore'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { auth, db } from './firebase'

type AuthState = { user: User | null; loading: boolean }

const AuthContext = createContext<AuthState>({ user: null, loading: true })

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, loading: true })

  useEffect(
    () =>
      onAuthStateChanged(auth, (user) => {
        setState({ user, loading: false })
        if (user) {
          setDoc(
            doc(db, 'users', user.uid),
            { name: displayName(user), email: user.email },
            { merge: true },
          )
        }
      }),
    [],
  )

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}

/** Only usable under a route that requires auth. */
export function useUser() {
  const { user } = useAuth()
  if (!user) throw new Error('useUser called without a signed-in user')
  return user
}

export function displayName(user: User) {
  return user.displayName || user.email?.split('@')[0] || 'Moi'
}
