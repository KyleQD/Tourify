export const CREATOR_INTEROP_CONVENTION_FLAG_NAMES = [
  "creator_interop_convention_readiness_enabled",
  "creator_interop_convention_drafting_enabled",
  "creator_interop_network_registry_enabled",
  "creator_interop_mutual_recognition_enabled",
  "creator_interop_approval_package_enabled",
  "creator_interop_public_status_enabled",
  "creator_interop_limited_production_enabled",
  "creator_interop_treaty_status_enabled",
  "creator_interop_universal_representation_enabled",
  "creator_interop_state_io_participation_enabled",
  "creator_interop_collective_action_enabled",
  "creator_interop_irreversible_asset_transfer_enabled",
  "creator_interop_emergency_override_enabled",
] as const

export type CreatorInteropConventionFlagName = (typeof CREATOR_INTEROP_CONVENTION_FLAG_NAMES)[number]
export type CreatorInteropConventionFlags = Record<CreatorInteropConventionFlagName, boolean>

export const DISABLED_CREATOR_INTEROP_CONVENTION_FLAGS = Object.fromEntries(
  CREATOR_INTEROP_CONVENTION_FLAG_NAMES.map((name) => [name, false]),
) as CreatorInteropConventionFlags

export const HARD_DISABLED_INTEROP_CONVENTION_FLAGS = [
  "creator_interop_treaty_status_enabled",
  "creator_interop_universal_representation_enabled",
  "creator_interop_state_io_participation_enabled",
  "creator_interop_collective_action_enabled",
  "creator_interop_irreversible_asset_transfer_enabled",
  "creator_interop_emergency_override_enabled",
] as const

export function stableRolloutBucket(subject: string, flag: string): number {
  let hash = 2166136261
  for (const character of `${flag}:${subject}`) {
    hash ^= character.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0) % 100
}

export async function resolveCreatorInteropConventionFlags(
  supabase: any,
  subjectId?: string | null,
): Promise<CreatorInteropConventionFlags> {
  const { getTrustedMusicWriteClient } = await import("@/lib/music/music-access")
  const readClient = await getTrustedMusicWriteClient(supabase)
  const { data, error } = await readClient
    .from("feature_flags")
    .select("key, enabled, rollout_percentage")
    .in("key", [...CREATOR_INTEROP_CONVENTION_FLAG_NAMES])

  if (error || !data) return { ...DISABLED_CREATOR_INTEROP_CONVENTION_FLAGS }
  const result = { ...DISABLED_CREATOR_INTEROP_CONVENTION_FLAGS }
  for (const row of data as Array<{
    key: CreatorInteropConventionFlagName
    enabled: boolean
    rollout_percentage: number
  }>) {
    if (!CREATOR_INTEROP_CONVENTION_FLAG_NAMES.includes(row.key)) continue
    if ((HARD_DISABLED_INTEROP_CONVENTION_FLAGS as readonly string[]).includes(row.key)) {
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
