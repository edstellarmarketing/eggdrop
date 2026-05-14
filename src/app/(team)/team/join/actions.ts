'use server'

import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export async function joinTeamAction(code: string) {
  const supabase = await createClient()
  const cookieStore = await cookies()

  // Verify the join code
  // Note: We specify the schema 'eggdrop' explicitly if needed, 
  // but if it's in the exposed schemas and prioritized, we can just use the table name.
  // Using .schema() is safer for multi-schema setups.
  const { data: team, error } = await supabase
    .schema('eggdrop')
    .from('teams')
    .select('id, event_id, name')
    .eq('join_code', code)
    .single()

  if (error || !team) {
    return { error: 'Invalid join code. Please try again.' }
  }

  // Store team info in a cookie for the middleware to pick up
  // In a production app, this should be a signed/encrypted JWT
  cookieStore.set('team_session', JSON.stringify({
    teamId: team.id,
    eventId: team.event_id,
    teamName: team.name
  }), {
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 // 24 hours
  })

  return { success: true }
}
