'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { getCurrentEvent } from './events'
import { sendTeamJoinCode } from '@/lib/email-service'

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

export async function getTeams(): Promise<{ event: { id: string; name: string } | null; teams: TeamRow[] }> {
  const event = await getCurrentEvent()
  if (!event) return { event: null, teams: [] }

  const supabase = createAdminClient()

  const { data: teams, error } = await supabase
    .schema('eggdrop')
    .from('teams')
    .select('id, event_id, name, color, join_code, status, created_at')
    .eq('event_id', event.id)
    .order('created_at', { ascending: true })

  if (error || !teams) {
    console.error('getTeams error', error)
    return { event: { id: event.id, name: event.name }, teams: [] }
  }

  if (teams.length === 0) {
    return { event: { id: event.id, name: event.name }, teams: [] }
  }

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

  const rows: TeamRow[] = teams.map((t) => {
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
    }
  })

  return { event: { id: event.id, name: event.name }, teams: rows }
}

export interface CreateTeamInput {
  name: string
  color?: string | null
  budget: number
  captainEmail?: string | null
}

export async function createTeam(input: CreateTeamInput) {
  const event = await getCurrentEvent()
  if (!event) return { error: 'No event exists yet. Create the event in Setup first.' }

  if (!input.name?.trim()) return { error: 'Team name is required' }
  if (!Number.isFinite(input.budget) || input.budget < 0) {
    return { error: 'Budget must be a non-negative number' }
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
      event_id: event.id,
      name: input.name.trim(),
      color: input.color?.trim() || null,
      join_code: joinCode,
      status: 'active',
    })
    .select('id, name, join_code')
    .single()

  if (teamErr || !team) {
    console.error('createTeam team insert error', teamErr)
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
      error: `Team row created but wallet failed: ${walletErr.message} (code: ${walletErr.code || 'n/a'})`,
    }
  }

  let emailStatus: 'sent' | 'failed' | 'skipped' = 'skipped'
  let emailError: string | undefined
  if (input.captainEmail?.trim()) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    try {
      const result = await sendTeamJoinCode(input.captainEmail.trim(), team.name, team.join_code ?? '', appUrl)
      if (result && (result.success === true || result.status === 'success')) {
        emailStatus = 'sent'
      } else {
        emailStatus = 'failed'
        emailError = result?.error || result?.message || JSON.stringify(result)
        console.error('sendTeamJoinCode returned failure', result)
      }
    } catch (err) {
      emailStatus = 'failed'
      emailError = (err as Error).message
      console.error('sendTeamJoinCode threw', err)
    }
  }

  revalidatePath('/admin')
  revalidatePath('/admin/teams')
  return {
    success: true,
    teamId: team.id,
    joinCode: team.join_code,
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

  const { error: teamErr } = await supabase
    .schema('eggdrop')
    .from('teams')
    .update({
      name: input.name.trim(),
      color: input.color?.trim() || null,
    })
    .eq('id', input.teamId)

  if (teamErr) {
    return {
      error: `Failed to update team: ${teamErr.message} (code: ${teamErr.code || 'n/a'})`,
    }
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
    return {
      error: `Team updated but wallet failed: ${walletErr.message}`,
    }
  }

  revalidatePath('/admin')
  revalidatePath('/admin/teams')
  return { success: true }
}

export async function deleteTeam(teamId: string) {
  const supabase = createAdminClient()
  const { error } = await supabase
    .schema('eggdrop')
    .from('teams')
    .delete()
    .eq('id', teamId)

  if (error) {
    return {
      error: `Failed to delete team: ${error.message} (code: ${error.code || 'n/a'})`,
    }
  }

  revalidatePath('/admin')
  revalidatePath('/admin/teams')
  return { success: true }
}
