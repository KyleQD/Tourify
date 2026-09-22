import { NextRequest, NextResponse } from "next/server"

import { isEventFeatureEnabled } from "@/lib/events/providers/flags"
import { searchDiscovery, type DiscoverySort } from "@/lib/events/search-service"
import type { DatePreset } from "@/lib/events/location"

const DATE_PRESETS: DatePreset[] = ["today", "tomorrow", "this_weekend", "this_week", "this_month"]
const SORTS: DiscoverySort[] = ["nearby", "soonest", "recommended", "popular", "recently_added"]

function parseNumber(value: string | null): number | null {
  if (value == null || value === "") return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

export async function GET(request: NextRequest) {
  if (!isEventFeatureEnabled("EVENT_DISCOVERY_V2")) {
    return NextResponse.json(
      { error: { code: "FEATURE_UNAVAILABLE", message: "Discovery search is not enabled" } },
      { status: 503, headers: { "cache-control": "no-store" } },
    )
  }

  try {
    const params = request.nextUrl.searchParams

    const presetRaw = params.get("datePreset")
    const sortRaw = params.get("sort")

    const result = await searchDiscovery({
      query: params.get("q"),
      latitude: parseNumber(params.get("lat")),
      longitude: parseNumber(params.get("lng")),
      radiusMiles: parseNumber(params.get("radius")),
      datePreset: DATE_PRESETS.includes(presetRaw as DatePreset) ? (presetRaw as DatePreset) : null,
      startDate: params.get("from"),
      endDate: params.get("to"),
      categories: params.get("cat")?.split(",").filter(Boolean) ?? null,
      genres: params.get("genre")?.split(",").filter(Boolean) ?? null,
      isFree: params.get("free") == null ? null : params.get("free") === "true",
      sort: SORTS.includes(sortRaw as DiscoverySort) ? (sortRaw as DiscoverySort) : undefined,
      cursor: params.get("cursor"),
      limit: parseNumber(params.get("limit")) ?? 25,
      timezone: params.get("tz") ?? "UTC",
    })

    return NextResponse.json(result, {
      headers: { "cache-control": "public, max-age=30, stale-while-revalidate=60" },
    })
  } catch (error) {
    console.error("[events/search] failed", error)
    return NextResponse.json(
      { error: { code: "SEARCH_FAILED", message: "Event search failed" } },
      { status: 500, headers: { "cache-control": "no-store" } },
    )
  }
}
