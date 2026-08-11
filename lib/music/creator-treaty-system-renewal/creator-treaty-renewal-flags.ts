export const CREATOR_TREATY_RENEWAL_FLAG_NAMES = [
  "creator_treaty_renewal_readiness_enabled",
  "creator_treaty_renewal_repeated_cycles_enabled",
  "creator_treaty_renewal_legal_character_enabled",
  "creator_treaty_renewal_future_generations_enabled",
  "creator_treaty_renewal_intergenerational_assembly_enabled",
  "creator_treaty_renewal_sunset_enabled",
  "creator_treaty_renewal_authority_revalidation_enabled",
  "creator_treaty_renewal_succession_enabled",
  "creator_treaty_renewal_local_sovereignty_enabled",
  "creator_treaty_renewal_foresight_enabled",
  "creator_treaty_renewal_risk_register_enabled",
  "creator_treaty_renewal_archives_enabled",
  "creator_treaty_renewal_digital_preservation_enabled",
  "creator_treaty_renewal_evidence_replay_enabled",
  "creator_treaty_renewal_archive_transfer_enabled",
  "creator_treaty_renewal_technology_migration_enabled",
  "creator_treaty_renewal_crypto_agility_enabled",
  "creator_treaty_renewal_identifier_migration_enabled",
  "creator_treaty_renewal_conference_enabled",
  "creator_treaty_renewal_public_consultation_enabled",
  "creator_treaty_renewal_protocol_portfolio_enabled",
  "creator_treaty_renewal_service_decommission_enabled",
  "creator_treaty_renewal_leadership_succession_enabled",
  "creator_treaty_renewal_workforce_transfer_enabled",
  "creator_treaty_renewal_endowment_enabled",
  "creator_treaty_renewal_anti_capture_enabled",
  "creator_treaty_renewal_public_service_floor_enabled",
  "creator_treaty_renewal_arrangements_review_enabled",
  "creator_treaty_renewal_privilege_revalidation_enabled",
  "creator_treaty_renewal_oversight_refresh_enabled",
  "creator_treaty_renewal_outcome_evaluation_enabled",
  "creator_treaty_renewal_intergenerational_equity_enabled",
  "creator_treaty_renewal_archive_public_access_enabled",
  "creator_treaty_renewal_dissolution_enabled",
  "creator_treaty_renewal_public_activation_enabled",
  "creator_treaty_renewal_phase19_handoff_enabled",
] as const

export type CreatorTreatyRenewalFlagName = (typeof CREATOR_TREATY_RENEWAL_FLAG_NAMES)[number]
export type CreatorTreatyRenewalFlags = Record<CreatorTreatyRenewalFlagName, boolean>

export const DISABLED_CREATOR_TREATY_RENEWAL_FLAGS = Object.fromEntries(
  CREATOR_TREATY_RENEWAL_FLAG_NAMES.map((name) => [name, false]),
) as CreatorTreatyRenewalFlags

export const HARD_DISABLED_TREATY_RENEWAL_FLAGS = [
  "creator_treaty_renewal_public_activation_enabled",
  "creator_treaty_renewal_privilege_revalidation_enabled",
  "creator_treaty_renewal_dissolution_enabled",
  "creator_treaty_renewal_endowment_enabled",
  "creator_treaty_renewal_arrangements_review_enabled",
  "creator_treaty_renewal_archive_public_access_enabled",
  "creator_treaty_renewal_conference_enabled",
  "creator_treaty_renewal_phase19_handoff_enabled",
] as const

export function stableRolloutBucket(subject: string, flag: string): number {
  let hash = 2166136261
  for (const character of `${flag}:${subject}`) {
    hash ^= character.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0) % 100
}

export async function resolveCreatorTreatyRenewalFlags(
  supabase: any,
  subjectId?: string | null,
): Promise<CreatorTreatyRenewalFlags> {
  const { getTrustedMusicWriteClient } = await import("@/lib/music/music-access")
  const readClient = await getTrustedMusicWriteClient(supabase)
  const { data, error } = await readClient
    .from("feature_flags")
    .select("key, enabled, rollout_percentage")
    .in("key", [...CREATOR_TREATY_RENEWAL_FLAG_NAMES])

  if (error || !data) return { ...DISABLED_CREATOR_TREATY_RENEWAL_FLAGS }
  const result = { ...DISABLED_CREATOR_TREATY_RENEWAL_FLAGS }
  for (const row of data as Array<{
    key: CreatorTreatyRenewalFlagName
    enabled: boolean
    rollout_percentage: number
  }>) {
    if (!CREATOR_TREATY_RENEWAL_FLAG_NAMES.includes(row.key)) continue
    if ((HARD_DISABLED_TREATY_RENEWAL_FLAGS as readonly string[]).includes(row.key)) {
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
