import { NextResponse } from "next/server"
import { getWorldHistoryRepository } from "@/lib/world/history/static-pilot-repository"

export const dynamic = "force-dynamic"

export async function GET() {
  if (process.env.WORLD_MUSIC_SEED_PREVIEW_ENABLED !== "true") {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const repository = getWorldHistoryRepository()
  const pilots = await repository.listPilotKeys()

  return NextResponse.json({
    schemaVersion: "world-history-preview-index-v0.1",
    state: "draft-needs-review",
    pilots,
  }, { headers: { "Cache-Control": "no-store" } })
}
