'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { sendJudgeInvite } from '@/lib/email-service'

export async function inviteJudgeAction(eventId: string, email: string) {
  const supabase = createAdminClient()

  // 1. Get event details
  const { data: event } = await supabase
    .schema('eggdrop')
    .from('events')
    .select('name')
    .eq('id', eventId)
    .single()

  if (!event) return { error: 'Event not found' }

  // 2. Add to collaborators table
  const { error: dbError } = await supabase
    .schema('eggdrop')
    .from('collaborators')
    .upsert({
      event_id: eventId,
      email: email,
      role: 'judge'
    }, { onConflict: 'event_id,email' })

  if (dbError) return { error: 'Failed to update database' }

  // 3. Send the email via Google Apps Script
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const consoleUrl = `${appUrl}/judge`

  const emailResult = await sendJudgeInvite(email, event.name, consoleUrl)

  if (emailResult.success) {
    return { success: true }
  } else {
    return { error: 'Judge invited in database, but invitation email failed to send.' }
  }
}
