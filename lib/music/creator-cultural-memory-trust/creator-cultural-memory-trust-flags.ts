export const CREATOR_CULTURAL_MEMORY_TRUST_FLAG_NAMES = [
  "creator_cultural_memory_trust_readiness_enabled",
  "creator_cultural_memory_trust_entity_enabled",
  "creator_cultural_memory_trust_charter_enabled",
  "creator_cultural_memory_trust_participation_enabled",
  "creator_cultural_memory_trust_deposit_enabled",
  "creator_cultural_memory_trust_withdrawal_enabled",
  "creator_cultural_memory_trust_cultural_authority_enabled",
  "creator_cultural_memory_trust_community_councils_enabled",
  "creator_cultural_memory_trust_indigenous_governance_enabled",
  "creator_cultural_memory_trust_appraisal_enabled",
  "creator_cultural_memory_trust_custodian_accreditation_enabled",
  "creator_cultural_memory_trust_distributed_custody_enabled",
  "creator_cultural_memory_trust_custody_transfer_enabled",
  "creator_cultural_memory_trust_preservation_profiles_enabled",
  "creator_cultural_memory_trust_information_packages_enabled",
  "creator_cultural_memory_trust_fixity_enabled",
  "creator_cultural_memory_trust_emulation_enabled",
  "creator_cultural_memory_trust_identifiers_enabled",
  "creator_cultural_memory_trust_crypto_succession_enabled",
  "creator_cultural_memory_trust_language_enabled",
  "creator_cultural_memory_trust_oral_tradition_enabled",
  "creator_cultural_memory_trust_sensitive_materials_enabled",
  "creator_cultural_memory_trust_privacy_embargo_enabled",
  "creator_cultural_memory_trust_mediated_access_enabled",
  "creator_cultural_memory_trust_dark_archive_enabled",
  "creator_cultural_memory_trust_public_finding_aids_enabled",
  "creator_cultural_memory_trust_repatriation_enabled",
  "creator_cultural_memory_trust_remediation_enabled",
  "creator_cultural_memory_trust_contested_records_enabled",
  "creator_cultural_memory_trust_rights_reference_enabled",
  "creator_cultural_memory_trust_ai_reuse_enabled",
  "creator_cultural_memory_trust_research_reuse_enabled",
  "creator_cultural_memory_trust_disaster_response_enabled",
  "creator_cultural_memory_trust_offline_copies_enabled",
  "creator_cultural_memory_trust_preservation_fund_enabled",
  "creator_cultural_memory_trust_provider_replacement_enabled",
  "creator_cultural_memory_trust_public_asset_register_enabled",
  "creator_cultural_memory_trust_external_assurance_enabled",
  "creator_cultural_memory_trust_public_activation_enabled",
  "creator_cultural_memory_trust_dissolution_enabled",
  "creator_cultural_memory_trust_tourify_unavailable_enabled",
  "creator_cultural_memory_trust_phase21_handoff_enabled",
] as const

export type CreatorCulturalMemoryTrustFlagName =
  (typeof CREATOR_CULTURAL_MEMORY_TRUST_FLAG_NAMES)[number]
export type CreatorCulturalMemoryTrustFlags = Record<CreatorCulturalMemoryTrustFlagName, boolean>

export const DISABLED_CREATOR_CULTURAL_MEMORY_TRUST_FLAGS = Object.fromEntries(
  CREATOR_CULTURAL_MEMORY_TRUST_FLAG_NAMES.map((name) => [name, false]),
) as CreatorCulturalMemoryTrustFlags

/** First-slice high-impact powers remain forced false even if DB rows are true. */
export const HARD_DISABLED_CULTURAL_MEMORY_TRUST_FLAGS = [
  "creator_cultural_memory_trust_public_activation_enabled",
  "creator_cultural_memory_trust_dark_archive_enabled",
  "creator_cultural_memory_trust_preservation_fund_enabled",
  "creator_cultural_memory_trust_dissolution_enabled",
  "creator_cultural_memory_trust_phase21_handoff_enabled",
] as const

export function stableRolloutBucket(subject: string, flag: string): number {
  let hash = 2166136261
  for (const character of `${flag}:${subject}`) {
    hash ^= character.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0) % 100
}

export async function resolveCreatorCulturalMemoryTrustFlags(
  supabase: any,
  subjectId?: string | null,
): Promise<CreatorCulturalMemoryTrustFlags> {
  const { getTrustedMusicWriteClient } = await import("@/lib/music/music-access")
  const readClient = await getTrustedMusicWriteClient(supabase)
  const { data, error } = await readClient
    .from("feature_flags")
    .select("key, enabled, rollout_percentage")
    .in("key", [...CREATOR_CULTURAL_MEMORY_TRUST_FLAG_NAMES])

  if (error || !data) return { ...DISABLED_CREATOR_CULTURAL_MEMORY_TRUST_FLAGS }
  const result = { ...DISABLED_CREATOR_CULTURAL_MEMORY_TRUST_FLAGS }
  for (const row of data as Array<{
    key: CreatorCulturalMemoryTrustFlagName
    enabled: boolean
    rollout_percentage: number
  }>) {
    if (!CREATOR_CULTURAL_MEMORY_TRUST_FLAG_NAMES.includes(row.key)) continue
    if ((HARD_DISABLED_CULTURAL_MEMORY_TRUST_FLAGS as readonly string[]).includes(row.key)) {
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
