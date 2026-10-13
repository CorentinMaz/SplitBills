import { createRemoteJWKSet, importPKCS8, jwtVerify, SignJWT } from 'jose'

/**
 * Sends push notifications for SplitBills. The app calls POST / with { groupId, entryId } right after
 * adding an expense or a payment, authenticated with the user's Firebase ID token. We check that the
 * caller created that entry a moment ago and hasn't notified it yet, then send to the other members' devices.
 *
 * Runs on the Cloudflare free plan so the Firebase project can stay on Spark: nothing here can bill.
 */

type Env = {
  FIREBASE_PROJECT_ID: string
  ALLOWED_ORIGINS: string
  FIREBASE_SERVICE_ACCOUNT: string
}

type Group = { name: string; currency: string; memberIds: string[]; members: Record<string, { name: string }> }
type Entry =
  | { kind: 'expense'; title: string; amount: number; shares: Record<string, number>; createdBy: string; notifiedAt?: number }
  | { kind: 'payment'; amount: number; paidBy: string; to: string; createdBy: string; notifiedAt?: number }

// Entries older than this can't trigger a notification, so old ones can't be replayed.
const MAX_AGE_MS = 5 * 60_000

const ID_TOKEN_KEYS = createRemoteJWKSet(
  new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'),
)

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get('Origin') ?? ''
    const cors: Record<string, string> = env.ALLOWED_ORIGINS.split(',').includes(origin)
      ? {
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Methods': 'POST',
          'Access-Control-Allow-Headers': 'Authorization, Content-Type',
          Vary: 'Origin',
        }
      : {}
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
    if (request.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: cors })

    try {
      const status = await notify(request, env)
      return new Response(null, { status, headers: cors })
    } catch (e) {
      console.error(e)
      return new Response('Internal error', { status: 500, headers: cors })
    }
  },
} satisfies ExportedHandler<Env>

async function notify(request: Request, env: Env): Promise<number> {
  const pid = env.FIREBASE_PROJECT_ID
  const idToken = request.headers.get('Authorization')?.replace(/^Bearer /, '')
  if (!idToken) return 401
  let uid: string
  try {
    const { payload } = await jwtVerify(idToken, ID_TOKEN_KEYS, { issuer: `https://securetoken.google.com/${pid}`, audience: pid })
    uid = payload.sub!
  } catch {
    return 401
  }

  const { groupId, entryId } = (await request.json().catch(() => ({}))) as { groupId?: unknown; entryId?: unknown }
  if (typeof groupId !== 'string' || typeof entryId !== 'string' || /[/]/.test(groupId + entryId)) return 400

  const fs = await firestore(env)
  const entryDoc = await fs.get(`groups/${groupId}/expenses/${entryId}`)
  if (!entryDoc) return 404
  const entry = decodeFields(entryDoc.fields) as Entry
  if (entry.createdBy !== uid) return 403
  if (entry.notifiedAt || Date.now() - Date.parse(entryDoc.createTime) > MAX_AGE_MS) return 409

  const groupDoc = await fs.get(`groups/${groupId}`)
  if (!groupDoc) return 404
  const group = decodeFields(groupDoc.fields) as Group
  if (!group.memberIds.includes(uid)) return 403

  // Claim the entry first; the update-time precondition makes a concurrent second call fail here.
  if (!(await fs.markNotified(entryDoc))) return 409

  const money = (n: number) => new Intl.NumberFormat('fr-CA', { style: 'currency', currency: group.currency }).format(n)
  const nameOf = (id: string, me: string) => (id === me ? 'toi' : (group.members[id]?.name ?? "Quelqu'un"))

  const sends: Promise<void>[] = []
  for (const member of group.memberIds.filter((id) => id !== uid)) {
    let body: string
    if (entry.kind === 'expense') {
      const total = Object.values(entry.shares).reduce((a, b) => a + b, 0) || 100
      const mine = (entry.amount * (entry.shares[member] ?? 0)) / total
      body = `${nameOf(uid, member)} a ajouté « ${entry.title} » · ${money(entry.amount)}`
      if (mine > 0) body += `\nTa part : ${money(mine)}`
    } else {
      body = `${nameOf(entry.paidBy, member)} a remboursé ${money(entry.amount)} à ${nameOf(entry.to, member)}`
    }
    const data = { title: group.name, body, url: `/g/${groupId}`, tag: entryId }
    for (const tokenPath of await fs.list(`users/${member}/pushTokens`)) {
      sends.push(fs.send(tokenPath, data))
    }
  }
  await Promise.all(sends)
  return 204
}

// --- Google APIs over REST, as the Firebase Admin SDK service account ---

let cachedToken: { value: string; expires: number } | undefined

async function accessToken(env: Env) {
  if (cachedToken && cachedToken.expires > Date.now() + 60_000) return cachedToken.value
  const sa = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT) as { client_email: string; private_key: string }
  const assertion = await new SignJWT({
    scope: 'https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/firebase.messaging',
  })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setIssuer(sa.client_email)
    .setAudience('https://oauth2.googleapis.com/token')
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(await importPKCS8(sa.private_key, 'RS256'))
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
  })
  if (!res.ok) throw new Error(`OAuth token: ${res.status} ${await res.text()}`)
  const { access_token, expires_in } = (await res.json()) as { access_token: string; expires_in: number }
  cachedToken = { value: access_token, expires: Date.now() + expires_in * 1000 }
  return access_token
}

type FsDoc = { name: string; fields: Record<string, FsValue>; createTime: string; updateTime: string }

async function firestore(env: Env) {
  const pid = env.FIREBASE_PROJECT_ID
  const root = `https://firestore.googleapis.com/v1/projects/${pid}/databases/(default)/documents`
  const headers = { Authorization: `Bearer ${await accessToken(env)}`, 'Content-Type': 'application/json' }

  return {
    async get(path: string): Promise<FsDoc | null> {
      const res = await fetch(`${root}/${path}`, { headers })
      if (res.status === 404) return null
      if (!res.ok) throw new Error(`Firestore get ${path}: ${res.status} ${await res.text()}`)
      return res.json()
    },

    /** Document paths (relative to `documents/`) in a collection. A user has a handful of devices at most. */
    async list(path: string): Promise<string[]> {
      const res = await fetch(`${root}/${path}?pageSize=100&mask.fieldPaths=__name__`, { headers })
      if (!res.ok) throw new Error(`Firestore list ${path}: ${res.status} ${await res.text()}`)
      const { documents = [] } = (await res.json()) as { documents?: { name: string }[] }
      return documents.map((d) => d.name.split('/documents/')[1])
    },

    async markNotified(doc: FsDoc): Promise<boolean> {
      const url = `https://firestore.googleapis.com/v1/${doc.name}?updateMask.fieldPaths=notifiedAt&currentDocument.updateTime=${encodeURIComponent(doc.updateTime)}`
      const res = await fetch(url, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ fields: { notifiedAt: { integerValue: String(Date.now()) } } }),
      })
      if (res.status === 400 || res.status === 409 || res.status === 412) return false
      if (!res.ok) throw new Error(`Firestore patch: ${res.status} ${await res.text()}`)
      return true
    },

    /** Sends a data-only message (the service worker draws it) and forgets devices FCM no longer knows. */
    async send(tokenPath: string, data: Record<string, string>) {
      const token = tokenPath.split('/').pop()!
      const res = await fetch(`https://fcm.googleapis.com/v1/projects/${pid}/messages:send`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ message: { token, data, webpush: { headers: { Urgency: 'high' } } } }),
      })
      if (res.ok) return
      const text = await res.text()
      if (res.status === 404 || text.includes('UNREGISTERED')) {
        await fetch(`${root}/${tokenPath}`, { method: 'DELETE', headers })
      } else {
        console.error(`FCM send: ${res.status} ${text}`)
      }
    },
  }
}

type FsValue =
  | { stringValue: string }
  | { integerValue: string }
  | { doubleValue: number }
  | { booleanValue: boolean }
  | { nullValue: null }
  | { timestampValue: string }
  | { mapValue: { fields?: Record<string, FsValue> } }
  | { arrayValue: { values?: FsValue[] } }

function decode(v: FsValue): unknown {
  if ('stringValue' in v) return v.stringValue
  if ('integerValue' in v) return Number(v.integerValue)
  if ('doubleValue' in v) return v.doubleValue
  if ('booleanValue' in v) return v.booleanValue
  if ('timestampValue' in v) return v.timestampValue
  if ('mapValue' in v) return decodeFields(v.mapValue.fields)
  if ('arrayValue' in v) return (v.arrayValue.values ?? []).map(decode)
  return null
}

function decodeFields(fields: Record<string, FsValue> = {}) {
  return Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, decode(v)]))
}
