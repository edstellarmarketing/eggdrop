'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Event } from '@/types/game'

export function useEvent(eventId: string | null) {
  const [event, setEvent] = useState<Event | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<any>(null)
  const supabase = createClient()

  useEffect(() => {
    if (!eventId) {
      setLoading(false)
      return
    }

    // Initial fetch
    async function fetchEvent() {
      const { data, error } = await supabase
        .schema('eggdrop')
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single()

      if (error) {
        setError(error)
      } else {
        setEvent(data as Event)
      }
      setLoading(false)
    }

    fetchEvent()

    // Realtime subscription
    const channel = supabase
      .channel(`event-updates-${eventId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'eggdrop',
          table: 'events',
          filter: `id=eq.${eventId}`,
        },
        (payload) => {
          setEvent(payload.new as Event)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [eventId])

  return { event, loading, error }
}
