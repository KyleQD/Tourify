export const CREATOR_COOPERATIVE_FLAG_NAMES = [
  "creator_cooperative_readiness_enabled",
  "creator_cooperative_membership_enabled",
  "creator_data_contribution_enabled",
  "creator_data_vault_enabled",
  "research_exchange_private_beta_enabled",
  "research_clean_room_enabled",
  "external_research_licensing_enabled",
  "member_benefit_allocation_enabled",
  "policy_observatory_enabled",
  "standards_participation_workspace_enabled",
  "public_policy_submission_enabled",
  "collective_entity_readiness_enabled",
  "collective_representation_enabled",
  "cross_border_research_enabled",
  "cooperative_token_or_transfer_enabled",
  "creator_cooperative_admin_ops_enabled",
] as const

export type CreatorCooperativeFlagName = (typeof CREATOR_COOPERATIVE_FLAG_NAMES)[number]
export type CreatorCooperativeFlags = Record<CreatorCooperativeFlagName, boolean>

export const DISABLED_CREATOR_COOPERATIVE_FLAGS = Object.fromEntries(
  CREATOR_COOPERATIVE_FLAG_NAMES.map((name) => [name, false]),
) as CreatorCooperativeFlags

export function stableRolloutBucket(subject: string, flag: string): number {
  let hash = 2166136261
  for (const character of `${flag}:${subject}`) {
    hash ^= character.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0) % 100
}

export async function resolveCreatorCooperativeFlags(
  supabase: any,
  subjectId?: string | null,
): Promise<CreatorCooperativeFlags> {
  const { getTrustedMusicWriteClient } = await import("@/lib/music/music-access")
  const readClient = await getTrustedMusicWriteClient(supabase)
  const { data, error } = await readClient
    .from("feature_flags")
    .select("key, enabled, rollout_percentage")
    .in("key", [...CREATOR_COOPERATIVE_FLAG_NAMES])

  if (error || !data) return { ...DISABLED_CREATOR_COOPERATIVE_FLAGS }
  const result = { ...DISABLED_CREATOR_COOPERATIVE_FLAGS }
  for (const row of data as Array<{
    key: CreatorCooperativeFlagName
    enabled: boolean
    rollout_percentage: number
  }>) {
    if (!CREATOR_COOPERATIVE_FLAG_NAMES.includes(row.key)) continue
    const percentage = Math.min(100, Math.max(0, row.rollout_percentage || 0))
    result[row.key] =
      row.enabled &&
      (percentage === 100 || Boolean(subjectId && stableRolloutBucket(subjectId, row.key) < percentage))
  }
  return result
}
