'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface ActivityLogEntry {
  id: string
  team_name: string
  action: string
  details: any
  created_at: string
}

export function useActivityLog(eventId: string | null) {
  const [logs, setLogs] = useState<ActivityLogEntry[]>([])
  const supabase = createClient()

  useEffect(() => {
    if (!eventId) return

    async function fetchLogs() {
      const { data, error } = await supabase
        .schema('eggdrop')
        .from('audit_log')
        .select(`
          id,
          action,
          details,
          created_at,
          teams:actor_id (
            name
          )
        `)
        .eq('event_id', eventId)
        .order('created_at', { ascending: false })
        .limit(10)

      if (!error && data) {
        const formatted = data.map((item: any) => ({
          id: item.id,
          team_name: item.teams?.name || 'Admin',
          action: item.action,
          details: item.details,
          created_at: item.created_at
        }))
        setLogs(formatted)
      }
    }

    fetchLogs()

    const channel = supabase
      .channel(`audit-updates-${eventId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'eggdrop',
          table: 'audit_log',
          filter: `event_id=eq.${eventId}`,
        },
        () => {
          fetchLogs()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [eventId])

  return { logs }
}
