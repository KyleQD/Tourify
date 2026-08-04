import { NextRequest, NextResponse } from "next/server"
import { searchGlobal } from "@/lib/search/global-search-service"
import {
  GLOBAL_SEARCH_CATEGORIES,
  GLOBAL_SEARCH_PROFILE_TYPES,
  type GlobalSearchCategory,
  type GlobalSearchProfileType,
} from "@/lib/search/global-search-types"
import { normalizeSearchQuery } from "@/lib/search/global-search-ranking"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

function categoryValue(value: string | null): GlobalSearchCategory {
  return GLOBAL_SEARCH_CATEGORIES.includes(value as GlobalSearchCategory)
    ? value as GlobalSearchCategory
    : "all"
}

function profileTypeValue(value: string | null): GlobalSearchProfileType {
  return GLOBAL_SEARCH_PROFILE_TYPES.includes(value as GlobalSearchProfileType)
    ? value as GlobalSearchProfileType
    : "all"
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const query = normalizeSearchQuery(searchParams.get("q"))
  const category = categoryValue(searchParams.get("category"))
  const profileType = profileTypeValue(searchParams.get("profileType"))
  const requestedLimit = Number.parseInt(searchParams.get("limit") || "", 10)
  const limit = Number.isFinite(requestedLimit) ? requestedLimit : undefined

  try {
    const response = await searchGlobal({
      query,
      category,
      profileType,
      limit,
      cursor: searchParams.get("cursor"),
      requestClient: await createClient(),
    })

    return NextResponse.json(response, {
      headers: {
        "Cache-Control": "private, no-store",
        "Server-Timing": `search;dur=${response.durationMs}`,
      },
    })
  } catch (error) {
    console.error("[global-search] request failed", error)
    return NextResponse.json({ error: "Search is temporarily unavailable" }, { status: 500 })
  }
}
