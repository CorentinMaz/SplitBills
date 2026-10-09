import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
} from 'firebase/auth'
import { ArrowRight, Camera, House, Lock, type LucideIcon, Mail, Percent, ShoppingCart, User, Users } from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/auth'
import { BrandMark } from '@/components/AppLayout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { auth } from '@/firebase'

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
    <main className="mx-auto grid min-h-dvh w-full max-w-6xl items-center gap-8 px-5 py-10 md:grid-cols-[1.1fr_1fr] md:px-10">
      {/* Desktop marketing panel. */}
      <section className="relative hidden flex-col justify-center gap-7 overflow-hidden rounded-3xl bg-muted/70 p-10 md:flex xl:p-12">
        <span className="absolute -top-24 -right-24 size-96 rounded-full bg-secondary/80" />
        <div className="relative flex items-center gap-3">
          <BrandMark />
          <span className="text-2xl font-bold tracking-tight text-primary">SplitBills</span>
        </div>
        <div className="relative flex flex-col gap-4">
          <span className="text-xs font-bold tracking-wider text-primary uppercase">Partage au prorata des revenus</span>
          <h1 className="text-4xl leading-tight font-bold tracking-tight">Partagez vos dépenses en toute sérénité.</h1>
          <p className="text-lg text-muted-foreground">
            En couple, entre colocs ou en voyage : chacun paie sa juste part, même quand vos revenus sont différents.
          </p>
        </div>
        <Card className="relative gap-3 border-0 p-5 shadow-soft">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-full bg-brand text-white">
                <Users className="size-5" />
              </span>
              <span className="flex flex-col">
                <span className="font-semibold">Exemple : l'appart</span>
                <span className="text-sm text-muted-foreground">Répartition 70 % / 30 %</span>
              </span>
            </span>
            <Badge className="rounded-full bg-emerald-100 text-emerald-800">Aperçu</Badge>
          </div>
          {[
            { icon: ShoppingCart, title: 'Épicerie', amount: '100,00 $', part: 'Part de Léa : 30,00 $' },
            { icon: House, title: 'Loyer', amount: '1 400,00 $', part: 'Part de Léa : 420,00 $' },
          ].map((r) => (
            <div key={r.title} className="flex items-center gap-3 rounded-xl bg-muted/70 p-3">
              <span className="grid size-9 place-items-center rounded-full bg-secondary text-secondary-foreground">
                <r.icon className="size-4" />
              </span>
              <span className="flex-1 font-semibold">{r.title}</span>
              <span className="flex flex-col items-end">
                <strong>{r.amount}</strong>
                <span className="text-xs font-semibold text-primary">{r.part}</span>
              </span>
            </div>
          ))}
        </Card>
        <div className="relative grid grid-cols-2 gap-4">
          {[
            { icon: Percent, title: 'Au prorata', text: '70 / 30 ou ce que vous voulez' },
            { icon: Camera, title: 'Scan de tickets', text: 'Le total est lu sur la photo' },
          ].map((f) => (
            <div key={f.title} className="flex flex-col gap-1 rounded-xl bg-card/80 p-4">
              <span className="flex items-center gap-2 text-lg font-bold text-primary">
                <f.icon className="size-5" /> {f.title}
              </span>
              <span className="text-sm text-muted-foreground">{f.text}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="flex flex-col gap-6">
        <div className="flex flex-col items-center gap-1.5 text-center md:hidden">
          <BrandMark className="mb-3 size-17 rounded-2xl [&_svg]:size-8" />
          <span className="text-[34px] font-bold tracking-tight text-primary">SplitBills</span>
          <p className="text-muted-foreground">Partagez vos dépenses au prorata de vos revenus.</p>
        </div>

        <Card className="gap-6 border-0 p-6 shadow-soft md:p-10">
          <div className="flex flex-col gap-1">
            <h2 className="text-2xl font-semibold">{mode === 'login' ? 'Bon retour!' : 'Bienvenue'}</h2>
            <p className="text-muted-foreground">
              {mode === 'login' ? 'Connecte-toi à ton espace SplitBills.' : 'Crée ton compte en quelques secondes.'}
            </p>
          </div>

          <Button
            type="button"
            variant="secondary"
            className="h-13 rounded-full bg-muted text-base text-foreground"
            disabled={busy}
            onClick={() => run(() => signInWithPopup(auth, new GoogleAuthProvider()))}
          >
          <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
            <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
            <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
            <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
            <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
          </svg>
            Continuer avec Google
          </Button>

          <div className="flex items-center gap-3.5 text-xs font-bold tracking-wider text-muted-foreground uppercase">
            <Separator className="flex-1" />
            ou avec ton courriel
            <Separator className="flex-1" />
          </div>

          <form className="flex flex-col gap-4" onSubmit={submit}>
            {mode === 'signup' && (
              <Field id="name" label="Prénom" icon={User}>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required autoComplete="given-name" className="h-12 rounded-xl border-0 bg-muted pl-10" />
              </Field>
            )}
            <Field id="email" label="Courriel" icon={Mail}>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="toi@exemple.com"
                required
                autoComplete="email"
                className="h-12 rounded-xl border-0 bg-muted pl-10"
              />
            </Field>
            <Field id="password" label="Mot de passe" icon={Lock}>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                className="h-12 rounded-xl border-0 bg-muted pl-10"
              />
            </Field>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button variant="brand" className="mt-1 h-14 rounded-full text-base" disabled={busy}>
              {mode === 'login' ? 'Se connecter' : 'Créer mon compte'} <ArrowRight />
            </Button>
          </form>

          <p className="text-center text-muted-foreground">
            {mode === 'login' ? 'Pas encore de compte?' : 'Déjà un compte?'}{' '}
            <Button variant="link" className="h-auto p-0 font-semibold" onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}>
              {mode === 'login' ? "S'inscrire gratuitement" : 'Se connecter'}
            </Button>
          </p>
        </Card>
      </div>
    </main>
  )
}

function Field({ id, label, icon: Icon, children }: { id: string; label: string; icon: LucideIcon; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id} className="text-muted-foreground">
        {label}
      </Label>
      <div className="relative">
        <Icon className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
        {children}
      </div>
    </div>
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
