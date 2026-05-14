'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Resource } from '@/types/game'

export function useResources(eventId: string | null) {
  const [resources, setResources] = useState<Resource[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (!eventId) {
      setLoading(false)
      return
    }

    async function fetchResources() {
      const { data, error } = await supabase
        .schema('eggdrop')
        .from('resources')
        .select('*')
        .eq('event_id', eventId)
        .order('name')

      if (!error) {
        setResources(data as Resource[])
      }
      setLoading(false)
    }

    fetchResources()

    const channel = supabase
      .channel(`resources-updates-${eventId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'eggdrop',
          table: 'resources',
          filter: `event_id=eq.${eventId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setResources(prev => [...prev, payload.new as Resource].sort((a, b) => a.name.localeCompare(b.name)))
          } else if (payload.eventType === 'UPDATE') {
            setResources(prev => prev.map(r => r.id === payload.new.id ? payload.new as Resource : r))
          } else if (payload.eventType === 'DELETE') {
            setResources(prev => prev.filter(r => r.id === payload.old.id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [eventId])

  return { resources, loading }
}
