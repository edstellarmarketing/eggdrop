'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { GAME_PHASES, GamePhase } from '@/lib/constants'
import { revalidatePath } from 'next/cache'

/**
 * Transition an event to a new phase.
 * This is a trusted server operation.
 */
export async function transitionEventPhase(
  eventId: string,
  newPhase: GamePhase,
  actorId?: string
) {
  const supabase = createAdminClient()

  // 1. Get current phase to validate transition
  const { data: event, error: fetchError } = await supabase
    .schema('eggdrop')
    .from('events')
    .select('current_phase')
    .eq('id', eventId)
    .single()

  if (fetchError || !event) {
    return { error: 'Event not found' }
  }

  const currentPhase = event.current_phase

  // 2. Validate transition (Simple state machine logic)
  const isValid = validateTransition(currentPhase as GamePhase, newPhase)
  if (!isValid) {
    return { error: `Invalid transition from ${currentPhase} to ${newPhase}` }
  }

  // 3. Perform phase-specific side effects
  const updates: any = { 
    current_phase: newPhase,
    updated_at: new Date().toISOString()
  }

  if (newPhase === GAME_PHASES.BUILD) {
    const { data: settings } = await supabase
      .schema('eggdrop')
      .from('events')
      .select('timer_duration_minutes')
      .eq('id', eventId)
      .single()
    
    const duration = settings?.timer_duration_minutes || 30
    const now = new Date()
    const endsAt = new Date(now.getTime() + duration * 60000)
    
    updates.timer_started_at = now.toISOString()
    updates.timer_ends_at = endsAt.toISOString()
  }

  // 4. Update event phase
  const { error: updateError } = await supabase
    .schema('eggdrop')
    .from('events')
    .update(updates)
    .eq('id', eventId)

  if (updateError) {
    return { error: 'Failed to update event phase' }
  }

  // 5. Audit log
  await supabase
    .schema('eggdrop')
    .from('audit_log')
    .insert({
      event_id: eventId,
      actor_id: actorId,
      action: 'phase_transition',
      details: { from: currentPhase, to: newPhase }
    })

  revalidatePath(`/admin`)
  revalidatePath(`/admin/setup`)
  revalidatePath(`/team`)
  revalidatePath(`/projector`)

  return { success: true }
}

/**
 * Validates if a transition from currentPhase to nextPhase is allowed.
 */
function validateTransition(current: GamePhase, next: GamePhase): boolean {
  if (next === GAME_PHASES.ABORTED) return true

  const transitions: Record<GamePhase, GamePhase[]> = {
    [GAME_PHASES.SETUP]: [GAME_PHASES.BUDGET_OFFER],
    [GAME_PHASES.BUDGET_OFFER]: [GAME_PHASES.BUILD, GAME_PHASES.ABORTED],
    [GAME_PHASES.BUILD]: [GAME_PHASES.TRADING, GAME_PHASES.SUBMISSION],
    [GAME_PHASES.TRADING]: [GAME_PHASES.BUILD, GAME_PHASES.SUBMISSION],
    [GAME_PHASES.SUBMISSION]: [GAME_PHASES.DROP_TEST],
    [GAME_PHASES.DROP_TEST]: [GAME_PHASES.SCORING],
    [GAME_PHASES.SCORING]: [GAME_PHASES.DROP_TEST, GAME_PHASES.FINAL],
    [GAME_PHASES.FINAL]: [],
    [GAME_PHASES.ABORTED]: [GAME_PHASES.SETUP]
  }

  return transitions[current]?.includes(next) ?? false
}
