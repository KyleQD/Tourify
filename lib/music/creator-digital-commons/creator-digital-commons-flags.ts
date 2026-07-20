export const CREATOR_DIGITAL_COMMONS_FLAG_NAMES = [
  "creator_digital_commons_readiness_enabled",
  "creator_digital_commons_steward_entity_enabled",
  "creator_digital_commons_participation_enabled",
  "creator_digital_commons_asset_register_enabled",
  "creator_digital_commons_asset_escrow_enabled",
  "creator_digital_commons_protocol_governance_enabled",
  "creator_digital_commons_registry_sandbox_enabled",
  "creator_digital_commons_identifier_sandbox_enabled",
  "creator_digital_commons_credentials_sandbox_enabled",
  "creator_digital_commons_conformance_enabled",
  "creator_digital_commons_operator_accreditation_enabled",
  "creator_digital_commons_public_api_sandbox_enabled",
  "creator_digital_commons_transition_escrow_enabled",
  "creator_digital_commons_public_status_enabled",
  "creator_digital_commons_limited_production_enabled",
  "creator_digital_commons_irreversible_asset_transfer_enabled",
  "creator_digital_commons_universal_identifier_enabled",
  "creator_digital_commons_global_mandate_enabled",
  "creator_digital_commons_collective_action_enabled",
  "creator_digital_commons_tokenized_identity_enabled",
] as const

export type CreatorDigitalCommonsFlagName = (typeof CREATOR_DIGITAL_COMMONS_FLAG_NAMES)[number]
export type CreatorDigitalCommonsFlags = Record<CreatorDigitalCommonsFlagName, boolean>

export const DISABLED_CREATOR_DIGITAL_COMMONS_FLAGS = Object.fromEntries(
  CREATOR_DIGITAL_COMMONS_FLAG_NAMES.map((name) => [name, false]),
) as CreatorDigitalCommonsFlags

export const HARD_DISABLED_DIGITAL_COMMONS_FLAGS = [
  "creator_digital_commons_irreversible_asset_transfer_enabled",
  "creator_digital_commons_universal_identifier_enabled",
  "creator_digital_commons_global_mandate_enabled",
  "creator_digital_commons_collective_action_enabled",
  "creator_digital_commons_tokenized_identity_enabled",
] as const

export function stableRolloutBucket(subject: string, flag: string): number {
  let hash = 2166136261
  for (const character of `${flag}:${subject}`) {
    hash ^= character.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0) % 100
}

export async function resolveCreatorDigitalCommonsFlags(
  supabase: any,
  subjectId?: string | null,
): Promise<CreatorDigitalCommonsFlags> {
  const { getTrustedMusicWriteClient } = await import("@/lib/music/music-access")
  const readClient = await getTrustedMusicWriteClient(supabase)
  const { data, error } = await readClient
    .from("feature_flags")
    .select("key, enabled, rollout_percentage")
    .in("key", [...CREATOR_DIGITAL_COMMONS_FLAG_NAMES])

  if (error || !data) return { ...DISABLED_CREATOR_DIGITAL_COMMONS_FLAGS }
  const result = { ...DISABLED_CREATOR_DIGITAL_COMMONS_FLAGS }
  for (const row of data as Array<{
    key: CreatorDigitalCommonsFlagName
    enabled: boolean
    rollout_percentage: number
  }>) {
    if (!CREATOR_DIGITAL_COMMONS_FLAG_NAMES.includes(row.key)) continue
    if ((HARD_DISABLED_DIGITAL_COMMONS_FLAGS as readonly string[]).includes(row.key)) {
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
