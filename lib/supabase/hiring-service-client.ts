import { createServiceRoleClient } from "@/lib/supabase/service-role"
import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * Server-only Supabase service client for token onboarding routes.
 */
export function createHiringServiceClient(): SupabaseClient {
  return createServiceRoleClient()
}
