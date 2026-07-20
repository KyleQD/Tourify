export const MUSIC_ROYALTIES_FLAG_NAMES = [
  "music_royalties_ingestion_enabled",
  "music_royalties_matching_enabled",
  "music_royalties_ledger_enabled",
  "music_royalties_statements_enabled",
  "music_payouts_enabled",
  "music_valuation_enabled",
  "music_fan_utility_enabled",
  "music_finance_offerings_enabled",
  "music_finance_onchain_enabled",
  "music_royalties_admin_ops_enabled",
] as const

export type MusicRoyaltiesFlagName = (typeof MUSIC_ROYALTIES_FLAG_NAMES)[number]
export type MusicRoyaltiesFlags = Record<MusicRoyaltiesFlagName, boolean>

export const DISABLED_MUSIC_ROYALTIES_FLAGS = Object.fromEntries(
  MUSIC_ROYALTIES_FLAG_NAMES.map((name) => [name, false]),
) as MusicRoyaltiesFlags

export function stableRolloutBucket(subject: string, flag: string): number {
  let hash = 2166136261
  for (const character of `${flag}:${subject}`) {
    hash ^= character.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0) % 100
}

export async function resolveMusicRoyaltiesFlags(supabase: any, subjectId?: string | null): Promise<MusicRoyaltiesFlags> {
  const { getTrustedMusicWriteClient } = await import("@/lib/music/music-access")
  const readClient = await getTrustedMusicWriteClient(supabase)
  const { data, error } = await readClient
    .from("feature_flags")
    .select("key, enabled, rollout_percentage")
    .in("key", [...MUSIC_ROYALTIES_FLAG_NAMES])

  if (error || !data) return { ...DISABLED_MUSIC_ROYALTIES_FLAGS }
  const result = { ...DISABLED_MUSIC_ROYALTIES_FLAGS }
  for (const row of data as Array<{ key: MusicRoyaltiesFlagName; enabled: boolean; rollout_percentage: number }>) {
    if (!MUSIC_ROYALTIES_FLAG_NAMES.includes(row.key)) continue
    const percentage = Math.min(100, Math.max(0, row.rollout_percentage || 0))
    result[row.key] = row.enabled && (percentage === 100 || Boolean(subjectId && stableRolloutBucket(subjectId, row.key) < percentage))
  }
  return result
}
