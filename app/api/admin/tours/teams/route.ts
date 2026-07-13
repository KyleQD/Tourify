import { NextRequest, NextResponse } from "next/server"

import {
  adminAccessErrorResponse,
  assertAdminTourAccess,
} from "@/lib/admin/admin-tour-event-access"
import { withAdminAuth } from "@/lib/auth/api-auth"

export const GET = withAdminAuth(async (req: NextRequest, { supabase, user }) => {
  try {
    const tourId = new URL(req.url).searchParams.get("tour_id")
    if (!tourId) return NextResponse.json({ error: "tour_id required" }, { status: 400 })
    await assertAdminTourAccess({ supabase, userId: user.id, tourId })

    const { data, error } = await supabase.from("tour_teams").select("*").eq("tour_id", tourId)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ data: data ?? [] })
  } catch (error: any) {
    const { status, message } = adminAccessErrorResponse(error, "Failed to load tour teams", 400)
    return NextResponse.json({ error: message }, { status })
  }
})

export const POST = withAdminAuth(async (req: NextRequest, { supabase, user }) => {
  try {
    const body = await req.json()
    const { tour_id, name, team_type } = body
    if (!tour_id || !name) return NextResponse.json({ error: "tour_id and name required" }, { status: 400 })
    await assertAdminTourAccess({ supabase, userId: user.id, tourId: tour_id })

    const { data, error } = await supabase
      .from("tour_teams")
      .insert({ tour_id, name, team_type: team_type ?? null })
      .select("*")
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ data })
  } catch (error: any) {
    const { status, message } = adminAccessErrorResponse(error, "Failed to create tour team", 400)
    return NextResponse.json({ error: message }, { status })
  }
})

export const DELETE = withAdminAuth(async (req: NextRequest, { supabase, user }) => {
  try {
    const url = new URL(req.url)
    const id = url.searchParams.get("id")
    const tourId = url.searchParams.get("tour_id")
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })

    let resolvedTourId = tourId
    if (!resolvedTourId) {
      const { data: existing, error: lookupError } = await supabase
        .from("tour_teams")
        .select("tour_id")
        .eq("id", id)
        .maybeSingle()
      if (lookupError) return NextResponse.json({ error: lookupError.message }, { status: 400 })
      resolvedTourId = existing?.tour_id ?? null
    }
    if (!resolvedTourId) return NextResponse.json({ error: "tour_id required" }, { status: 400 })

    await assertAdminTourAccess({ supabase, userId: user.id, tourId: resolvedTourId })

    const { error } = await supabase.from("tour_teams").delete().eq("id", id)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    const { status, message } = adminAccessErrorResponse(error, "Failed to delete tour team", 400)
    return NextResponse.json({ error: message }, { status })
  }
})
