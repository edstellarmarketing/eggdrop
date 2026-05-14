'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Score, Team } from '@/types/game'

export interface LeaderboardEntry extends Score {
  team_name: string
  team_color: string | null
}

export function useLeaderboard(eventId: string | null) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (!eventId) {
      setLoading(false)
      return
    }

    async function fetchLeaderboard() {
      // Get scores and join with teams
      const { data, error } = await supabase
        .schema('eggdrop')
        .from('scores')
        .select(`
          *,
          teams:team_id (
            name,
            color
          )
        `)
        .eq('event_id', eventId)
        .order('total_score', { ascending: false })

      if (!error && data) {
        const formattedData = data.map((item: any) => ({
          ...item,
          team_name: item.teams.name,
          team_color: item.teams.color
        }))
        setLeaderboard(formattedData)
      }
      setLoading(false)
    }

    fetchLeaderboard()

    const channel = supabase
      .channel(`leaderboard-updates-${eventId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'eggdrop',
          table: 'scores',
          filter: `event_id=eq.${eventId}`,
        },
        () => {
          // Re-fetch everything on change to ensure ordering and joins are correct
          fetchLeaderboard()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [eventId])

  return { leaderboard, loading }
}
