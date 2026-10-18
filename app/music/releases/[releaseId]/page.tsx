import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { MusicDetailExperience } from "@/components/music/music-detail-experience"
import { getPublicReleaseItem, getRelatedPublicMusic } from "@/lib/music/public-catalog-detail"

export const dynamic = "force-dynamic"

export async function generateMetadata({ params }: { params: Promise<{ releaseId: string }> }): Promise<Metadata> {
  const { releaseId } = await params
  const item = await getPublicReleaseItem(releaseId)
  return item ? {
    title: `${item.title} — ${item.kind.toUpperCase()} by ${item.artistName} | Tourify Music`,
    description: item.description?.slice(0, 160) || `Explore the ${item.kind.toUpperCase()} ${item.title} by ${item.artistName} on Tourify.`,
  } : { title: "Release unavailable | Tourify" }
}

export default async function MusicReleasePage({ params }: { params: Promise<{ releaseId: string }> }) {
  const { releaseId } = await params
  const item = await getPublicReleaseItem(releaseId)
  if (!item) notFound()
  const related = await getRelatedPublicMusic(item, 6)
  return <MusicDetailExperience item={item} related={related} />
}
