import { MusicRelease } from "@/types/social"
import { formatSafeDate } from "@/lib/events/admin-event-normalization"

export const formatReleaseDate = (date: string) => {
  return formatSafeDate(date)
}

export const formatTrackCount = (count: number) => {
  return `${count} track${count !== 1 ? "s" : ""}`
}

export const getReleaseBadgeStyles = (type: MusicRelease["type"]) => {
  const styles = {
    album: "bg-purple-500/10 text-purple-500",
    single: "bg-blue-500/10 text-blue-500",
    ep: "bg-green-500/10 text-green-500",
    remix: "bg-orange-500/10 text-orange-500"
  }

  return styles[type]
}

export const getReleaseTypeLabel = (type: MusicRelease["type"]) => {
  return type.charAt(0).toUpperCase() + type.slice(1)
}

export const getStreamingLink = (release: MusicRelease, platform: keyof MusicRelease["streamingLinks"]) => {
  return release.streamingLinks[platform]
}

export const getFeaturedArtists = (release: MusicRelease, users: any[]) => {
  if (!release.featured?.length) return []
  return users.filter(user => release.featured?.includes(user.id))
} 