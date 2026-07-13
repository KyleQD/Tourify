import { createClient, type SupabaseClient } from "@supabase/supabase-js"

/**
 * Server-only Supabase service client for token onboarding routes.
 *
 * Use this only in route handlers/server services that require elevated access
 * to validate invitation tokens and bridge candidate data. Prefer the repo's
 * existing Supabase server helper if one exists, but keep service-role usage
 * scoped and audited.
 */
export function createHiringServiceClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is required for hiring service client")
  }

  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for token onboarding routes")
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
