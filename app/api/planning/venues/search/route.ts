import { NextRequest, NextResponse } from "next/server"

import { authenticateApiRequest, checkAdminPermissions } from "@/lib/auth/api-auth"
import {
  mapCatalogVenue,
  mapTourifyVenueProfile,
  type PlanningVenueSearchResponse,
} from "@/lib/planning/venue-search"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { createRateLimiter } from "@/lib/utils/rate-limit"

export const dynamic = "force-dynamic"

const limiter = createRateLimiter({
  namespace: "planning-venue-search",
  limit: 60,
  windowSec: 60,
})

function parseCursor(value: string | null): number {
  if (!value) return 0
  try {
    const decoded = Buffer.from(value, "base64url").toString("utf8")
    const parsed = Number(decoded)
    return Number.isInteger(parsed) && parsed >= 0 && parsed <= 200 ? parsed : 0
  } catch {
    return 0
  }
}

function encodeCursor(offset: number): string {
  return Buffer.from(String(offset), "utf8").toString("base64url")
}

async function hasArtistPlanningAccess(supabase: any, userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("artist_profiles")
    .select("id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle()
  return !error && Boolean(data?.id)
}

export async function GET(request: NextRequest) {
  const auth = await authenticateApiRequest(request)
  if (!auth) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  }

  const [artistAccess, organizationAccess] = await Promise.all([
    hasArtistPlanningAccess(auth.supabase, auth.user.id),
    checkAdminPermissions(auth.user),
  ])
  if (!artistAccess && !organizationAccess) {
    return NextResponse.json({ error: "Event or tour planning access required" }, { status: 403 })
  }

  const rate = await limiter.check(auth.user.id)
  if (!rate.success) {
    return NextResponse.json(
      { error: "Too many venue searches" },
      { status: 429, headers: rate.reset ? { "Retry-After": String(Math.max(1, Math.ceil((rate.reset - Date.now()) / 1000))) } : undefined },
    )
  }

  const { searchParams } = new URL(request.url)
  const query = (searchParams.get("q") || "").trim().replace(/\s+/g, " ")
  if (query.length < 2) {
    return NextResponse.json({ error: "Search must contain at least 2 characters" }, { status: 400 })
  }

  const requestedLimit = Number(searchParams.get("limit") || 8)
  const limit = Math.min(Math.max(Number.isFinite(requestedLimit) ? Math.floor(requestedLimit) : 8, 1), 10)
  const offset = parseCursor(searchParams.get("cursor"))
  const service = createServiceRoleClient()

  const escaped = query.replace(/[^a-zA-Z0-9\s.'-]/g, " ")
  const [catalogResponse, profilesResponse] = await Promise.all([
    service.rpc("search_planning_venue_catalog", {
      query_text: query,
      max_results: limit,
      cursor_offset: offset,
    }),
    service
      .from("venue_profiles")
      .select("id, venue_name, address, city, state, postal_code, country, capacity, contact_info, social_links, settings")
      .or(`venue_name.ilike.%${escaped}%,city.ilike.%${escaped}%,state.ilike.%${escaped}%`)
      .order("venue_name")
      .range(offset, offset + limit - 1),
  ])

  if (catalogResponse.error) {
    console.error("[Planning venue search] Catalog query failed", catalogResponse.error)
  }
  if (profilesResponse.error) {
    console.error("[Planning venue search] Profile query failed", profilesResponse.error)
  }
  if (catalogResponse.error && profilesResponse.error) {
    return NextResponse.json({ error: "Venue search is temporarily unavailable" }, { status: 503 })
  }

  const catalog = (catalogResponse.data || []).map((row: Record<string, unknown>) => mapCatalogVenue(row))
  const tourifyProfiles = (profilesResponse.data || []).map((row: Record<string, unknown>) => mapTourifyVenueProfile(row))
  const hasMore = catalog.length === limit || tourifyProfiles.length === limit
  const response: PlanningVenueSearchResponse = {
    groups: { catalog, tourifyProfiles },
    nextCursor: hasMore ? encodeCursor(offset + limit) : null,
  }

  return NextResponse.json(response, {
    headers: {
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  })
}
