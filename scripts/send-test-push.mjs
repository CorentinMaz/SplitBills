// Sends a sample notification to every device that turned notifications on, to check the design.
// Usage: node scripts/send-test-push.mjs <project-id> <google-account>
import { execSync } from 'node:child_process'

const [project, account] = process.argv.slice(2)
if (!project || !account) {
  console.error('Usage: node scripts/send-test-push.mjs <project-id> <google-account>')
  process.exit(1)
}
const token = execSync(`gcloud auth print-access-token --account=${account}`).toString().trim()
const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'x-goog-user-project': project }

const res = await fetch(`https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents:runQuery`, {
  method: 'POST',
  headers,
  body: JSON.stringify({ structuredQuery: { from: [{ collectionId: 'pushTokens', allDescendants: true }] } }),
})
if (!res.ok) throw new Error(await res.text())
const devices = (await res.json()).filter((r) => r.document)
console.log(`${devices.length} appareil(s)`)

for (const { document } of devices) {
  const sent = await fetch(`https://fcm.googleapis.com/v1/projects/${project}/messages:send`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      message: {
        token: document.name.split('/').pop(),
        data: {
          title: 'Appart',
          body: 'Alex a ajouté « Épicerie IGA » · 84,20 $\nTa part : 25,26 $',
          url: '/',
          tag: `test-${Date.now()}`,
        },
        webpush: { headers: { Urgency: 'high' } },
      },
    }),
  })
  console.log(sent.status, await sent.text())
}
