import { notFound } from "next/navigation"
import { WorldHistoryPreview } from "@/components/world/WorldHistoryPreview"
import { projectDraftWorldHistory } from "@/lib/world/history/project-pilot-profile"
import { getWorldHistoryRepository } from "@/lib/world/history/static-pilot-repository"

export const dynamic = "force-dynamic"

export default async function WorldPilotDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  if (process.env.WORLD_MUSIC_SEED_PREVIEW_ENABLED !== "true") notFound()
  const { slug } = await params
  const repository = getWorldHistoryRepository()
  const snapshot = await repository.getPlaceKnowledgeByKey(slug)
  if (!snapshot) notFound()
  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <WorldHistoryPreview data={projectDraftWorldHistory(snapshot)} />
    </main>
  )
}
