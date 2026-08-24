import { NextResponse } from "next/server"
import { searchWorldHistory } from "@/lib/world/history/search"

export async function GET(request: Request) {
  if (process.env.WORLD_MUSIC_SEED_PREVIEW_ENABLED !== "true") {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
  const url = new URL(request.url)
  const query = (url.searchParams.get("q") ?? "").trim()
  if (!query) return NextResponse.json({ error: "q is required" }, { status: 400 })
  const pilotKey = url.searchParams.get("pilot")
  const kind = url.searchParams.get("kind")
  const rawLimit = Number(url.searchParams.get("limit") ?? "20")
  const limit = Number.isFinite(rawLimit) ? Math.max(1, Math.min(Math.trunc(rawLimit), 50)) : 20
  const results = searchWorldHistory({ query, pilotKey, kind, limit })
  return NextResponse.json({
    schemaVersion: "world-history-search-v0.1",
    publicationState: "draft_needs_review_not_deployed",
    query,
    filters: { pilotKey, kind },
    count: results.length,
    results,
  }, { headers: { "Cache-Control": "private, max-age=60" } })
}
