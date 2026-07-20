export const MUSIC_RIGHTS_INTELLIGENCE_FLAG_NAMES = [
  "music_rights_intelligence_consent_enabled",
  "music_rights_intelligence_datasets_enabled",
  "music_rights_intelligence_cohorts_enabled",
  "music_rights_intelligence_metrics_enabled",
  "music_rights_intelligence_benchmarks_enabled",
  "music_rights_intelligence_education_enabled",
  "music_rights_intelligence_alerts_enabled",
  "music_rights_intelligence_groups_enabled",
  "music_rights_intelligence_clean_rooms_enabled",
  "music_rights_intelligence_admin_ops_enabled",
  "music_rights_intelligence_external_negotiation_enabled",
  "music_rights_intelligence_collective_licensing_enabled",
  "music_rights_intelligence_representation_enabled",
  "music_rights_intelligence_benchmark_public_publish_enabled",
] as const

export type MusicRightsIntelligenceFlagName = (typeof MUSIC_RIGHTS_INTELLIGENCE_FLAG_NAMES)[number]
export type MusicRightsIntelligenceFlags = Record<MusicRightsIntelligenceFlagName, boolean>

export const DISABLED_MUSIC_RIGHTS_INTELLIGENCE_FLAGS = Object.fromEntries(
  MUSIC_RIGHTS_INTELLIGENCE_FLAG_NAMES.map((name) => [name, false]),
) as MusicRightsIntelligenceFlags

export function stableRolloutBucket(subject: string, flag: string): number {
  let hash = 2166136261
  for (const character of `${flag}:${subject}`) {
    hash ^= character.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0) % 100
}

export async function resolveMusicRightsIntelligenceFlags(
  supabase: any,
  subjectId?: string | null,
): Promise<MusicRightsIntelligenceFlags> {
  const { getTrustedMusicWriteClient } = await import("@/lib/music/music-access")
  const readClient = await getTrustedMusicWriteClient(supabase)
  const { data, error } = await readClient
    .from("feature_flags")
    .select("key, enabled, rollout_percentage")
    .in("key", [...MUSIC_RIGHTS_INTELLIGENCE_FLAG_NAMES])

  if (error || !data) return { ...DISABLED_MUSIC_RIGHTS_INTELLIGENCE_FLAGS }
  const result = { ...DISABLED_MUSIC_RIGHTS_INTELLIGENCE_FLAGS }
  for (const row of data as Array<{
    key: MusicRightsIntelligenceFlagName
    enabled: boolean
    rollout_percentage: number
  }>) {
    if (!MUSIC_RIGHTS_INTELLIGENCE_FLAG_NAMES.includes(row.key)) continue
    const percentage = Math.min(100, Math.max(0, row.rollout_percentage || 0))
    result[row.key] =
      row.enabled &&
      (percentage === 100 || Boolean(subjectId && stableRolloutBucket(subjectId, row.key) < percentage))
  }
  return result
}
