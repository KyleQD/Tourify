import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { MusicDetailExperience } from "@/components/music/music-detail-experience"
import { getPublicMusicItem, getRelatedPublicMusic } from "@/lib/music/public-catalog-detail"

export const dynamic = "force-dynamic"

export async function generateMetadata({ params }: { params: Promise<{ trackId: string }> }): Promise<Metadata> {
  const { trackId } = await params
  const item = await getPublicMusicItem(trackId)
  return item ? {
    title: `${item.title} by ${item.artistName} | Tourify Music`,
    description: item.description?.slice(0, 160) || `Discover ${item.title} by ${item.artistName} on Tourify.`,
  } : { title: "Music unavailable | Tourify" }
}

export default async function MusicTrackPage({ params }: { params: Promise<{ trackId: string }> }) {
  const { trackId } = await params
  const item = await getPublicMusicItem(trackId)
  if (!item) notFound()
  const related = await getRelatedPublicMusic(item, 6)
  return <MusicDetailExperience item={item} related={related} />
}
