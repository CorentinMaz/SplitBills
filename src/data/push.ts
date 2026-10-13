import { deleteDoc, doc, setDoc } from 'firebase/firestore'
import { deleteToken, getMessaging, getToken, isSupported, onMessage } from 'firebase/messaging'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { app, db } from '../firebase'
import { reportError } from '@/lib/errors'

/**
 * Push notifications through Firebase Cloud Messaging. Each device that opts in stores its token
 * under users/{uid}/pushTokens/{token}; the `notifyNewEntry` Cloud Function sends to those.
 */
export type PushStatus = 'loading' | 'unsupported' | 'needs-install' | 'denied' | 'off' | 'on'

// The token this device registered, so we can tell "on" apart from "permission granted for another account".
const TOKEN_KEY = 'push-token'

function storedToken() {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

function storeToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    // Private mode: the switch just won't remember it's on.
  }
}

// iOS only allows web push from the app added to the home screen.
const isIos = () => /iPhone|iPad|iPod/.test(navigator.userAgent)
const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches

async function currentStatus(): Promise<PushStatus> {
  if (!(await isSupported().catch(() => false))) return isIos() && !isStandalone() ? 'needs-install' : 'unsupported'
  if (Notification.permission === 'denied') return 'denied'
  return Notification.permission === 'granted' && storedToken() ? 'on' : 'off'
}

async function fetchToken() {
  const registration = await navigator.serviceWorker.getRegistration()
  if (!registration) throw new Error("Service worker absent : les notifications ne marchent qu'avec le build (npm run build).")
  return getToken(getMessaging(app), {
    vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
    serviceWorkerRegistration: registration,
  })
}

const tokenDoc = (uid: string, token: string) => doc(db, 'users', uid, 'pushTokens', token)

async function saveToken(uid: string, token: string) {
  await setDoc(tokenDoc(uid, token), { createdAt: Date.now(), userAgent: navigator.userAgent })
  storeToken(token)
}

/** Status of push on this device, with the actions behind the profile switch. */
export function usePush(uid: string) {
  const [status, setStatus] = useState<PushStatus>('loading')

  useEffect(() => {
    currentStatus().then(setStatus)
  }, [])

  const enable = useCallback(async () => {
    try {
      // Must run straight from the tap: iOS refuses permission prompts that aren't user-initiated.
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setStatus(permission === 'denied' ? 'denied' : 'off')
        return
      }
      await saveToken(uid, await fetchToken())
      setStatus('on')
      toast.success('Notifications activées')
    } catch (e) {
      reportError(e)
    }
  }, [uid])

  const disable = useCallback(async () => {
    const token = storedToken()
    storeToken(null)
    setStatus('off')
    try {
      await deleteToken(getMessaging(app))
      if (token) await deleteDoc(tokenDoc(uid, token))
    } catch (e) {
      reportError(e)
    }
  }, [uid])

  return { status, enable, disable }
}

/**
 * Mounted once in the app shell: keeps this device's token fresh (FCM rotates them)
 * and shows a toast for messages that arrive while the app is open.
 */
export function usePushListener(uid: string) {
  const navigate = useNavigate()

  useEffect(() => {
    let unsubscribe: (() => void) | undefined
    let cancelled = false
    ;(async () => {
      if ((await currentStatus()) !== 'on' || cancelled) return
      const previous = storedToken()
      const token = await fetchToken()
      if (token !== previous) {
        await saveToken(uid, token)
        if (previous) await deleteDoc(tokenDoc(uid, previous))
      }
      if (cancelled) return
      unsubscribe = onMessage(getMessaging(app), ({ data }) => {
        if (!data?.title) return
        const url = data.url
        toast(data.title, {
          description: data.body,
          action: url && url !== location.pathname ? { label: 'Voir', onClick: () => navigate(url) } : undefined,
        })
      })
    })().catch(console.error)
    return () => {
      cancelled = true
      unsubscribe?.()
    }
  }, [uid, navigate])
}
