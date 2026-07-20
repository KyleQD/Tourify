export const MUSIC_RIGHTS_FLAG_NAMES = [
  "music_rights_workspace_enabled",
  "music_catalog_import_enabled",
  "music_contributor_workflows_enabled",
  "music_agreements_enabled",
  "music_human_origin_v2_enabled",
  "music_rights_passport_enabled",
  "music_public_passport_verification_enabled",
  "music_c2pa_derivatives_enabled",
  "music_watermark_beta_enabled",
  "music_training_reservation_enabled",
  "music_testnet_anchor_enabled",
  "music_rights_ops_enabled",
] as const

export type MusicRightsFlagName = (typeof MUSIC_RIGHTS_FLAG_NAMES)[number]
export type MusicRightsFlags = Record<MusicRightsFlagName, boolean>

export const DISABLED_MUSIC_RIGHTS_FLAGS = Object.fromEntries(
  MUSIC_RIGHTS_FLAG_NAMES.map((name) => [name, false]),
) as MusicRightsFlags

export function stableRolloutBucket(subject: string, flag: string): number {
  let hash = 2166136261
  for (const character of `${flag}:${subject}`) {
    hash ^= character.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0) % 100
}

export async function resolveMusicRightsFlags(supabase: any, subjectId?: string | null): Promise<MusicRightsFlags> {
  const { getTrustedMusicWriteClient } = await import("@/lib/music/music-access")
  const readClient = await getTrustedMusicWriteClient(supabase)
  const { data, error } = await readClient
    .from("feature_flags")
    .select("key, enabled, rollout_percentage")
    .in("key", [...MUSIC_RIGHTS_FLAG_NAMES])

  if (error || !data) return { ...DISABLED_MUSIC_RIGHTS_FLAGS }
  const result = { ...DISABLED_MUSIC_RIGHTS_FLAGS }
  for (const row of data as Array<{ key: MusicRightsFlagName; enabled: boolean; rollout_percentage: number }>) {
    if (!MUSIC_RIGHTS_FLAG_NAMES.includes(row.key)) continue
    const percentage = Math.min(100, Math.max(0, row.rollout_percentage || 0))
    result[row.key] = row.enabled && (percentage === 100 || Boolean(subjectId && stableRolloutBucket(subjectId, row.key) < percentage))
  }
  return result
}
