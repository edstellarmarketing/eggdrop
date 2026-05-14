'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

const DEFAULT_RESOURCES = [
  { name: 'Foam Sheet', category: 'cushioning', price_credits: 200, stock_total: 20 },
  { name: 'Bubble Wrap', category: 'cushioning', price_credits: 150, stock_total: 30 },
  { name: 'Cotton Balls (10)', category: 'cushioning', price_credits: 80, stock_total: 40 },
  { name: 'Cardboard Tube', category: 'structural', price_credits: 100, stock_total: 25 },
  { name: 'Popsicle Sticks (10)', category: 'structural', price_credits: 120, stock_total: 25 },
  { name: 'Plastic Cup', category: 'structural', price_credits: 80, stock_total: 30 },
  { name: 'Paper Bag (small)', category: 'drag', price_credits: 60, stock_total: 30 },
  { name: 'Plastic Bag', category: 'drag', price_credits: 50, stock_total: 30 },
  { name: 'Streamers (3 ft)', category: 'drag', price_credits: 70, stock_total: 25 },
  { name: 'Masking Tape (roll)', category: 'adhesive', price_credits: 250, stock_total: 15 },
  { name: 'Rubber Bands (10)', category: 'adhesive', price_credits: 90, stock_total: 25 },
  { name: 'Wildcard Pack', category: 'wildcard', price_credits: 300, stock_total: 10 },
]

export interface EventRecord {
  id: string
  name: string
  venue: string | null
  date: string | null
  drop_height_meters: number | null
  timer_duration_minutes: number | null
  current_phase: string
  created_at: string
  updated_at: string
}

export interface EventListItem extends EventRecord {
  team_count: number
  resource_count: number
}

export interface EventInput {
  name: string
  venue?: string | null
  date?: string | null
  drop_height_meters?: number | null
  timer_duration_minutes?: number | null
}

export async function listEvents(): Promise<EventListItem[]> {
  const supabase = createAdminClient()
  const { data: events, error } = await supabase
    .schema('eggdrop')
    .from('events')
    .select('*')
    .order('created_at', { ascending: false })

  if (error || !events) {
    console.error('listEvents error', error)
    return []
  }
  if (events.length === 0) return []

  const ids = events.map((e) => e.id)
  const [teamsRes, resourcesRes] = await Promise.all([
    supabase.schema('eggdrop').from('teams').select('event_id').in('event_id', ids),
    supabase.schema('eggdrop').from('resources').select('event_id').in('event_id', ids),
  ])

  const teamCounts = new Map<string, number>()
  for (const row of teamsRes.data ?? []) {
    teamCounts.set(row.event_id, (teamCounts.get(row.event_id) ?? 0) + 1)
  }
  const resourceCounts = new Map<string, number>()
  for (const row of resourcesRes.data ?? []) {
    resourceCounts.set(row.event_id, (resourceCounts.get(row.event_id) ?? 0) + 1)
  }

  return events.map((e) => ({
    ...(e as EventRecord),
    team_count: teamCounts.get(e.id) ?? 0,
    resource_count: resourceCounts.get(e.id) ?? 0,
  }))
}

export async function getEvent(id: string): Promise<EventRecord | null> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .schema('eggdrop')
    .from('events')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    console.error('getEvent error', error)
    return null
  }
  return (data as EventRecord) ?? null
}

export async function createEvent(input: EventInput) {
  if (!input.name?.trim()) return { error: 'Event name is required' }

  const supabase = createAdminClient()
  const payload = {
    name: input.name.trim(),
    venue: input.venue?.trim() || null,
    date: input.date || null,
    drop_height_meters: input.drop_height_meters ?? 3.0,
    timer_duration_minutes: input.timer_duration_minutes ?? 30,
    current_phase: 'setup',
  }

  const { data: created, error } = await supabase
    .schema('eggdrop')
    .from('events')
    .insert(payload)
    .select('id')
    .single()

  if (error || !created) {
    console.error('createEvent error', error)
    return { error: `Failed to create event: ${error?.message ?? 'unknown'}` }
  }

  const eventId = created.id as string

  await supabase
    .schema('eggdrop')
    .from('event_settings')
    .insert({ event_id: eventId })

  await supabase
    .schema('eggdrop')
    .from('resources')
    .insert(
      DEFAULT_RESOURCES.map((r) => ({
        event_id: eventId,
        name: r.name,
        category: r.category,
        price_credits: r.price_credits,
        stock_total: r.stock_total,
        stock_remaining: r.stock_total,
      })),
    )

  revalidatePath('/admin')
  return { success: true as const, eventId }
}

export async function updateEvent(id: string, input: EventInput) {
  if (!input.name?.trim()) return { error: 'Event name is required' }

  const supabase = createAdminClient()
  const { error } = await supabase
    .schema('eggdrop')
    .from('events')
    .update({
      name: input.name.trim(),
      venue: input.venue?.trim() || null,
      date: input.date || null,
      drop_height_meters: input.drop_height_meters ?? 3.0,
      timer_duration_minutes: input.timer_duration_minutes ?? 30,
    })
    .eq('id', id)

  if (error) {
    console.error('updateEvent error', error)
    return { error: `Failed to update event: ${error.message}` }
  }

  revalidatePath('/admin')
  revalidatePath(`/admin/events/${id}`)
  return { success: true as const }
}

export async function deleteEvent(id: string) {
  const supabase = createAdminClient()
  const { error } = await supabase
    .schema('eggdrop')
    .from('events')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('deleteEvent error', error)
    return { error: `Failed to delete event: ${error.message}` }
  }

  revalidatePath('/admin')
  return { success: true as const }
}
