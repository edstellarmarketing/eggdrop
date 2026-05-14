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

export async function getCurrentEvent(): Promise<EventRecord | null> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .schema('eggdrop')
    .from('events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('getCurrentEvent error', error)
    return null
  }
  return data as EventRecord | null
}

export interface SaveEventInput {
  name: string
  venue?: string | null
  date?: string | null
  drop_height_meters?: number | null
  timer_duration_minutes?: number | null
}

export async function saveEvent(input: SaveEventInput) {
  if (!input.name?.trim()) {
    return { error: 'Event name is required' }
  }

  const supabase = createAdminClient()
  const current = await getCurrentEvent()

  const payload = {
    name: input.name.trim(),
    venue: input.venue?.trim() || null,
    date: input.date || null,
    drop_height_meters: input.drop_height_meters ?? 3.0,
    timer_duration_minutes: input.timer_duration_minutes ?? 30,
  }

  if (current) {
    const { error } = await supabase
      .schema('eggdrop')
      .from('events')
      .update(payload)
      .eq('id', current.id)

    if (error) {
      console.error('saveEvent update error', error)
      return { error: 'Failed to save event' }
    }

    revalidatePath('/admin')
    revalidatePath('/admin/setup')
    return { success: true, eventId: current.id, created: false }
  }

  const { data: created, error: insertError } = await supabase
    .schema('eggdrop')
    .from('events')
    .insert({ ...payload, current_phase: 'setup' })
    .select('id')
    .single()

  if (insertError || !created) {
    console.error('saveEvent insert error', insertError)
    return { error: 'Failed to create event' }
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
  revalidatePath('/admin/setup')
  revalidatePath('/admin/resources')
  return { success: true, eventId, created: true }
}
