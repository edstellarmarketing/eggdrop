'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

interface ScoreInput {
  eventId: string
  teamId: string
  eggStatus: 'intact' | 'hairline' | 'cracked' | 'broken'
  shieldStatus: 'intact' | 'minor' | 'partial' | 'destroyed'
  innovationScore: number // 0-20
  presentationBonus: number // 0-5
}

export async function submitScoreAction(input: ScoreInput) {
  const supabase = createAdminClient()

  // 1. Calculate Egg Integrity Points (40 max)
  const eggPoints = {
    intact: 40,
    hairline: 25,
    cracked: 10,
    broken: 0
  }[input.eggStatus]

  // 2. Calculate Shield Integrity Points (20 max)
  const shieldPoints = {
    intact: 20,
    minor: 15,
    partial: 10,
    destroyed: 0
  }[input.shieldStatus]

  // 3. Calculate Budget Efficiency (20 max)
  // Logic: (1 - spent / budget) * 20
  const { data: wallet } = await supabase
    .schema('eggdrop')
    .from('team_wallets')
    .select('spent_amount, total_budget')
    .eq('team_id', input.teamId)
    .single()

  let budgetPoints = 0
  if (wallet && wallet.total_budget > 0) {
    const efficiency = 1 - (Number(wallet.spent_amount) / Number(wallet.total_budget))
    budgetPoints = Math.max(0, efficiency * 20)
  }

  // 4. Update Drop Test Record
  await supabase
    .schema('eggdrop')
    .from('drop_tests')
    .upsert({
      event_id: input.eventId,
      team_id: input.teamId,
      egg_status: input.eggStatus,
      shield_status: input.shieldStatus
    }, { onConflict: 'event_id,team_id' })

  // 5. Save Final Score
  const { error } = await supabase
    .schema('eggdrop')
    .from('scores')
    .upsert({
      event_id: input.eventId,
      team_id: input.teamId,
      egg_integrity_score: eggPoints,
      shield_integrity_score: shieldPoints,
      innovation_score: input.innovationScore,
      budget_efficiency_score: budgetPoints,
      bonus_points: input.presentationBonus,
      updated_at: new Date().toISOString()
    }, { onConflict: 'event_id,team_id' })

  if (error) {
    return { error: 'Failed to save score' }
  }

  // 6. Audit Log
  await supabase
    .schema('eggdrop')
    .from('audit_log')
    .insert({
      event_id: input.eventId,
      actor_id: input.teamId,
      action: 'score_submitted',
      details: { total: eggPoints + shieldPoints + input.innovationScore + budgetPoints + input.presentationBonus }
    })

  revalidatePath('/admin')
  revalidatePath('/judge')
  revalidatePath('/projector')

  return { success: true }
}
