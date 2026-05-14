import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * WARNING: This client uses the service role key.
 * ONLY use this in server-side code (Server Actions, Route Handlers, etc.)
 * Never expose this client or the service role key to the browser.
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}
