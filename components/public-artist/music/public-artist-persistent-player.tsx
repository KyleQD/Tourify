"use client"

import type { PublicArtistTrackDTO } from "@/lib/public-artist/public-artist-types"
import { MusicPlayer } from "@/components/music/music-player"
import { paPlayerShell, paShell } from "@/components/public-artist/public-artist-ui"

function toMusicPlayerTrack(track: PublicArtistTrackDTO) {
  const nowIso = new Date().toISOString()

  return {
    id: track.id,
    title: track.title,
    description: undefined,
    type: "single",
    genre: track.genre ?? undefined,
    release_date: track.releaseDate ?? undefined,
    duration: track.durationSeconds ?? undefined,
    file_url: track.audioUrl ?? "",
    cover_art_url: track.artworkUrl ?? undefined,
    spotify_url: track.platformUrls.spotify ?? undefined,
    apple_music_url: track.platformUrls.appleMusic ?? undefined,
    soundcloud_url: track.platformUrls.soundcloud ?? undefined,
    youtube_url: track.platformUrls.youtube ?? undefined,
    lyrics: undefined,
    tags: [],
    is_featured: track.isFeatured,
    is_public: true,
    stats: {
      plays: track.playCount,
      likes: track.likesCount,
      comments: track.commentsCount,
      shares: track.sharesCount
    },
    created_at: nowIso,
    updated_at: nowIso
  }
}

export function PublicArtistPersistentPlayer({
  track
}: {
  track: PublicArtistTrackDTO | null
}) {
  if (!track || !track.audioUrl) return null

  return (
    <div className={`pointer-events-none fixed inset-x-0 bottom-0 z-50 px-4 pb-4 sm:px-6`}>
      <div className={`${paShell} pointer-events-auto`}>
        <div className={`${paPlayerShell} px-3 py-2 sm:px-4`}>
          <MusicPlayer
            track={toMusicPlayerTrack(track) as any}
            showStats={false}
            showSocial={false}
            className="bg-transparent p-0"
          />
        </div>
      </div>
    </div>
  )
}

