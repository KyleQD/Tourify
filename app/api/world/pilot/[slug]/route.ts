import { NextResponse } from "next/server"
import { getWorldHistoryRepository } from "@/lib/world/history/static-pilot-repository"
import { projectDraftWorldPlaceResponse } from "@/lib/world/history/project-world-place-response"

export const dynamic = "force-dynamic"

export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  if (process.env.WORLD_MUSIC_SEED_PREVIEW_ENABLED !== "true") {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const { slug } = await context.params
  const repository = getWorldHistoryRepository()
  const snapshot = await repository.getPlaceKnowledgeByKey(slug)
  if (!snapshot) return NextResponse.json({ error: "Unknown pilot" }, { status: 404 })

  return NextResponse.json(projectDraftWorldPlaceResponse(snapshot), {
    headers: { "Cache-Control": "no-store" },
  })
}
