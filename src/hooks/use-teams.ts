'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Team } from '@/types/game'

export function useTeams(eventId: string | null) {
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (!eventId) {
      setLoading(false)
      return
    }

    async function fetchTeams() {
      const { data, error } = await supabase
        .schema('eggdrop')
        .from('teams')
        .select('*')
        .eq('event_id', eventId)
        .order('name')

      if (!error) {
        setTeams(data as Team[])
      }
      setLoading(false)
    }

    fetchTeams()

    const channel = supabase
      .channel(`teams-updates-${eventId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'eggdrop',
          table: 'teams',
          filter: `event_id=eq.${eventId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setTeams(prev => [...prev, payload.new as Team].sort((a, b) => a.name.localeCompare(b.name)))
          } else if (payload.eventType === 'UPDATE') {
            setTeams(prev => prev.map(t => t.id === payload.new.id ? payload.new as Team : t))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [eventId])

  return { teams, loading }
}
