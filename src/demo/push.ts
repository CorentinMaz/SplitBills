import { useState } from 'react'
import { toast } from 'sonner'
import type { PushStatus } from '@/data/push'

// Demo mode has no Firebase: the switch flips but nothing is ever sent.
export function usePush(_uid: string) {
  const [status, setStatus] = useState<PushStatus>('off')
  return {
    status,
    enable: async () => {
      setStatus('on')
      toast.success('Notifications activées', { description: 'Mode démo : aucune notification ne sera envoyée.' })
    },
    disable: async () => setStatus('off'),
  }
}

export function usePushListener(_uid: string) {}
