export const CREATOR_FEDERATION_FLAG_NAMES = [
  "creator_federation_readiness_enabled",
  "creator_federation_entity_registry_enabled",
  "creator_federation_membership_enabled",
  "creator_federation_sovereignty_controls_enabled",
  "creator_federation_trust_registry_enabled",
  "creator_federation_credentials_enabled",
  "creator_federation_wallet_interop_enabled",
  "creator_federation_mandates_enabled",
  "creator_federation_governance_enabled",
  "creator_federation_voting_enabled",
  "creator_federation_cross_border_data_enabled",
  "creator_federation_research_enabled",
  "creator_federation_policy_observatory_enabled",
  "creator_federation_service_directory_enabled",
  "creator_federation_public_api_enabled",
  "creator_federation_finance_enabled",
  "creator_federation_representation_network_enabled",
  "creator_federation_collective_licensing_enabled",
  "creator_federation_collective_bargaining_enabled",
  "creator_federation_tokenized_membership_enabled",
  "creator_federation_admin_ops_enabled",
] as const

export type CreatorFederationFlagName = (typeof CREATOR_FEDERATION_FLAG_NAMES)[number]
export type CreatorFederationFlags = Record<CreatorFederationFlagName, boolean>

export const DISABLED_CREATOR_FEDERATION_FLAGS = Object.fromEntries(
  CREATOR_FEDERATION_FLAG_NAMES.map((name) => [name, false]),
) as CreatorFederationFlags

export function stableRolloutBucket(subject: string, flag: string): number {
  let hash = 2166136261
  for (const character of `${flag}:${subject}`) {
    hash ^= character.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0) % 100
}

export async function resolveCreatorFederationFlags(
  supabase: any,
  subjectId?: string | null,
): Promise<CreatorFederationFlags> {
  const { getTrustedMusicWriteClient } = await import("@/lib/music/music-access")
  const readClient = await getTrustedMusicWriteClient(supabase)
  const { data, error } = await readClient
    .from("feature_flags")
    .select("key, enabled, rollout_percentage")
    .in("key", [...CREATOR_FEDERATION_FLAG_NAMES])

  if (error || !data) return { ...DISABLED_CREATOR_FEDERATION_FLAGS }
  const result = { ...DISABLED_CREATOR_FEDERATION_FLAGS }
  for (const row of data as Array<{
    key: CreatorFederationFlagName
    enabled: boolean
    rollout_percentage: number
  }>) {
    if (!CREATOR_FEDERATION_FLAG_NAMES.includes(row.key)) continue
    const percentage = Math.min(100, Math.max(0, row.rollout_percentage || 0))
    result[row.key] =
      row.enabled &&
      (percentage === 100 || Boolean(subjectId && stableRolloutBucket(subjectId, row.key) < percentage))
  }
  return result
}
