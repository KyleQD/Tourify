export const CREATOR_PUBLIC_INFRASTRUCTURE_FLAG_NAMES = [
  "creator_public_infrastructure_readiness_enabled",
  "creator_public_infrastructure_entity_enabled",
  "creator_public_infrastructure_participation_enabled",
  "creator_public_infrastructure_identifier_enabled",
  "creator_public_infrastructure_trust_registry_enabled",
  "creator_public_infrastructure_credentials_enabled",
  "creator_public_infrastructure_rights_resolver_enabled",
  "creator_public_infrastructure_service_directory_enabled",
  "creator_public_infrastructure_conformance_enabled",
  "creator_public_infrastructure_public_api_enabled",
  "creator_public_infrastructure_open_source_enabled",
  "creator_public_infrastructure_cross_border_enabled",
  "creator_public_infrastructure_transparency_log_enabled",
  "creator_public_infrastructure_research_enabled",
  "creator_public_infrastructure_funding_enabled",
  "creator_public_infrastructure_regulator_gateway_enabled",
  "creator_public_infrastructure_universal_identifier_enabled",
  "creator_public_infrastructure_global_mandate_enabled",
  "creator_public_infrastructure_collective_action_enabled",
  "creator_public_infrastructure_tokenized_identity_enabled",
  "creator_public_infrastructure_admin_ops_enabled",
] as const

export type CreatorPublicInfrastructureFlagName = (typeof CREATOR_PUBLIC_INFRASTRUCTURE_FLAG_NAMES)[number]
export type CreatorPublicInfrastructureFlags = Record<CreatorPublicInfrastructureFlagName, boolean>

export const DISABLED_CREATOR_PUBLIC_INFRASTRUCTURE_FLAGS = Object.fromEntries(
  CREATOR_PUBLIC_INFRASTRUCTURE_FLAG_NAMES.map((name) => [name, false]),
) as CreatorPublicInfrastructureFlags

export const HARD_DISABLED_PUBLIC_INFRASTRUCTURE_FLAGS = [
  "creator_public_infrastructure_universal_identifier_enabled",
  "creator_public_infrastructure_global_mandate_enabled",
  "creator_public_infrastructure_collective_action_enabled",
  "creator_public_infrastructure_tokenized_identity_enabled",
] as const

export function stableRolloutBucket(subject: string, flag: string): number {
  let hash = 2166136261
  for (const character of `${flag}:${subject}`) {
    hash ^= character.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0) % 100
}

export async function resolveCreatorPublicInfrastructureFlags(
  supabase: any,
  subjectId?: string | null,
): Promise<CreatorPublicInfrastructureFlags> {
  const { getTrustedMusicWriteClient } = await import("@/lib/music/music-access")
  const readClient = await getTrustedMusicWriteClient(supabase)
  const { data, error } = await readClient
    .from("feature_flags")
    .select("key, enabled, rollout_percentage")
    .in("key", [...CREATOR_PUBLIC_INFRASTRUCTURE_FLAG_NAMES])

  if (error || !data) return { ...DISABLED_CREATOR_PUBLIC_INFRASTRUCTURE_FLAGS }
  const result = { ...DISABLED_CREATOR_PUBLIC_INFRASTRUCTURE_FLAGS }
  for (const row of data as Array<{
    key: CreatorPublicInfrastructureFlagName
    enabled: boolean
    rollout_percentage: number
  }>) {
    if (!CREATOR_PUBLIC_INFRASTRUCTURE_FLAG_NAMES.includes(row.key)) continue
    // Hard-disabled flags never enable even if DB row is flipped without counsel package
    if ((HARD_DISABLED_PUBLIC_INFRASTRUCTURE_FLAGS as readonly string[]).includes(row.key)) {
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
