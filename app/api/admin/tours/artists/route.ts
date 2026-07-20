import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { adminAccessErrorResponse, assertAdminTourAccess } from "@/lib/admin/admin-tour-event-access"
import { tourArtistInputSchema } from "@/lib/admin/tour-collaboration"
import { withAdminCapability } from "@/lib/auth/api-auth"

const idSchema = z.string().uuid()
const directoryQuerySchema = z.string().trim().min(2).max(120).transform(value => value.replace(/[,()%]/g, " "))

function errorResponse(error: unknown, fallback: string) {
  if (error instanceof z.ZodError) {
    return NextResponse.json({ error: "Validation error", details: error.issues }, { status: 400 })
  }
  const resolved = adminAccessErrorResponse(error, fallback, 500)
  return NextResponse.json({ error: resolved.message }, { status: resolved.status })
}

async function loadArtist(supabase: any, id: string) {
  const { data, error } = await supabase.from("tour_artists").select("*").eq("id", id).maybeSingle()
  if (error) throw new Error(error.message)
  return data as Record<string, unknown> | null
}

export const GET = withAdminCapability("tour.view", async (request: NextRequest, { supabase, user, admin }) => {
  try {
    const url = new URL(request.url)
    const tourIdParam = url.searchParams.get("tour_id")
    if (!tourIdParam) {
      const rawQuery = url.searchParams.get("query") || url.searchParams.get("q") || ""
      if (rawQuery.trim().length < 2) return NextResponse.json({ artists: [] })
      const query = directoryQuerySchema.parse(rawQuery)
      const parsedLimit = Number.parseInt(url.searchParams.get("limit") || "12", 10)
      const limit = Number.isFinite(parsedLimit) ? Math.max(1, Math.min(parsedLimit, 50)) : 12
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, location, avatar_url, primary_genres")
        .eq("role", "artist")
        .ilike("display_name", `%${query}%`)
        .order("display_name", { ascending: true })
        .limit(limit)
      if (error) throw new Error(error.message)
      return NextResponse.json({
        artists: (data ?? []).map((artist: Record<string, unknown>) => ({
          id: artist.id,
          name: artist.display_name,
          location: artist.location,
          avatarUrl: artist.avatar_url,
          genres: artist.primary_genres ?? [],
        })),
      })
    }

    const tourId = idSchema.parse(tourIdParam)
    await assertAdminTourAccess({ supabase, userId: user.id, tourId, orgId: admin.orgId })
    const { data, error } = await supabase
      .from("tour_artists")
      .select("*")
      .eq("tour_id", tourId)
      .order("created_at", { ascending: true })
    if (error) throw new Error(error.message)
    return NextResponse.json({ data: data ?? [] })
  } catch (error) {
    return errorResponse(error, "Failed to load tour artists")
  }
})

export const POST = withAdminCapability("tour.manage", async (request: NextRequest, { supabase, user, admin }) => {
  try {
    const input = tourArtistInputSchema.parse(await request.json())
    await assertAdminTourAccess({ supabase, userId: user.id, tourId: input.tour_id, orgId: admin.orgId })
    const { data, error } = await supabase.from("tour_artists").insert(input).select("*").single()
    if (error) throw new Error(error.message)
    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    return errorResponse(error, "Failed to add tour artist")
  }
})

export const PATCH = withAdminCapability("tour.manage", async (request: NextRequest, { supabase, user, admin }) => {
  try {
    const body = await request.json()
    const id = idSchema.parse(body.id)
    const existing = await loadArtist(supabase, id)
    if (!existing) return NextResponse.json({ error: "Artist not found" }, { status: 404 })
    const tourId = idSchema.parse(existing.tour_id)
    await assertAdminTourAccess({ supabase, userId: user.id, tourId, orgId: admin.orgId })
    const input = tourArtistInputSchema.parse({ ...existing, ...body, tour_id: tourId })
    const { data, error } = await supabase
      .from("tour_artists")
      .update({ artist_user_id: input.artist_user_id ?? null, artist_name: input.artist_name ?? null, role: input.role ?? null })
      .eq("id", id)
      .eq("tour_id", tourId)
      .select("*")
      .single()
    if (error) throw new Error(error.message)
    return NextResponse.json({ data })
  } catch (error) {
    return errorResponse(error, "Failed to update tour artist")
  }
})

export const DELETE = withAdminCapability("tour.manage", async (request: NextRequest, { supabase, user, admin }) => {
  try {
    const url = new URL(request.url)
    const id = idSchema.parse(url.searchParams.get("id"))
    const suppliedTourId = url.searchParams.get("tour_id")
    const existing = await loadArtist(supabase, id)
    if (!existing) return NextResponse.json({ error: "Artist not found" }, { status: 404 })
    const tourId = idSchema.parse(existing.tour_id)
    if (suppliedTourId && suppliedTourId !== tourId) {
      return NextResponse.json({ error: "Artist does not belong to the supplied tour" }, { status: 409 })
    }
    await assertAdminTourAccess({ supabase, userId: user.id, tourId, orgId: admin.orgId })
    const { error } = await supabase.from("tour_artists").delete().eq("id", id).eq("tour_id", tourId)
    if (error) throw new Error(error.message)
    return NextResponse.json({ success: true })
  } catch (error) {
    return errorResponse(error, "Failed to remove tour artist")
  }
})
