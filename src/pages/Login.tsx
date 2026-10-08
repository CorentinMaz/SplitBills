import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
} from 'firebase/auth'
import { useState, type FormEvent } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../auth'
import { auth } from '../firebase'

export default function Login() {
  const { user } = useAuth()
  const location = useLocation()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (user) return <Navigate to={(location.state as { from?: string } | null)?.from ?? '/'} replace />

  async function run(fn: () => Promise<unknown>) {
    setBusy(true)
    setError(null)
    try {
      await fn()
    } catch (e) {
      setError(messageFor(e))
    } finally {
      setBusy(false)
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    run(async () => {
      if (mode === 'login') {
        await signInWithEmailAndPassword(auth, email, password)
      } else {
        const cred = await createUserWithEmailAndPassword(auth, email, password)
        await updateProfile(cred.user, { displayName: name })
      }
    })
  }

  return (
    <main className="page narrow">
      <div className="hero">
        <img src="/favicon.svg" alt="" width={72} height={72} />
        <h1>SplitBills</h1>
        <p className="muted">Partagez vos dépenses au prorata de vos revenus.</p>
      </div>

      <form className="card stack" onSubmit={submit}>
        {mode === 'signup' && (
          <label>
            Prénom
            <input value={name} onChange={(e) => setName(e.target.value)} required autoComplete="given-name" />
          </label>
        )}
        <label>
          Courriel
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </label>
        <label>
          Mot de passe
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          />
        </label>
        {error && <p className="error">{error}</p>}
        <button className="btn primary" disabled={busy}>
          {mode === 'login' ? 'Se connecter' : 'Créer mon compte'}
        </button>
        <button
          type="button"
          className="btn"
          disabled={busy}
          onClick={() => run(() => signInWithPopup(auth, new GoogleAuthProvider()))}
        >
          Continuer avec Google
        </button>
      </form>

      <p className="center">
        <button className="link" onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}>
          {mode === 'login' ? 'Pas de compte? Inscris-toi' : 'Déjà un compte? Connecte-toi'}
        </button>
      </p>
    </main>
  )
}

function messageFor(e: unknown) {
  const code = (e as { code?: string }).code ?? ''
  if (code.includes('invalid-credential') || code.includes('wrong-password')) return 'Courriel ou mot de passe invalide.'
  if (code.includes('email-already-in-use')) return 'Ce courriel a déjà un compte.'
  if (code.includes('weak-password')) return 'Mot de passe trop faible (6 caractères min).'
  if (code.includes('popup-closed')) return 'Connexion annulée.'
  return 'Une erreur est survenue. Réessaie.'
}
