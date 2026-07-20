export const CREATOR_PROTOCOL_CONSTITUTION_FLAG_NAMES = [
  "creator_protocol_constitution_readiness_enabled",
  "creator_protocol_constitution_drafting_enabled",
  "creator_protocol_compact_membership_enabled",
  "creator_protocol_local_sovereignty_enabled",
  "creator_protocol_fundamental_provisions_enabled",
  "creator_protocol_amendment_process_enabled",
  "creator_protocol_independent_review_enabled",
  "creator_protocol_public_deliberation_enabled",
  "creator_protocol_asset_covenant_enabled",
  "creator_protocol_multi_root_trust_enabled",
  "creator_protocol_fork_continuity_sandbox_enabled",
  "creator_protocol_operator_constitution_enabled",
  "creator_protocol_compact_sandbox_enabled",
  "creator_protocol_public_status_enabled",
  "creator_protocol_limited_production_enabled",
  "creator_protocol_irreversible_asset_transfer_enabled",
  "creator_protocol_universal_identifier_enabled",
  "creator_protocol_global_mandate_enabled",
  "creator_protocol_collective_action_enabled",
  "creator_protocol_tokenized_governance_enabled",
  "creator_protocol_emergency_override_enabled",
] as const

export type CreatorProtocolConstitutionFlagName = (typeof CREATOR_PROTOCOL_CONSTITUTION_FLAG_NAMES)[number]
export type CreatorProtocolConstitutionFlags = Record<CreatorProtocolConstitutionFlagName, boolean>

export const DISABLED_CREATOR_PROTOCOL_CONSTITUTION_FLAGS = Object.fromEntries(
  CREATOR_PROTOCOL_CONSTITUTION_FLAG_NAMES.map((name) => [name, false]),
) as CreatorProtocolConstitutionFlags

export const HARD_DISABLED_PROTOCOL_CONSTITUTION_FLAGS = [
  "creator_protocol_irreversible_asset_transfer_enabled",
  "creator_protocol_universal_identifier_enabled",
  "creator_protocol_global_mandate_enabled",
  "creator_protocol_collective_action_enabled",
  "creator_protocol_tokenized_governance_enabled",
  "creator_protocol_emergency_override_enabled",
] as const

export function stableRolloutBucket(subject: string, flag: string): number {
  let hash = 2166136261
  for (const character of `${flag}:${subject}`) {
    hash ^= character.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0) % 100
}

export async function resolveCreatorProtocolConstitutionFlags(
  supabase: any,
  subjectId?: string | null,
): Promise<CreatorProtocolConstitutionFlags> {
  const { getTrustedMusicWriteClient } = await import("@/lib/music/music-access")
  const readClient = await getTrustedMusicWriteClient(supabase)
  const { data, error } = await readClient
    .from("feature_flags")
    .select("key, enabled, rollout_percentage")
    .in("key", [...CREATOR_PROTOCOL_CONSTITUTION_FLAG_NAMES])

  if (error || !data) return { ...DISABLED_CREATOR_PROTOCOL_CONSTITUTION_FLAGS }
  const result = { ...DISABLED_CREATOR_PROTOCOL_CONSTITUTION_FLAGS }
  for (const row of data as Array<{
    key: CreatorProtocolConstitutionFlagName
    enabled: boolean
    rollout_percentage: number
  }>) {
    if (!CREATOR_PROTOCOL_CONSTITUTION_FLAG_NAMES.includes(row.key)) continue
    if ((HARD_DISABLED_PROTOCOL_CONSTITUTION_FLAGS as readonly string[]).includes(row.key)) {
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
