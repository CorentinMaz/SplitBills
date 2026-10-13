// End-to-end test of notifications: a throwaway "Bot test" account joins a group, adds an expense
// and calls the notify worker, exactly like the app (same Firebase SDK calls).
// `--cleanup` removes the expense, takes the bot out of the group and deletes its account.
// Usage: node scripts/simulate-expense.mjs <groupId> [--cleanup]
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { initializeApp } from 'firebase/app'
import { createUserWithEmailAndPassword, deleteUser, getAuth, signInWithEmailAndPassword, updateProfile } from 'firebase/auth'
import { addDoc, arrayRemove, arrayUnion, collection, deleteDoc, deleteField, doc, getDoc, getFirestore, updateDoc } from 'firebase/firestore'

const ROOT = new URL('..', import.meta.url).pathname
const STATE = `${ROOT}.bot-test.json`
const env = Object.fromEntries(
  readFileSync(`${ROOT}.env`, 'utf8')
    .split('\n')
    .filter((l) => l.includes('=') && !l.startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=')
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')]
    }),
)

const [groupId, flag] = process.argv.slice(2)
if (!groupId) {
  console.error('Usage: node scripts/simulate-expense.mjs <groupId> [--cleanup]')
  process.exit(1)
}

const app = initializeApp({
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  appId: env.VITE_FIREBASE_APP_ID,
})
const auth = getAuth(app)
const db = getFirestore(app)
const groupRef = doc(db, 'groups', groupId)

if (flag === '--cleanup') {
  if (!existsSync(STATE)) throw new Error('Rien à nettoyer.')
  const bot = JSON.parse(readFileSync(STATE, 'utf8'))
  const { user } = await signInWithEmailAndPassword(auth, bot.email, bot.password)
  if (bot.entryId) {
    await deleteDoc(doc(groupRef, 'expenses', bot.entryId))
    console.log('dépense supprimée')
  }
  if (bot.joined) {
    await updateDoc(groupRef, { memberIds: arrayRemove(user.uid), [`members.${user.uid}`]: deleteField() })
    console.log('bot retiré du groupe')
  }
  await deleteUser(user)
  rmSync(STATE)
  console.log('compte du bot supprimé')
  process.exit(0)
}

if (existsSync(STATE)) throw new Error('Un bot existe déjà : lance --cleanup avant.')
const state = { email: `bot-test-${Date.now()}@example.com`, password: crypto.randomUUID() }
writeFileSync(STATE, JSON.stringify(state))
const { user } = await createUserWithEmailAndPassword(auth, state.email, state.password)
await updateProfile(user, { displayName: 'Bot test' })
console.log('bot créé')

// Same as joinGroup() in src/data/groups.ts.
await updateDoc(groupRef, {
  memberIds: arrayUnion(user.uid),
  [`members.${user.uid}`]: { name: 'Bot test', share: 0 },
})
state.joined = true
writeFileSync(STATE, JSON.stringify(state))
console.log('groupe rejoint')

const group = (await getDoc(groupRef)).data()
const shares = Object.fromEntries(Object.entries(group.members).map(([id, m]) => [id, m.share]))
const ref = await addDoc(collection(groupRef, 'expenses'), {
  kind: 'expense',
  title: 'Épicerie (test)',
  amount: 12.34,
  paidBy: user.uid,
  date: new Date().toLocaleDateString('en-CA'),
  shares,
  createdBy: user.uid,
  createdAt: Date.now(),
})
state.entryId = ref.id
writeFileSync(STATE, JSON.stringify(state))
console.log('dépense ajoutée')

const res = await fetch(env.VITE_NOTIFY_URL, {
  method: 'POST',
  headers: { Authorization: `Bearer ${await user.getIdToken()}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ groupId, entryId: ref.id }),
})
console.log(`worker : ${res.status} ${await res.text()}`)
process.exit(0)
