import { useState, useEffect } from "react"
import { useSocial } from "@/contexts/social-context"
import { MusicRelease } from "@/types/social"

interface UseMusicReleasesProps {
  userId?: string
  limit?: number
}

export function useMusicReleases({ userId, limit = 5 }: UseMusicReleasesProps) {
  const { users, loadingUsers } = useSocial()
  const [releases, setReleases] = useState<MusicRelease[]>([])
  const [loading, setLoading] = useState(true)
  const [playingRelease, setPlayingRelease] = useState<string | null>(null)

  useEffect(() => {
    loadReleases()
  }, [users, userId])

  const loadReleases = () => {
    setLoading(true)
    // In a real app, this would fetch from an API
    // For now, we'll create mock data
    const mockReleases: MusicRelease[] = [
      {
        id: "1",
        userId: "1",
        title: "Midnight Dreams",
        type: "album",
        artwork: "https://picsum.photos/200/200",
        releaseDate: "2024-03-15",
        streamingLinks: {
          spotify: "https://spotify.com",
          appleMusic: "https://apple.com/music",
        },
        tracks: 12,
        featured: ["2", "3"],
        liked: false
      },
      {
        id: "2",
        userId: "2",
        title: "Summer Vibes",
        type: "single",
        artwork: "https://picsum.photos/200/200",
        releaseDate: "2024-03-10",
        streamingLinks: {
          spotify: "https://spotify.com",
          soundcloud: "https://soundcloud.com",
        },
        tracks: 1,
        liked: true
      }
    ]

    const filteredReleases = userId 
      ? mockReleases.filter(r => r.userId === userId)
      : mockReleases

    setReleases(filteredReleases.slice(0, limit))
    setLoading(false)
  }

  const handlePlay = (releaseId: string) => {
    setPlayingRelease(playingRelease === releaseId ? null : releaseId)
  }

  const handleLike = (releaseId: string) => {
    setReleases(prev => 
      prev.map(r => 
        r.id === releaseId ? { ...r, liked: !r.liked } : r
      )
    )
  }

  return {
    releases,
    loading: loading || loadingUsers,
    playingRelease,
    handlePlay,
    handleLike,
    loadReleases
  }
} 