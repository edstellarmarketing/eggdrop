'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Event, Resource, Team, Wallet } from '@/types/game'

interface TeamSession {
  teamId: string
  eventId: string
  teamName: string
}

export async function readTeamSession(): Promise<TeamSession | null> {
  const cookieStore = await cookies()
  const raw = cookieStore.get('team_session')?.value
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as TeamSession
    if (!parsed?.teamId || !parsed?.eventId) return null
    return parsed
  } catch {
    return null
  }
}

export async function clearTeamSession() {
  const cookieStore = await cookies()
  cookieStore.delete('team_session')
  redirect('/team/join')
}

export interface TeamConsoleData {
  team: Team
  event: Event
  wallet: Wallet | null
  resources: Resource[]
}

export async function getTeamConsoleData(): Promise<
  { data: TeamConsoleData } | { error: string }
> {
  const session = await readTeamSession()
  if (!session) return { error: 'No team session' }

  const supabase = createAdminClient()

  const [teamRes, eventRes, walletRes, resourcesRes] = await Promise.all([
    supabase
      .schema('eggdrop')
      .from('teams')
      .select('*')
      .eq('id', session.teamId)
      .maybeSingle(),
    supabase
      .schema('eggdrop')
      .from('events')
      .select('*')
      .eq('id', session.eventId)
      .maybeSingle(),
    supabase
      .schema('eggdrop')
      .from('team_wallets')
      .select('*')
      .eq('team_id', session.teamId)
      .maybeSingle(),
    supabase
      .schema('eggdrop')
      .from('resources')
      .select('*')
      .eq('event_id', session.eventId)
      .order('category')
      .order('name'),
  ])

  if (teamRes.error || !teamRes.data) return { error: 'Team not found' }
  if (eventRes.error || !eventRes.data) return { error: 'Event not found' }

  return {
    data: {
      team: teamRes.data as Team,
      event: eventRes.data as Event,
      wallet: (walletRes.data as Wallet | null) ?? null,
      resources: (resourcesRes.data ?? []) as Resource[],
    },
  }
}

export async function purchaseResourceAction(resourceId: string, quantity: number) {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    return { error: 'Quantity must be a positive integer' }
  }

  const session = await readTeamSession()
  if (!session) return { error: 'No team session — please rejoin' }

  const supabase = createAdminClient()

  const { data: event, error: eventErr } = await supabase
    .schema('eggdrop')
    .from('events')
    .select('id, current_phase')
    .eq('id', session.eventId)
    .maybeSingle()
  if (eventErr || !event) return { error: 'Event lookup failed' }
  if (event.current_phase !== 'build' && event.current_phase !== 'trading') {
    return { error: `Marketplace is closed (phase: ${event.current_phase})` }
  }

  const { data: resource, error: resErr } = await supabase
    .schema('eggdrop')
    .from('resources')
    .select('id, name, price_credits, stock_remaining, event_id')
    .eq('id', resourceId)
    .maybeSingle()
  if (resErr || !resource) return { error: 'Resource not found' }
  if (resource.event_id !== session.eventId) return { error: 'Resource does not belong to this event' }
  if (resource.stock_remaining < quantity) {
    return { error: `Only ${resource.stock_remaining} left` }
  }

  const unitPrice = Number(resource.price_credits)
  const totalPrice = unitPrice * quantity

  const { data: wallet, error: walletErr } = await supabase
    .schema('eggdrop')
    .from('team_wallets')
    .select('team_id, total_budget, spent_amount, remaining_balance')
    .eq('team_id', session.teamId)
    .maybeSingle()
  if (walletErr || !wallet) return { error: 'Wallet not found' }
  if (Number(wallet.remaining_balance) < totalPrice) {
    return {
      error: `Not enough credits: need ${totalPrice}, have ${wallet.remaining_balance}`,
    }
  }

  const newSpent = Number(wallet.spent_amount) + totalPrice
  const newStock = resource.stock_remaining - quantity

  const { error: stockErr } = await supabase
    .schema('eggdrop')
    .from('resources')
    .update({ stock_remaining: newStock })
    .eq('id', resource.id)
    .eq('stock_remaining', resource.stock_remaining) // optimistic lock
  if (stockErr) return { error: `Stock update failed: ${stockErr.message}` }

  const { error: spendErr } = await supabase
    .schema('eggdrop')
    .from('team_wallets')
    .update({ spent_amount: newSpent })
    .eq('team_id', session.teamId)
  if (spendErr) {
    // try to roll back stock
    await supabase
      .schema('eggdrop')
      .from('resources')
      .update({ stock_remaining: resource.stock_remaining })
      .eq('id', resource.id)
    return { error: `Wallet update failed: ${spendErr.message}` }
  }

  await supabase
    .schema('eggdrop')
    .from('inventory_transactions')
    .insert({
      event_id: session.eventId,
      team_id: session.teamId,
      resource_id: resource.id,
      quantity,
      unit_price: unitPrice,
      total_price: totalPrice,
      transaction_type: 'purchase',
    })

  revalidatePath('/team')
  return {
    success: true,
    resourceName: resource.name,
    spent: totalPrice,
    remaining: Number(wallet.remaining_balance) - totalPrice,
  }
}
