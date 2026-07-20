export const MUSIC_MARKETPLACE_FLAG_NAMES = [
  "music_marketplace_offerings_enabled",
  "music_marketplace_investor_portal_enabled",
  "music_marketplace_subscriptions_enabled",
  "music_marketplace_transfers_enabled",
  "music_marketplace_secondary_sync_enabled",
  "music_marketplace_tokenization_enabled",
  "music_marketplace_admin_ops_enabled",
] as const

export type MusicMarketplaceFlagName = (typeof MUSIC_MARKETPLACE_FLAG_NAMES)[number]
export type MusicMarketplaceFlags = Record<MusicMarketplaceFlagName, boolean>

export const DISABLED_MUSIC_MARKETPLACE_FLAGS = Object.fromEntries(
  MUSIC_MARKETPLACE_FLAG_NAMES.map((name) => [name, false]),
) as MusicMarketplaceFlags

export function stableRolloutBucket(subject: string, flag: string): number {
  let hash = 2166136261
  for (const character of `${flag}:${subject}`) {
    hash ^= character.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0) % 100
}

export async function resolveMusicMarketplaceFlags(
  supabase: any,
  subjectId?: string | null,
): Promise<MusicMarketplaceFlags> {
  const { getTrustedMusicWriteClient } = await import("@/lib/music/music-access")
  const readClient = await getTrustedMusicWriteClient(supabase)
  const { data, error } = await readClient
    .from("feature_flags")
    .select("key, enabled, rollout_percentage")
    .in("key", [...MUSIC_MARKETPLACE_FLAG_NAMES])

  if (error || !data) return { ...DISABLED_MUSIC_MARKETPLACE_FLAGS }
  const result = { ...DISABLED_MUSIC_MARKETPLACE_FLAGS }
  for (const row of data as Array<{
    key: MusicMarketplaceFlagName
    enabled: boolean
    rollout_percentage: number
  }>) {
    if (!MUSIC_MARKETPLACE_FLAG_NAMES.includes(row.key)) continue
    const percentage = Math.min(100, Math.max(0, row.rollout_percentage || 0))
    result[row.key] =
      row.enabled &&
      (percentage === 100 || Boolean(subjectId && stableRolloutBucket(subjectId, row.key) < percentage))
  }
  return result
}
