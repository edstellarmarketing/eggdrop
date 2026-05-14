'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import type { ParticipantInput, ParticipantRow } from '@/lib/participants'

const PARTICIPANT_COLUMNS = 'id, team_id, full_name, designation, email, avatar_url, role, created_at'

function normalize(input: ParticipantInput) {
  return {
    full_name: input.full_name.trim(),
    designation: input.designation?.trim() || null,
    email: input.email?.trim() || null,
    avatar_url: input.avatar_url?.trim() || null,
    role: input.role ?? 'member',
  }
}

export async function listParticipants(teamId: string): Promise<ParticipantRow[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .schema('eggdrop')
    .from('team_members')
    .select(PARTICIPANT_COLUMNS)
    .eq('team_id', teamId)
    .order('role', { ascending: true })
    .order('created_at', { ascending: true })

  if (error || !data) {
    console.error('listParticipants error', error)
    return []
  }
  return data as ParticipantRow[]
}

export async function addParticipant(teamId: string, input: ParticipantInput) {
  if (!teamId) return { error: 'Missing teamId' }
  if (!input.full_name?.trim()) return { error: 'Full name is required' }

  const supabase = createAdminClient()
  const payload = normalize(input)

  if (payload.role === 'captain') {
    await supabase
      .schema('eggdrop')
      .from('team_members')
      .update({ role: 'member' })
      .eq('team_id', teamId)
      .eq('role', 'captain')
  }

  const { error } = await supabase
    .schema('eggdrop')
    .from('team_members')
    .insert({ team_id: teamId, ...payload })

  if (error) {
    return { error: `Failed to add participant: ${error.message}` }
  }

  const { data: team } = await supabase
    .schema('eggdrop')
    .from('teams')
    .select('event_id')
    .eq('id', teamId)
    .maybeSingle()
  if (team) {
    revalidatePath(`/admin/events/${team.event_id}/teams/${teamId}`)
    revalidatePath(`/admin/events/${team.event_id}/teams`)
  }
  return { success: true as const }
}

export async function addParticipantsBatch(teamId: string, list: ParticipantInput[]) {
  if (!teamId) return { error: 'Missing teamId' }
  if (!list.length) return { success: true as const, inserted: 0 }

  for (const p of list) {
    if (!p.full_name?.trim()) {
      return { error: 'Every participant needs a name' }
    }
  }
  const captains = list.filter((p) => p.role === 'captain').length
  if (captains > 1) {
    return { error: 'Only one participant can be captain' }
  }

  const supabase = createAdminClient()
  const rows = list.map((p) => ({ team_id: teamId, ...normalize(p) }))

  const { error } = await supabase
    .schema('eggdrop')
    .from('team_members')
    .insert(rows)

  if (error) {
    return { error: `Failed to add participants: ${error.message}` }
  }

  const { data: team } = await supabase
    .schema('eggdrop')
    .from('teams')
    .select('event_id')
    .eq('id', teamId)
    .maybeSingle()
  if (team) {
    revalidatePath(`/admin/events/${team.event_id}/teams/${teamId}`)
    revalidatePath(`/admin/events/${team.event_id}/teams`)
  }
  return { success: true as const, inserted: rows.length }
}

export async function updateParticipant(id: string, input: ParticipantInput) {
  if (!input.full_name?.trim()) return { error: 'Full name is required' }

  const supabase = createAdminClient()
  const { data: existing } = await supabase
    .schema('eggdrop')
    .from('team_members')
    .select('team_id')
    .eq('id', id)
    .maybeSingle()
  if (!existing) return { error: 'Participant not found' }

  const payload = normalize(input)

  if (payload.role === 'captain') {
    await supabase
      .schema('eggdrop')
      .from('team_members')
      .update({ role: 'member' })
      .eq('team_id', existing.team_id)
      .eq('role', 'captain')
      .neq('id', id)
  }

  const { error } = await supabase
    .schema('eggdrop')
    .from('team_members')
    .update(payload)
    .eq('id', id)

  if (error) {
    return { error: `Failed to update participant: ${error.message}` }
  }

  const { data: team } = await supabase
    .schema('eggdrop')
    .from('teams')
    .select('event_id')
    .eq('id', existing.team_id)
    .maybeSingle()
  if (team) {
    revalidatePath(`/admin/events/${team.event_id}/teams/${existing.team_id}`)
  }
  return { success: true as const }
}

export async function removeParticipant(id: string) {
  const supabase = createAdminClient()
  const { data: existing } = await supabase
    .schema('eggdrop')
    .from('team_members')
    .select('team_id')
    .eq('id', id)
    .maybeSingle()

  const { error } = await supabase
    .schema('eggdrop')
    .from('team_members')
    .delete()
    .eq('id', id)

  if (error) {
    return { error: `Failed to remove participant: ${error.message}` }
  }

  if (existing) {
    const { data: team } = await supabase
      .schema('eggdrop')
      .from('teams')
      .select('event_id')
      .eq('id', existing.team_id)
      .maybeSingle()
    if (team) {
      revalidatePath(`/admin/events/${team.event_id}/teams/${existing.team_id}`)
    }
  }
  return { success: true as const }
}
