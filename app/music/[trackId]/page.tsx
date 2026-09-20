import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getPublicTrackPageData } from "@/lib/music/public-track"
import { MusicTrackDetail } from "@/components/music/music-track-detail"

interface TrackPageProps {
  params: Promise<{ trackId: string }>
}

export async function generateMetadata({ params }: TrackPageProps): Promise<Metadata> {
  const { trackId } = await params
  const data = await getPublicTrackPageData(trackId)
  if (!data) return { title: "Track not found · Tourify" }
  return {
    title: `${data.track.title} by ${data.artist.name} · Tourify`,
    description: data.track.description || `Listen to ${data.track.title} by ${data.artist.name} on Tourify.`,
    openGraph: {
      title: `${data.track.title} by ${data.artist.name}`,
      description: data.track.description || `Listen to ${data.track.title} on Tourify.`,
      images: data.track.cover_art_url ? [data.track.cover_art_url] : undefined,
      type: "music.song",
    },
  }
}

export default async function MusicTrackPage({ params }: TrackPageProps) {
  const { trackId } = await params
  const data = await getPublicTrackPageData(trackId)
  if (!data) notFound()
  return <MusicTrackDetail data={data} />
}
