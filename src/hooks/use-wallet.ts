'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Wallet } from '@/types/game'

export function useWallet(teamId: string | null) {
  const [wallet, setWallet] = useState<Wallet | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (!teamId) {
      setLoading(false)
      return
    }

    async function fetchWallet() {
      const { data, error } = await supabase
        .schema('eggdrop')
        .from('team_wallets')
        .select('*')
        .eq('team_id', teamId)
        .single()

      if (!error) {
        setWallet(data as Wallet)
      }
      setLoading(false)
    }

    fetchWallet()

    const channel = supabase
      .channel(`wallet-updates-${teamId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'eggdrop',
          table: 'team_wallets',
          filter: `team_id=eq.${teamId}`,
        },
        (payload) => {
          setWallet(payload.new as Wallet)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [teamId])

  return { wallet, loading }
}
