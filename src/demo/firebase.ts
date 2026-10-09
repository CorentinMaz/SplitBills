import type { Auth } from 'firebase/auth'
import type { Firestore } from 'firebase/firestore'

// Demo mode never talks to Firebase; pages that call it directly get a harmless error toast.
export const auth = {} as Auth
export const db = {} as Firestore
