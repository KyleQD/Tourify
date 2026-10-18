import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { MusicDetailExperience } from "@/components/music/music-detail-experience"
import { getPublicMusicItem, getRelatedPublicMusic, isReleaseKind } from "@/lib/music/public-catalog-detail"

export const dynamic = "force-dynamic"

export async function generateMetadata({ params }: { params: Promise<{ releaseId: string }> }): Promise<Metadata> {
  const { releaseId } = await params
  const item = await getPublicMusicItem(releaseId)
  return item && isReleaseKind(item.kind) ? {
    title: `${item.title} — ${item.kind.toUpperCase()} by ${item.artistName} | Tourify Music`,
    description: item.description?.slice(0, 160) || `Explore the ${item.kind.toUpperCase()} ${item.title} by ${item.artistName} on Tourify.`,
  } : { title: "Release unavailable | Tourify" }
}

export default async function MusicReleasePage({ params }: { params: Promise<{ releaseId: string }> }) {
  const { releaseId } = await params
  const item = await getPublicMusicItem(releaseId)
  if (!item || !isReleaseKind(item.kind)) notFound()
  const related = await getRelatedPublicMusic(item, 6)
  return <MusicDetailExperience item={item} related={related} />
}
