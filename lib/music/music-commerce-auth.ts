import "server-only"

import { requireArtistMusicUser } from "@/lib/artist/artist-music-auth"

export type { ArtistMusicProfileAccess } from "@/lib/artist/artist-music-auth"

/**
 * Music's route-facing alias for the canonical ARTIST-002 auth contract.
 * Keeping the alias in the Music boundary lets artist/music route batches
 * adopt one gate without reimplementing profile ownership checks.
 */
export { requireArtistMusicUser }

