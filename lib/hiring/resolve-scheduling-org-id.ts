import type { SupabaseClient } from "@supabase/supabase-js"
import type { HiringEntity } from "@/types/hiring-entity"

/**
 * Resolve organizations.id for employer-scoped staff_shifts.
 * Accepts organizer_accounts.id, organizations.id, or owner user_id.
 */
export async function resolveSchedulingOrgId(args: {
  supabase: SupabaseClient
  employer: HiringEntity
}): Promise<string | null> {
  const { supabase, employer } = args

  if (employer.entityType === "venue") return null

  if (employer.entityType === "organization") {
    const asOrg = await supabase
      .from("organizations")
      .select("id")
      .eq("id", employer.entityId)
      .maybeSingle()
    if (asOrg.data?.id) return String(asOrg.data.id)

    const byOrganizerId = await supabase
      .from("organizer_accounts")
      .select("ops_org_id")
      .eq("id", employer.entityId)
      .maybeSingle()
    if (byOrganizerId.data?.ops_org_id) return String(byOrganizerId.data.ops_org_id)

    const byUser = await supabase
      .from("organizer_accounts")
      .select("ops_org_id")
      .eq("user_id", employer.entityId)
      .maybeSingle()
    if (byUser.data?.ops_org_id) return String(byUser.data.ops_org_id)
  }

  return null
}
