export const CREATOR_INTEROP_ORG_FLAG_NAMES = [
  "creator_interop_org_readiness_enabled",
  "creator_interop_org_entity_options_enabled",
  "creator_interop_org_constitutive_drafting_enabled",
  "creator_interop_org_participant_applications_enabled",
  "creator_interop_org_observer_program_enabled",
  "creator_interop_org_governance_sandbox_enabled",
  "creator_interop_org_headquarters_readiness_enabled",
  "creator_interop_org_privileges_enabled",
  "creator_interop_org_member_state_status_enabled",
  "creator_interop_org_io_membership_enabled",
  "creator_interop_org_treaty_status_enabled",
  "creator_interop_org_depositary_enabled",
  "creator_interop_org_un_relationship_enabled",
  "creator_interop_org_specialized_agency_claim_enabled",
  "creator_interop_org_assessed_contributions_enabled",
  "creator_interop_org_voluntary_funding_enabled",
  "creator_interop_org_service_fees_enabled",
  "creator_interop_org_staff_regime_enabled",
  "creator_interop_org_admin_justice_enabled",
  "creator_interop_org_relationship_agreements_enabled",
  "creator_interop_org_public_registry_enabled",
  "creator_interop_org_conformance_enabled",
  "creator_interop_org_capacity_building_enabled",
  "creator_interop_org_collective_action_enabled",
  "creator_interop_org_regulatory_power_enabled",
  "creator_interop_org_diplomatic_status_enabled",
  "creator_interop_org_production_enabled",
] as const

export type CreatorInteropOrgFlagName = (typeof CREATOR_INTEROP_ORG_FLAG_NAMES)[number]
export type CreatorInteropOrgFlags = Record<CreatorInteropOrgFlagName, boolean>

export const DISABLED_CREATOR_INTEROP_ORG_FLAGS = Object.fromEntries(
  CREATOR_INTEROP_ORG_FLAG_NAMES.map((name) => [name, false]),
) as CreatorInteropOrgFlags

export const HARD_DISABLED_INTEROP_ORG_FLAGS = [
  "creator_interop_org_privileges_enabled",
  "creator_interop_org_member_state_status_enabled",
  "creator_interop_org_io_membership_enabled",
  "creator_interop_org_treaty_status_enabled",
  "creator_interop_org_depositary_enabled",
  "creator_interop_org_un_relationship_enabled",
  "creator_interop_org_specialized_agency_claim_enabled",
  "creator_interop_org_assessed_contributions_enabled",
  "creator_interop_org_collective_action_enabled",
  "creator_interop_org_regulatory_power_enabled",
  "creator_interop_org_diplomatic_status_enabled",
  "creator_interop_org_production_enabled",
] as const

export function stableRolloutBucket(subject: string, flag: string): number {
  let hash = 2166136261
  for (const character of `${flag}:${subject}`) {
    hash ^= character.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0) % 100
}

export async function resolveCreatorInteropOrgFlags(
  supabase: any,
  subjectId?: string | null,
): Promise<CreatorInteropOrgFlags> {
  const { getTrustedMusicWriteClient } = await import("@/lib/music/music-access")
  const readClient = await getTrustedMusicWriteClient(supabase)
  const { data, error } = await readClient
    .from("feature_flags")
    .select("key, enabled, rollout_percentage")
    .in("key", [...CREATOR_INTEROP_ORG_FLAG_NAMES])

  if (error || !data) return { ...DISABLED_CREATOR_INTEROP_ORG_FLAGS }
  const result = { ...DISABLED_CREATOR_INTEROP_ORG_FLAGS }
  for (const row of data as Array<{
    key: CreatorInteropOrgFlagName
    enabled: boolean
    rollout_percentage: number
  }>) {
    if (!CREATOR_INTEROP_ORG_FLAG_NAMES.includes(row.key)) continue
    if ((HARD_DISABLED_INTEROP_ORG_FLAGS as readonly string[]).includes(row.key)) {
      result[row.key] = false
      continue
    }
    const percentage = Math.min(100, Math.max(0, row.rollout_percentage || 0))
    result[row.key] =
      row.enabled &&
      (percentage === 100 || Boolean(subjectId && stableRolloutBucket(subjectId, row.key) < percentage))
  }
  return result
}
