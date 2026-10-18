/**
 * Server-only playback URL issue policy. This module does not encrypt media:
 * storage bucket access and listener authorization remain independent checks.
 *
 * Arcade receives a short-lived capability; full-size private audio files can
 * still be recovered by an authorized client. DRM/segment licensing requires a
 * separate delivery infrastructure and is not represented by this policy.
 */
export type MusicStreamContext = 'arcade' | 'standard'
export interface MusicStreamPolicy {
  context: MusicStreamContext
  lifetimeSeconds: number
  eventSource: 'api_music_stream' | 'api_music_stream_arcade'
  cacheControl: string
}

export function getMusicStreamPolicy(input: string | null): MusicStreamPolicy {
  if (input === 'arcade') return {
    context: 'arcade',
    lifetimeSeconds: 300,
    eventSource: 'api_music_stream_arcade',
    cacheControl: 'private, no-store',
  }
  return {
    context: 'standard',
    lifetimeSeconds: 3600, // Preserve the existing music player behavior.
    eventSource: 'api_music_stream',
    cacheControl: 'private, max-age=3000',
  }
}
