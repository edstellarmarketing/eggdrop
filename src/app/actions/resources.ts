'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import type { ResourceInput, ResourceRow } from '@/lib/resources'

function validate(input: ResourceInput): string | null {
  if (!input.name?.trim()) return 'Name is required'
  if (!Number.isFinite(input.price_credits) || input.price_credits < 0) {
    return 'Price must be a non-negative number'
  }
  if (!Number.isInteger(input.stock_total) || input.stock_total < 0) {
    return 'Stock must be a non-negative whole number'
  }
  return null
}

export async function listResources(eventId: string): Promise<ResourceRow[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .schema('eggdrop')
    .from('resources')
    .select('id, event_id, name, category, price_credits, stock_total, stock_remaining')
    .eq('event_id', eventId)
    .order('category', { ascending: true })
    .order('name', { ascending: true })

  if (error || !data) {
    console.error('listResources error', error)
    return []
  }
  return data as ResourceRow[]
}

export async function createResource(eventId: string, input: ResourceInput) {
  const err = validate(input)
  if (err) return { error: err }
  if (!eventId) return { error: 'Missing eventId' }

  const supabase = createAdminClient()
  const { error } = await supabase
    .schema('eggdrop')
    .from('resources')
    .insert({
      event_id: eventId,
      name: input.name.trim(),
      category: input.category,
      price_credits: input.price_credits,
      stock_total: input.stock_total,
      stock_remaining: input.stock_total,
    })

  if (error) {
    console.error('createResource error', error)
    return { error: `Failed to create resource: ${error.message}` }
  }

  revalidatePath(`/admin/events/${eventId}/resources`)
  return { success: true as const }
}

export async function updateResource(id: string, input: ResourceInput) {
  const err = validate(input)
  if (err) return { error: err }

  const supabase = createAdminClient()
  const { data: existing } = await supabase
    .schema('eggdrop')
    .from('resources')
    .select('event_id, stock_total, stock_remaining')
    .eq('id', id)
    .maybeSingle()
  if (!existing) return { error: 'Resource not found' }

  const consumed = existing.stock_total - existing.stock_remaining
  const newRemaining = Math.max(0, input.stock_total - consumed)

  const { error } = await supabase
    .schema('eggdrop')
    .from('resources')
    .update({
      name: input.name.trim(),
      category: input.category,
      price_credits: input.price_credits,
      stock_total: input.stock_total,
      stock_remaining: newRemaining,
    })
    .eq('id', id)

  if (error) {
    console.error('updateResource error', error)
    return { error: `Failed to update resource: ${error.message}` }
  }

  revalidatePath(`/admin/events/${existing.event_id}/resources`)
  return { success: true as const }
}

export async function deleteResource(id: string) {
  const supabase = createAdminClient()
  const { data: existing } = await supabase
    .schema('eggdrop')
    .from('resources')
    .select('event_id')
    .eq('id', id)
    .maybeSingle()

  const { error } = await supabase
    .schema('eggdrop')
    .from('resources')
    .delete()
    .eq('id', id)

  if (error) {
    return { error: `Failed to delete resource: ${error.message}` }
  }

  if (existing) {
    revalidatePath(`/admin/events/${existing.event_id}/resources`)
  }
  return { success: true as const }
}
