/**
 * lib/playback/flags.ts
 *
 * Phase 1 World playback flags. Both default to disabled; existing native /
 * Audius track behavior never depends on them (plan section 9).
 */
export const WORLD_PLAYBACK_FLAG_NAMES = [
  "world_music_enabled",
  "world_music_radio_enabled",
] as const

export type WorldPlaybackFlagName = (typeof WORLD_PLAYBACK_FLAG_NAMES)[number]
export type WorldPlaybackFlags = Record<WorldPlaybackFlagName, boolean>

export const DISABLED_WORLD_PLAYBACK_FLAGS: WorldPlaybackFlags = {
  world_music_enabled: false,
  world_music_radio_enabled: false,
}

export async function resolveWorldPlaybackFlags(supabase: any): Promise<WorldPlaybackFlags> {
  try {
    const { data, error } = await supabase
      .from("feature_flags")
      .select("key, enabled")
      .in("key", [...WORLD_PLAYBACK_FLAG_NAMES])
    if (error || !data) return { ...DISABLED_WORLD_PLAYBACK_FLAGS }
    const result = { ...DISABLED_WORLD_PLAYBACK_FLAGS }
    for (const row of data as Array<{ key: string; enabled: boolean }>) {
      if ((WORLD_PLAYBACK_FLAG_NAMES as readonly string[]).includes(row.key)) {
        result[row.key as WorldPlaybackFlagName] = row.enabled === true
      }
    }
    return result
  } catch {
    return { ...DISABLED_WORLD_PLAYBACK_FLAGS }
  }
}
