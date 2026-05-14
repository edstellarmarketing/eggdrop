'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'

export async function joinTeamAction(code: string) {
  const normalized = code?.trim().toUpperCase()
  if (!normalized) {
    return { error: 'Please enter a join code.' }
  }

  const supabase = createAdminClient()
  const cookieStore = await cookies()

  const { data: team, error } = await supabase
    .schema('eggdrop')
    .from('teams')
    .select('id, event_id, name, status')
    .eq('join_code', normalized)
    .maybeSingle()

  if (error) {
    console.error('joinTeamAction lookup error', error)
    return { error: `Lookup failed: ${error.message}` }
  }
  if (!team) {
    return { error: 'Invalid join code. Please try again.' }
  }
  if (team.status && team.status !== 'active') {
    return { error: `This team is ${team.status}. Contact your facilitator.` }
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
