import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { supabase } from './supabase'

type Audience = 'customer' | 'technician' | 'admin'
type Connection = 'connecting' | 'live' | 'reconnecting'

const queryKeys: Record<Audience, Record<string, string[]>> = {
  customer: {
    booking: ['customer-requests', 'customer-request-updates', 'customer-service-timeline', 'customer-booking-location', 'booking-chat-unread', 'booking-payment-attempts'],
    location: ['customer-booking-location'],
    payment: ['customer-requests', 'booking-payment-attempts'],
    chat: ['booking-chat', 'booking-chat-unread'],
  },
  technician: {
    booking: ['technician-jobs', 'technician-availability', 'booking-chat-unread'],
    chat: ['booking-chat', 'booking-chat-unread'],
    offer: ['technician-jobs'],
  },
  admin: {
    booking: ['admin-overview'],
    location: ['admin-overview'],
    admin: ['admin-overview', 'admin-fuel-prices'],
  },
}

export function useDashboardRealtime(audience: Audience, userId: string | undefined) {
  const client = useQueryClient()
  const [connection, setConnection] = useState<{ topic: string; status: Connection }>()
  const topic = userId ? audience === 'admin' ? 'nexroad:admin' : `nexroad:user:${userId}` : null

  useEffect(() => {
    if (!topic) return

    let active = true
    let timer: number | undefined
    const pending = new Set<string>()
    const keys = queryKeys[audience]

    function schedule(scopes: string[]) {
      scopes.forEach((scope) => {
        if (Object.hasOwn(keys, scope)) keys[scope].forEach((key) => pending.add(key))
      })
      if (timer !== undefined || pending.size === 0) return

      timer = window.setTimeout(() => {
        timer = undefined
        const entries = [...pending]
        pending.clear()
        void Promise.all(entries.map((key) => client.invalidateQueries({ queryKey: [key] })))
      }, 250)
    }

    const channel = supabase.channel(topic, { config: { private: true } })
      .on('broadcast', { event: 'changed' }, ({ payload }) => {
        if (active && typeof payload?.scope === 'string') schedule([payload.scope])
      })
      .subscribe((status) => {
        if (!active) return
        if (status === 'SUBSCRIBED') {
          setConnection({ topic, status: 'live' })
          schedule(Object.keys(keys))
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          setConnection({ topic, status: 'reconnecting' })
        }
      })

    return () => {
      active = false
      window.clearTimeout(timer)
      void supabase.removeChannel(channel)
    }
  }, [audience, client, topic])

  return connection && connection.topic === topic ? connection.status : 'connecting'
}
