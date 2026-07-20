export const MUSIC_LICENSING_FLAG_NAMES = [
  "music_licensing_availability_enabled",
  "music_licensing_briefs_enabled",
  "music_licensing_requests_enabled",
  "music_licensing_quotes_enabled",
  "music_licensing_agreements_enabled",
  "music_licensing_delivery_enabled",
  "music_licensing_cues_usage_enabled",
  "music_licensing_payments_enabled",
  "music_licensing_ai_enabled",
  "music_licensing_ddex_enabled",
  "music_licensing_admin_ops_enabled",
  "music_licensing_automated_pricing_enabled",
  "music_licensing_multi_territory_direct_enabled",
  "music_licensing_self_service_enabled",
] as const

export type MusicLicensingFlagName = (typeof MUSIC_LICENSING_FLAG_NAMES)[number]
export type MusicLicensingFlags = Record<MusicLicensingFlagName, boolean>

export const DISABLED_MUSIC_LICENSING_FLAGS = Object.fromEntries(
  MUSIC_LICENSING_FLAG_NAMES.map((name) => [name, false]),
) as MusicLicensingFlags

export function stableRolloutBucket(subject: string, flag: string): number {
  let hash = 2166136261
  for (const character of `${flag}:${subject}`) {
    hash ^= character.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0) % 100
}

export async function resolveMusicLicensingFlags(
  supabase: any,
  subjectId?: string | null,
): Promise<MusicLicensingFlags> {
  const { getTrustedMusicWriteClient } = await import("@/lib/music/music-access")
  const readClient = await getTrustedMusicWriteClient(supabase)
  const { data, error } = await readClient
    .from("feature_flags")
    .select("key, enabled, rollout_percentage")
    .in("key", [...MUSIC_LICENSING_FLAG_NAMES])

  if (error || !data) return { ...DISABLED_MUSIC_LICENSING_FLAGS }
  const result = { ...DISABLED_MUSIC_LICENSING_FLAGS }
  for (const row of data as Array<{
    key: MusicLicensingFlagName
    enabled: boolean
    rollout_percentage: number
  }>) {
    if (!MUSIC_LICENSING_FLAG_NAMES.includes(row.key)) continue
    const percentage = Math.min(100, Math.max(0, row.rollout_percentage || 0))
    result[row.key] =
      row.enabled &&
      (percentage === 100 || Boolean(subjectId && stableRolloutBucket(subjectId, row.key) < percentage))
  }
  return result
}
