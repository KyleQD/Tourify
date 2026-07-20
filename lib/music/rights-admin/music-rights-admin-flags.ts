export const MUSIC_RIGHTS_ADMIN_FLAG_NAMES = [
  "music_rights_admin_mandates_enabled",
  "music_rights_admin_cases_enabled",
  "music_rights_admin_registration_enabled",
  "music_rights_admin_matching_enabled",
  "music_rights_admin_usage_enabled",
  "music_rights_admin_claims_enabled",
  "music_rights_admin_mechanical_enabled",
  "music_rights_admin_neighboring_enabled",
  "music_rights_admin_platform_claims_enabled",
  "music_rights_admin_enforcement_enabled",
  "music_rights_admin_dmca_enabled",
  "music_rights_admin_settlements_enabled",
  "music_rights_admin_partners_enabled",
  "music_rights_admin_admin_ops_enabled",
  "music_rights_admin_automated_submission_enabled",
  "music_rights_admin_auto_takedown_enabled",
  "music_rights_admin_litigation_enabled",
] as const

export type MusicRightsAdminFlagName = (typeof MUSIC_RIGHTS_ADMIN_FLAG_NAMES)[number]
export type MusicRightsAdminFlags = Record<MusicRightsAdminFlagName, boolean>

export const DISABLED_MUSIC_RIGHTS_ADMIN_FLAGS = Object.fromEntries(
  MUSIC_RIGHTS_ADMIN_FLAG_NAMES.map((name) => [name, false]),
) as MusicRightsAdminFlags

export function stableRolloutBucket(subject: string, flag: string): number {
  let hash = 2166136261
  for (const character of `${flag}:${subject}`) {
    hash ^= character.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0) % 100
}

export async function resolveMusicRightsAdminFlags(
  supabase: any,
  subjectId?: string | null,
): Promise<MusicRightsAdminFlags> {
  const { getTrustedMusicWriteClient } = await import("@/lib/music/music-access")
  const readClient = await getTrustedMusicWriteClient(supabase)
  const { data, error } = await readClient
    .from("feature_flags")
    .select("key, enabled, rollout_percentage")
    .in("key", [...MUSIC_RIGHTS_ADMIN_FLAG_NAMES])

  if (error || !data) return { ...DISABLED_MUSIC_RIGHTS_ADMIN_FLAGS }
  const result = { ...DISABLED_MUSIC_RIGHTS_ADMIN_FLAGS }
  for (const row of data as Array<{
    key: MusicRightsAdminFlagName
    enabled: boolean
    rollout_percentage: number
  }>) {
    if (!MUSIC_RIGHTS_ADMIN_FLAG_NAMES.includes(row.key)) continue
    const percentage = Math.min(100, Math.max(0, row.rollout_percentage || 0))
    result[row.key] =
      row.enabled &&
      (percentage === 100 || Boolean(subjectId && stableRolloutBucket(subjectId, row.key) < percentage))
  }
  return result
}
