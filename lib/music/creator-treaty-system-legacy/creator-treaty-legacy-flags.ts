export const CREATOR_TREATY_LEGACY_FLAG_NAMES = [
  "creator_treaty_legacy_readiness_enabled",
  "creator_treaty_legacy_century_scale_strategy_enabled",
  "creator_treaty_legacy_successor_custody_enabled",
  "creator_treaty_legacy_cultural_continuity_enabled",
  "creator_treaty_legacy_identifier_resolution_enabled",
  "creator_treaty_legacy_protocol_resolution_enabled",
  "creator_treaty_legacy_post_dissolution_stewardship_enabled",
  "creator_treaty_legacy_sensitive_archive_ethics_enabled",
  "creator_treaty_legacy_open_specs_enabled",
  "creator_treaty_legacy_funding_continuity_enabled",
  "creator_treaty_legacy_disaster_recovery_enabled",
  "creator_treaty_legacy_provider_independence_enabled",
  "creator_treaty_legacy_public_legitimacy_enabled",
  "creator_treaty_legacy_public_activation_enabled",
  "creator_treaty_legacy_perpetual_authority_enabled",
  "creator_treaty_legacy_future_person_representation_enabled",
  "creator_treaty_legacy_privacy_override_enabled",
  "creator_treaty_legacy_universal_identity_enabled",
  "creator_treaty_legacy_ownership_adjudication_enabled",
  "creator_treaty_legacy_local_exit_block_enabled",
  "creator_treaty_legacy_sensitive_archive_public_dump_enabled",
  "creator_treaty_legacy_century_scale_launch_enabled",
  "creator_treaty_legacy_phase20_handoff_enabled",
] as const

export type CreatorTreatyLegacyFlagName = (typeof CREATOR_TREATY_LEGACY_FLAG_NAMES)[number]
export type CreatorTreatyLegacyFlags = Record<CreatorTreatyLegacyFlagName, boolean>

export const DISABLED_CREATOR_TREATY_LEGACY_FLAGS = Object.fromEntries(
  CREATOR_TREATY_LEGACY_FLAG_NAMES.map((name) => [name, false]),
) as CreatorTreatyLegacyFlags

export const HARD_DISABLED_TREATY_LEGACY_FLAGS = [
  "creator_treaty_legacy_public_activation_enabled",
  "creator_treaty_legacy_perpetual_authority_enabled",
  "creator_treaty_legacy_future_person_representation_enabled",
  "creator_treaty_legacy_privacy_override_enabled",
  "creator_treaty_legacy_universal_identity_enabled",
  "creator_treaty_legacy_ownership_adjudication_enabled",
  "creator_treaty_legacy_local_exit_block_enabled",
  "creator_treaty_legacy_sensitive_archive_public_dump_enabled",
  "creator_treaty_legacy_century_scale_launch_enabled",
  "creator_treaty_legacy_phase20_handoff_enabled",
] as const

export function stableRolloutBucket(subject: string, flag: string): number {
  let hash = 2166136261
  for (const character of `${flag}:${subject}`) {
    hash ^= character.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0) % 100
}

export async function resolveCreatorTreatyLegacyFlags(
  supabase: any,
  subjectId?: string | null,
): Promise<CreatorTreatyLegacyFlags> {
  const { getTrustedMusicWriteClient } = await import("@/lib/music/music-access")
  const readClient = await getTrustedMusicWriteClient(supabase)
  const { data, error } = await readClient
    .from("feature_flags")
    .select("key, enabled, rollout_percentage")
    .in("key", [...CREATOR_TREATY_LEGACY_FLAG_NAMES])

  if (error || !data) return { ...DISABLED_CREATOR_TREATY_LEGACY_FLAGS }
  const result = { ...DISABLED_CREATOR_TREATY_LEGACY_FLAGS }
  for (const row of data as Array<{
    key: CreatorTreatyLegacyFlagName
    enabled: boolean
    rollout_percentage: number
  }>) {
    if (!CREATOR_TREATY_LEGACY_FLAG_NAMES.includes(row.key)) continue
    if ((HARD_DISABLED_TREATY_LEGACY_FLAGS as readonly string[]).includes(row.key)) {
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
