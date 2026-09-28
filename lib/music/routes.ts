/** Build the canonical public URL for an uploaded music track. */
export function getMusicTrackPath(trackId: string | null | undefined): string | null {
  if (!trackId) return null
  return `/music/${encodeURIComponent(trackId)}`
}
