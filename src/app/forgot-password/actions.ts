'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { sendPasswordReset } from '@/lib/email-service'

const ADMIN_EMAILS = ['vijay@edstellar.com']

function isAllowedAdmin(email: string) {
  return ADMIN_EMAILS.includes(email.trim().toLowerCase())
}

export async function resetPasswordAction(email: string) {
  const normalized = email.trim().toLowerCase()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  if (!isAllowedAdmin(normalized)) {
    return { success: true }
  }

  const supabase = createAdminClient()

  const { data, error } = await supabase.auth.admin.generateLink({
    type: 'recovery',
    email: normalized,
    options: {
      redirectTo: `${appUrl}/auth/update-password`,
    },
  })

  if (error || !data?.properties?.action_link) {
    console.error('generateLink error:', error)
    return { error: 'Failed to generate reset link' }
  }

  const emailResult = await sendPasswordReset(normalized, data.properties.action_link)

  if (!emailResult?.success) {
    console.error('Email relay error:', emailResult)
    return { error: 'Failed to send reset email' }
  }

  return { success: true }
}
