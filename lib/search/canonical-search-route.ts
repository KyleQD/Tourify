import "server-only"

import { NextRequest, NextResponse } from "next/server"
import { CANONICAL_SEARCH_RATE_LIMIT, parseCanonicalSearchRequest } from "@/lib/search/canonical-search"
import { normalizeSearchQuery } from "@/lib/search/global-search-ranking"
import { searchGlobal } from "@/lib/search/global-search-service"
import { createClient } from "@/lib/supabase/server"
import { createRateLimiter, clientKeyFromRequest } from "@/lib/utils/rate-limit"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const rateLimit = createRateLimiter(CANONICAL_SEARCH_RATE_LIMIT)
  if (!(await rateLimit.check(clientKeyFromRequest(request))).success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 })
  }

  const input = parseCanonicalSearchRequest(request.nextUrl.searchParams)
  try {
    const response = await searchGlobal({
      ...input,
      query: normalizeSearchQuery(input.query),
      requestClient: await createClient(),
    })
    return NextResponse.json(response, {
      headers: { "Cache-Control": "private, no-store", "Server-Timing": `search;dur=${response.durationMs}` },
    })
  } catch (error) {
    console.error("[canonical-search] request failed", error)
    return NextResponse.json({ error: "Search is temporarily unavailable" }, { status: 500 })
  }
}
