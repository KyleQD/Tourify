import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { GET as searchGet } from "@/app/api/search/route"

export const dynamic = "force-dynamic"

function mapAccountResult(row: Record<string, unknown>) {
  return {
    id: String(row.id || ""),
    username: String(row.username || row.display_name || ""),
    account_type: (row.account_type as "artist" | "venue" | "general") || "general",
    profile_data: row,
    avatar_url: (row.avatar_url as string | undefined) || undefined,
    verified: Boolean(row.verified || row.is_verified),
    bio: (row.bio as string | undefined) || undefined,
    location: (row.location as string | undefined) || undefined,
    stats: (row.stats as { followers?: number; following?: number } | undefined) || undefined,
  }
}

export async function GET(request: NextRequest) {
  try {
    // Reuse the existing search implementation, then reshape for account-search consumers.
    const searchResponse = await searchGet(request)
    const payload = await searchResponse.json()

    if (!searchResponse.ok) {
      return NextResponse.json(payload, { status: searchResponse.status })
    }

    const results = payload.results || {}
    const artists = Array.isArray(results.artists) ? results.artists : []
    const venues = Array.isArray(results.venues) ? results.venues : []
    const users = Array.isArray(results.users) ? results.users : []

    const unified_results = [
      ...artists.map(mapAccountResult),
      ...venues.map(mapAccountResult),
      ...users.map(mapAccountResult),
    ]

    return NextResponse.json({
      success: true,
      unified_results,
      artists: artists.map(mapAccountResult),
      venues: venues.map(mapAccountResult),
      users: users.map(mapAccountResult),
      total: unified_results.length,
      query: payload.query,
      filters: payload.filters,
    })
  } catch (error) {
    console.error("Unified search API error:", error)

    // Fallback: light accounts query if the composed search path fails
    try {
      const supabase = await createClient()
      const { searchParams } = new URL(request.url)
      const query = (searchParams.get("q") || "").trim()
      const limit = Math.min(parseInt(searchParams.get("limit") || "10", 10) || 10, 50)

      if (!query) {
        return NextResponse.json({
          success: true,
          unified_results: [],
          artists: [],
          venues: [],
          users: [],
          total: 0,
        })
      }

      const { data } = await supabase
        .from("accounts")
        .select("id, account_type, display_name, username, avatar_url, is_verified, metadata")
        .eq("is_active", true)
        .or(`display_name.ilike.%${query}%,username.ilike.%${query}%`)
        .limit(limit)

      const rows = (data || []).map((account) =>
        mapAccountResult({
          ...account,
          verified: account.is_verified,
          bio: account.metadata?.bio,
        }),
      )

      return NextResponse.json({
        success: true,
        unified_results: rows,
        artists: rows.filter((row) => row.account_type === "artist"),
        venues: rows.filter((row) => row.account_type === "venue"),
        users: rows.filter((row) => row.account_type === "general"),
        total: rows.length,
      })
    } catch (fallbackError) {
      console.error("Unified search fallback error:", fallbackError)
      return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
  }
}
