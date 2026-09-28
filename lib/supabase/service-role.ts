import 'server-only'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

/**
 * Low-level service-role client factory.
 *
 * SEC-109: Prefer `executeServiceRoleJob` from `@/lib/supabase/service-role-job`
 * for any privileged Admin/job work. Bare callers must be listed in
 * `service-role-legacy-imports.json` until migrated (orgId + reason required).
 */
export function createServiceRoleClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      'Missing environment variables for Supabase service role client. ' +
      'Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.'
    )
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

let _serviceRoleClient: SupabaseClient | null = null

export const serviceRoleClient: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    if (!_serviceRoleClient) {
      _serviceRoleClient = createServiceRoleClient()
    }
    return Reflect.get(_serviceRoleClient, prop, receiver)
  },
})