'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { sendTeamJoinCode } from '@/lib/email-service'
import type { ParticipantInput } from '@/lib/participants'

export interface TeamRow {
  id: string
  event_id: string
  name: string
  color: string | null
  join_code: string | null
  status: string | null
  member_count: number
  total_budget: number
  spent_amount: number
  remaining_balance: number
}

function generateJoinCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let out = ''
  for (let i = 0; i < 6; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)]
  }
  return out
}

async function uniqueJoinCode(supabase: ReturnType<typeof createAdminClient>): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = generateJoinCode()
    const { data } = await supabase
      .schema('eggdrop')
      .from('teams')
      .select('id')
      .eq('join_code', code)
      .maybeSingle()
    if (!data) return code
  }
  throw new Error('Could not generate a unique join code')
}

export async function listTeams(eventId: string): Promise<TeamRow[]> {
  const supabase = createAdminClient()

  const { data: teams, error } = await supabase
    .schema('eggdrop')
    .from('teams')
    .select('id, event_id, name, color, join_code, status, created_at')
    .eq('event_id', eventId)
    .order('created_at', { ascending: true })

  if (error || !teams) {
    console.error('listTeams error', error)
    return []
  }
  if (teams.length === 0) return []

  const teamIds = teams.map((t) => t.id)

  const [membersResult, walletsResult] = await Promise.all([
    supabase
      .schema('eggdrop')
      .from('team_members')
      .select('team_id')
      .in('team_id', teamIds),
    supabase
      .schema('eggdrop')
      .from('team_wallets')
      .select('team_id, total_budget, spent_amount, remaining_balance')
      .in('team_id', teamIds),
  ])

  const memberCounts = new Map<string, number>()
  for (const row of membersResult.data ?? []) {
    memberCounts.set(row.team_id, (memberCounts.get(row.team_id) ?? 0) + 1)
  }

  const walletByTeam = new Map<string, { total_budget: number; spent_amount: number; remaining_balance: number }>()
  for (const w of walletsResult.data ?? []) {
    walletByTeam.set(w.team_id, {
      total_budget: Number(w.total_budget) || 0,
      spent_amount: Number(w.spent_amount) || 0,
      remaining_balance: Number(w.remaining_balance) || 0,
    })
  }

  return teams.map((t) => {
    const wallet = walletByTeam.get(t.id)
    return {
      id: t.id,
      event_id: t.event_id,
      name: t.name,
      color: t.color,
      join_code: t.join_code,
      status: t.status,
      member_count: memberCounts.get(t.id) ?? 0,
      total_budget: wallet?.total_budget ?? 0,
      spent_amount: wallet?.spent_amount ?? 0,
      remaining_balance: wallet?.remaining_balance ?? 0,
    } as TeamRow
  })
}

export async function getTeam(teamId: string): Promise<TeamRow | null> {
  const supabase = createAdminClient()
  const { data: team } = await supabase
    .schema('eggdrop')
    .from('teams')
    .select('id, event_id, name, color, join_code, status')
    .eq('id', teamId)
    .maybeSingle()
  if (!team) return null

  const [membersRes, walletRes] = await Promise.all([
    supabase
      .schema('eggdrop')
      .from('team_members')
      .select('id', { count: 'exact', head: true })
      .eq('team_id', teamId),
    supabase
      .schema('eggdrop')
      .from('team_wallets')
      .select('total_budget, spent_amount, remaining_balance')
      .eq('team_id', teamId)
      .maybeSingle(),
  ])

  return {
    id: team.id,
    event_id: team.event_id,
    name: team.name,
    color: team.color,
    join_code: team.join_code,
    status: team.status,
    member_count: membersRes.count ?? 0,
    total_budget: Number(walletRes.data?.total_budget) || 0,
    spent_amount: Number(walletRes.data?.spent_amount) || 0,
    remaining_balance: Number(walletRes.data?.remaining_balance) || 0,
  }
}

export interface CreateTeamInput {
  eventId: string
  name: string
  color?: string | null
  budget: number
  participants?: ParticipantInput[]
}

function normalizeParticipant(p: ParticipantInput) {
  return {
    full_name: p.full_name.trim(),
    designation: p.designation?.trim() || null,
    email: p.email?.trim() || null,
    avatar_url: p.avatar_url?.trim() || null,
    role: p.role ?? 'member',
  }
}

export async function createTeam(input: CreateTeamInput) {
  if (!input.eventId) return { error: 'Missing eventId' }
  if (!input.name?.trim()) return { error: 'Team name is required' }
  if (!Number.isFinite(input.budget) || input.budget < 0) {
    return { error: 'Budget must be a non-negative number' }
  }

  const participants = (input.participants ?? []).filter((p) => p.full_name?.trim())
  for (const p of participants) {
    if (!p.full_name?.trim()) return { error: 'Every participant needs a name' }
  }
  const captains = participants.filter((p) => p.role === 'captain').length
  if (captains > 1) {
    return { error: 'Only one participant can be captain' }
  }

  const supabase = createAdminClient()

  let joinCode: string
  try {
    joinCode = await uniqueJoinCode(supabase)
  } catch (err) {
    return { error: (err as Error).message }
  }

  const { data: team, error: teamErr } = await supabase
    .schema('eggdrop')
    .from('teams')
    .insert({
      event_id: input.eventId,
      name: input.name.trim(),
      color: input.color?.trim() || null,
      join_code: joinCode,
      status: 'active',
    })
    .select('id, name, join_code')
    .single()

  if (teamErr || !team) {
    console.error('createTeam insert error', teamErr)
    return {
      error: `Failed to create team: ${teamErr?.message || 'unknown'} (code: ${teamErr?.code || 'n/a'})`,
    }
  }

  const { error: walletErr } = await supabase
    .schema('eggdrop')
    .from('team_wallets')
    .insert({
      team_id: team.id,
      total_budget: input.budget,
      spent_amount: 0,
      remaining_balance: input.budget,
    })

  if (walletErr) {
    console.error('createTeam wallet insert error', walletErr)
    return {
      error: `Team created but wallet failed: ${walletErr.message}`,
    }
  }

  let participantsInserted = 0
  if (participants.length > 0) {
    const rows = participants.map((p) => ({
      team_id: team.id,
      ...normalizeParticipant(p),
    }))
    const { error: pErr } = await supabase
      .schema('eggdrop')
      .from('team_members')
      .insert(rows)
    if (pErr) {
      console.error('createTeam participants insert error', pErr)
      return {
        error: `Team created but participants failed: ${pErr.message}`,
      }
    }
    participantsInserted = rows.length
  }

  const captain = participants.find((p) => p.role === 'captain')
  const captainEmail = captain?.email?.trim() || null

  let emailStatus: 'sent' | 'failed' | 'skipped' = 'skipped'
  let emailError: string | undefined
  if (captainEmail) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    try {
      const result = await sendTeamJoinCode(captainEmail, team.name, team.join_code ?? '', appUrl)
      if (result && (result.success === true || result.status === 'success')) {
        emailStatus = 'sent'
      } else {
        emailStatus = 'failed'
        emailError = result?.error || result?.message || JSON.stringify(result)
      }
    } catch (err) {
      emailStatus = 'failed'
      emailError = (err as Error).message
    }
  }

  revalidatePath(`/admin/events/${input.eventId}`)
  revalidatePath(`/admin/events/${input.eventId}/teams`)
  return {
    success: true as const,
    teamId: team.id,
    teamName: team.name,
    joinCode: team.join_code,
    participantsInserted,
    captainEmail,
    emailStatus,
    emailError,
  }
}

export interface UpdateTeamInput {
  teamId: string
  name: string
  color?: string | null
  budget: number
}

export async function updateTeam(input: UpdateTeamInput) {
  if (!input.name?.trim()) return { error: 'Team name is required' }
  if (!Number.isFinite(input.budget) || input.budget < 0) {
    return { error: 'Budget must be a non-negative number' }
  }

  const supabase = createAdminClient()

  const { data: existing, error: lookupErr } = await supabase
    .schema('eggdrop')
    .from('teams')
    .select('event_id')
    .eq('id', input.teamId)
    .maybeSingle()
  if (lookupErr || !existing) {
    return { error: 'Team not found' }
  }

  const { error: teamErr } = await supabase
    .schema('eggdrop')
    .from('teams')
    .update({
      name: input.name.trim(),
      color: input.color?.trim() || null,
    })
    .eq('id', input.teamId)

  if (teamErr) {
    return { error: `Failed to update team: ${teamErr.message}` }
  }

  const { data: wallet } = await supabase
    .schema('eggdrop')
    .from('team_wallets')
    .select('spent_amount')
    .eq('team_id', input.teamId)
    .maybeSingle()

  const spent = Number(wallet?.spent_amount) || 0

  const { error: walletErr } = await supabase
    .schema('eggdrop')
    .from('team_wallets')
    .upsert({
      team_id: input.teamId,
      total_budget: input.budget,
      spent_amount: spent,
      remaining_balance: input.budget - spent,
    })

  if (walletErr) {
    return { error: `Team updated but wallet failed: ${walletErr.message}` }
  }

  revalidatePath(`/admin/events/${existing.event_id}`)
  revalidatePath(`/admin/events/${existing.event_id}/teams`)
  return { success: true as const }
}

export async function deleteTeam(teamId: string) {
  const supabase = createAdminClient()
  const { data: existing } = await supabase
    .schema('eggdrop')
    .from('teams')
    .select('event_id')
    .eq('id', teamId)
    .maybeSingle()

  const { error } = await supabase
    .schema('eggdrop')
    .from('teams')
    .delete()
    .eq('id', teamId)

  if (error) {
    return { error: `Failed to delete team: ${error.message}` }
  }

  if (existing) {
    revalidatePath(`/admin/events/${existing.event_id}`)
    revalidatePath(`/admin/events/${existing.event_id}/teams`)
  }
  return { success: true as const }
}
