export const CREATOR_INTEROP_INSTITUTION_FLAG_NAMES = [
  "creator_interop_institution_readiness_enabled",
  "creator_interop_institution_legal_character_enabled",
  "creator_interop_institution_constitutive_instruments_enabled",
  "creator_interop_institution_state_participation_enabled",
  "creator_interop_institution_io_participation_enabled",
  "creator_interop_institution_observer_program_enabled",
  "creator_interop_institution_governance_sandbox_enabled",
  "creator_interop_institution_protocols_enabled",
  "creator_interop_institution_private_custodian_enabled",
  "creator_interop_institution_formal_depositary_enabled",
  "creator_interop_institution_article102_registration_enabled",
  "creator_interop_institution_un_relationship_enabled",
  "creator_interop_institution_specialized_agency_claim_enabled",
  "creator_interop_institution_relationship_agreements_enabled",
  "creator_interop_institution_public_law_services_enabled",
  "creator_interop_institution_trust_registries_enabled",
  "creator_interop_institution_rights_reference_enabled",
  "creator_interop_institution_capacity_building_enabled",
  "creator_interop_institution_global_fund_enabled",
  "creator_interop_institution_assessed_contributions_enabled",
  "creator_interop_institution_voluntary_contributions_enabled",
  "creator_interop_institution_service_fees_enabled",
  "creator_interop_institution_headquarters_enabled",
  "creator_interop_institution_privileges_enabled",
  "creator_interop_institution_staff_justice_enabled",
  "creator_interop_institution_public_registry_enabled",
  "creator_interop_institution_collective_action_enabled",
  "creator_interop_institution_global_representation_enabled",
  "creator_interop_institution_regulatory_power_enabled",
  "creator_interop_institution_production_enabled",
] as const

export type CreatorInteropInstitutionFlagName = (typeof CREATOR_INTEROP_INSTITUTION_FLAG_NAMES)[number]
export type CreatorInteropInstitutionFlags = Record<CreatorInteropInstitutionFlagName, boolean>

export const DISABLED_CREATOR_INTEROP_INSTITUTION_FLAGS = Object.fromEntries(
  CREATOR_INTEROP_INSTITUTION_FLAG_NAMES.map((name) => [name, false]),
) as CreatorInteropInstitutionFlags

export const HARD_DISABLED_INTEROP_INSTITUTION_FLAGS = [
  "creator_interop_institution_formal_depositary_enabled",
  "creator_interop_institution_article102_registration_enabled",
  "creator_interop_institution_un_relationship_enabled",
  "creator_interop_institution_specialized_agency_claim_enabled",
  "creator_interop_institution_privileges_enabled",
  "creator_interop_institution_assessed_contributions_enabled",
  "creator_interop_institution_collective_action_enabled",
  "creator_interop_institution_global_representation_enabled",
  "creator_interop_institution_regulatory_power_enabled",
  "creator_interop_institution_production_enabled",
] as const

export function stableRolloutBucket(subject: string, flag: string): number {
  let hash = 2166136261
  for (const character of `${flag}:${subject}`) {
    hash ^= character.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0) % 100
}

export async function resolveCreatorInteropInstitutionFlags(
  supabase: any,
  subjectId?: string | null,
): Promise<CreatorInteropInstitutionFlags> {
  const { getTrustedMusicWriteClient } = await import("@/lib/music/music-access")
  const readClient = await getTrustedMusicWriteClient(supabase)
  const { data, error } = await readClient
    .from("feature_flags")
    .select("key, enabled, rollout_percentage")
    .in("key", [...CREATOR_INTEROP_INSTITUTION_FLAG_NAMES])

  if (error || !data) return { ...DISABLED_CREATOR_INTEROP_INSTITUTION_FLAGS }
  const result = { ...DISABLED_CREATOR_INTEROP_INSTITUTION_FLAGS }
  for (const row of data as Array<{
    key: CreatorInteropInstitutionFlagName
    enabled: boolean
    rollout_percentage: number
  }>) {
    if (!CREATOR_INTEROP_INSTITUTION_FLAG_NAMES.includes(row.key)) continue
    if ((HARD_DISABLED_INTEROP_INSTITUTION_FLAGS as readonly string[]).includes(row.key)) {
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
