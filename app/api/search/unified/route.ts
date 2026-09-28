import { NextRequest, NextResponse } from "next/server"
import { GET as canonicalSearchGet } from "@/lib/search/canonical-search-route"
import type { GlobalSearchResult } from "@/lib/search/global-search-types"

export const dynamic = "force-dynamic"

function mapAccountResult(item: GlobalSearchResult) {
  const metadata = item.metadata?.kind === "profile" ? item.metadata : null
  const accountType = metadata?.profileType === "service" ? "artist" : metadata?.profileType || "general"

  return {
    id: item.id,
    username: metadata?.handle || item.title,
    account_type: accountType,
    profile_data: {
      id: item.id,
      display_name: item.title,
      username: metadata?.handle,
      avatar_url: item.imageUrl,
      bio: item.description,
      location: metadata?.location,
      verified: item.verified,
      created_at: item.date,
    },
    avatar_url: item.imageUrl || undefined,
    verified: item.verified,
    bio: item.description || undefined,
    location: metadata?.location || undefined,
  }
}

export async function GET(request: NextRequest) {
  const response = await canonicalSearchGet(request)
  const payload = await response.json()
  if (!response.ok) return NextResponse.json(payload, { status: response.status })

  const profiles = Array.isArray(payload.items)
    ? payload.items.filter((item: GlobalSearchResult) => item.category === "profiles")
    : []
  const unifiedResults = profiles.map(mapAccountResult)

  return NextResponse.json({
    success: true,
    unified_results: unifiedResults,
    artists: unifiedResults.filter((item) => item.account_type === "artist"),
    venues: unifiedResults.filter((item) => item.account_type === "venue"),
    users: unifiedResults.filter((item) => item.account_type === "general"),
    total: unifiedResults.length,
    query: payload.query,
  })
}
