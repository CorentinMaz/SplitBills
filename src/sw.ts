import { initializeApp } from 'firebase/app'
import { getMessaging, onBackgroundMessage } from 'firebase/messaging/sw'
import { clientsClaim } from 'workbox-core'
import { ExpirationPlugin } from 'workbox-expiration'
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { CacheFirst } from 'workbox-strategies'

declare let self: ServiceWorkerGlobalScope

// Same behaviour as the generated worker we had before: precache the build, serve index.html for every route.
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')))

// Tesseract data and Google Fonts load at runtime; cache them for offline use.
registerRoute(
  /^https:\/\/(cdn\.jsdelivr\.net|tessdata\.projectnaptha\.com|fonts\.googleapis\.com|fonts\.gstatic\.com)\//,
  new CacheFirst({ cacheName: 'cdn-assets', plugins: [new ExpirationPlugin({ maxEntries: 40 })] }),
)

// registerType: 'autoUpdate' expects the new worker to take over right away.
self.skipWaiting()
clientsClaim()

// Push: the Cloud Function sends data-only messages ({ title, body, url }); we draw the notification ourselves.
// Firebase only calls this when no app window is visible; an open app gets the message through onMessage instead.
if (import.meta.env.VITE_FIREBASE_PROJECT_ID) {
  const app = initializeApp({
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  })
  onBackgroundMessage(getMessaging(app), ({ data }) => {
    if (!data?.title) return
    return self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/pwa-192.png',
      badge: '/pwa-192.png',
      tag: data.tag,
      data: { url: data.url ?? '/' },
    })
  })
}

// Tapping a notification opens the group, reusing an app window when there is one.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = new URL(event.notification.data?.url ?? '/', self.location.origin).href
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      const open = windows[0]
      if (open) {
        await open.focus()
        return open.navigate(url)
      }
      return self.clients.openWindow(url)
    })(),
  )
})
