export const MUSIC_TRUST_FLAG_NAMES = [
  "music_trust_upload_fields_enabled",
  "music_origin_processing_enabled",
  "music_certification_requests_enabled",
  "music_certification_admin_review_enabled",
  "music_public_verification_enabled",
  "music_human_only_public_gate_enabled",
] as const

export type MusicTrustFlagName = (typeof MUSIC_TRUST_FLAG_NAMES)[number]
export type MusicTrustFlags = Record<MusicTrustFlagName, boolean>

export const DISABLED_MUSIC_TRUST_FLAGS = {
  ...Object.fromEntries(MUSIC_TRUST_FLAG_NAMES.map((name) => [name, false])),
  // Public verify pages must work anonymously once share routes allow them.
  music_public_verification_enabled: true,
} as MusicTrustFlags

export function stableRolloutBucket(subject: string, flag: string): number {
  let hash = 2166136261
  for (const character of `${flag}:${subject}`) {
    hash ^= character.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0) % 100
}

export async function resolveMusicTrustFlags(supabase: any, subjectId?: string | null): Promise<MusicTrustFlags> {
  const { getTrustedMusicWriteClient } = await import("./music-access")
  const readClient = await getTrustedMusicWriteClient(supabase)
  const { data, error } = await readClient
    .from("feature_flags")
    .select("key, enabled, rollout_percentage")
    .in("key", [...MUSIC_TRUST_FLAG_NAMES])

  if (error || !data) return { ...DISABLED_MUSIC_TRUST_FLAGS }
  const result = { ...DISABLED_MUSIC_TRUST_FLAGS }
  for (const row of data as Array<{ key: MusicTrustFlagName; enabled: boolean; rollout_percentage: number }>) {
    if (!MUSIC_TRUST_FLAG_NAMES.includes(row.key)) continue
    const percentage = Math.min(100, Math.max(0, row.rollout_percentage || 0))
    result[row.key] = row.enabled && (percentage === 100 || Boolean(subjectId && stableRolloutBucket(subjectId, row.key) < percentage))
  }
  return result
}
