import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { withAdminCapability } from "@/lib/auth/api-auth"

const querySchema = z.string().trim().min(2).max(120).transform(value => value.replace(/[,()%]/g, " "))

export const GET = withAdminCapability("tour.view", async (request: NextRequest, { supabase }) => {
  try {
    const url = new URL(request.url)
    const rawQuery = url.searchParams.get("query") || url.searchParams.get("q") || ""
    if (rawQuery.trim().length < 2) return NextResponse.json({ venues: [] })
    const query = querySchema.parse(rawQuery)
    const parsedLimit = Number.parseInt(url.searchParams.get("limit") || "12", 10)
    const limit = Number.isFinite(parsedLimit) ? Math.max(1, Math.min(parsedLimit, 50)) : 12
    const { data, error } = await supabase
      .from("venue_profiles")
      .select("id, venue_name, address, city, state, country, postal_code, capacity")
      .ilike("venue_name", `%${query}%`)
      .order("venue_name", { ascending: true })
      .limit(limit)
    if (error) throw new Error(error.message)

    return NextResponse.json({
      venues: (data ?? []).map((venue: Record<string, unknown>) => ({
        id: venue.id,
        name: venue.venue_name,
        address: venue.address,
        city: venue.city,
        state: venue.state,
        country: venue.country,
        capacity: venue.capacity,
        fullAddress: [venue.address, venue.city, venue.state, venue.postal_code]
          .filter(value => typeof value === "string" && value.trim())
          .join(", "),
      })),
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid search query", details: error.issues }, { status: 400 })
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to search venues" }, { status: 500 })
  }
})
