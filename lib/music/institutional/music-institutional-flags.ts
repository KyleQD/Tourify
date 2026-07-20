export const MUSIC_INSTITUTIONAL_FLAG_NAMES = [
  "music_institutional_orgs_enabled",
  "music_institutional_deals_enabled",
  "music_institutional_dataroom_enabled",
  "music_institutional_diligence_enabled",
  "music_institutional_underwriting_enabled",
  "music_institutional_bids_auctions_enabled",
  "music_institutional_closings_enabled",
  "music_institutional_funds_enabled",
  "music_institutional_nav_enabled",
  "music_institutional_secondaries_enabled",
  "music_institutional_tokenization_enabled",
  "music_institutional_cross_border_enabled",
  "music_institutional_admin_ops_enabled",
] as const

export type MusicInstitutionalFlagName = (typeof MUSIC_INSTITUTIONAL_FLAG_NAMES)[number]
export type MusicInstitutionalFlags = Record<MusicInstitutionalFlagName, boolean>

export const DISABLED_MUSIC_INSTITUTIONAL_FLAGS = Object.fromEntries(
  MUSIC_INSTITUTIONAL_FLAG_NAMES.map((name) => [name, false]),
) as MusicInstitutionalFlags

export function stableRolloutBucket(subject: string, flag: string): number {
  let hash = 2166136261
  for (const character of `${flag}:${subject}`) {
    hash ^= character.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0) % 100
}

export async function resolveMusicInstitutionalFlags(
  supabase: any,
  subjectId?: string | null,
): Promise<MusicInstitutionalFlags> {
  const { getTrustedMusicWriteClient } = await import("@/lib/music/music-access")
  const readClient = await getTrustedMusicWriteClient(supabase)
  const { data, error } = await readClient
    .from("feature_flags")
    .select("key, enabled, rollout_percentage")
    .in("key", [...MUSIC_INSTITUTIONAL_FLAG_NAMES])

  if (error || !data) return { ...DISABLED_MUSIC_INSTITUTIONAL_FLAGS }
  const result = { ...DISABLED_MUSIC_INSTITUTIONAL_FLAGS }
  for (const row of data as Array<{
    key: MusicInstitutionalFlagName
    enabled: boolean
    rollout_percentage: number
  }>) {
    if (!MUSIC_INSTITUTIONAL_FLAG_NAMES.includes(row.key)) continue
    const percentage = Math.min(100, Math.max(0, row.rollout_percentage || 0))
    result[row.key] =
      row.enabled &&
      (percentage === 100 || Boolean(subjectId && stableRolloutBucket(subjectId, row.key) < percentage))
  }
  return result
}
