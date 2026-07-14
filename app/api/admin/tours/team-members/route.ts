import { NextRequest, NextResponse } from "next/server"

import {
  adminAccessErrorResponse,
  assertAdminTourAccess,
} from "@/lib/admin/admin-tour-event-access"
import { withAdminAuth } from "@/lib/auth/api-auth"

async function resolveTourIdForTeam(supabase: any, teamId: string): Promise<string | null> {
  const { data, error } = await supabase.from("tour_teams").select("tour_id").eq("id", teamId).maybeSingle()
  if (error) throw new Error(error.message)
  return data?.tour_id ?? null
}

export const GET = withAdminAuth(async (req: NextRequest, { supabase, user }) => {
  try {
    const teamId = new URL(req.url).searchParams.get("team_id")
    if (!teamId) return NextResponse.json({ error: "team_id required" }, { status: 400 })
    const tourId = await resolveTourIdForTeam(supabase, teamId)
    if (!tourId) return NextResponse.json({ error: "Team not found" }, { status: 404 })
    await assertAdminTourAccess({ supabase, userId: user.id, tourId })

    const { data, error } = await supabase.from("tour_team_members").select("*").eq("team_id", teamId)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ data: data ?? [] })
  } catch (error: any) {
    const { status, message } = adminAccessErrorResponse(error, "Failed to load team members", 400)
    return NextResponse.json({ error: message }, { status })
  }
})

export const POST = withAdminAuth(async (req: NextRequest, { supabase, user }) => {
  try {
    const body = await req.json()
    const { team_id, user_id, profile, role } = body
    if (!team_id || (!user_id && !profile)) {
      return NextResponse.json({ error: "team_id and (user_id or profile) required" }, { status: 400 })
    }
    const tourId = await resolveTourIdForTeam(supabase, team_id)
    if (!tourId) return NextResponse.json({ error: "Team not found" }, { status: 404 })
    await assertAdminTourAccess({ supabase, userId: user.id, tourId })

    const { data, error } = await supabase
      .from("tour_team_members")
      .insert({ team_id, user_id: user_id ?? null, profile: profile ?? null, role: role ?? null })
      .select("*")
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ data })
  } catch (error: any) {
    const { status, message } = adminAccessErrorResponse(error, "Failed to add team member", 400)
    return NextResponse.json({ error: message }, { status })
  }
})

export const DELETE = withAdminAuth(async (req: NextRequest, { supabase, user }) => {
  try {
    const id = new URL(req.url).searchParams.get("id")
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })

    const { data: member, error: lookupError } = await supabase
      .from("tour_team_members")
      .select("team_id")
      .eq("id", id)
      .maybeSingle()
    if (lookupError) return NextResponse.json({ error: lookupError.message }, { status: 400 })
    if (!member?.team_id) return NextResponse.json({ error: "Member not found" }, { status: 404 })

    const tourId = await resolveTourIdForTeam(supabase, member.team_id)
    if (!tourId) return NextResponse.json({ error: "Team not found" }, { status: 404 })
    await assertAdminTourAccess({ supabase, userId: user.id, tourId })

    const { error } = await supabase.from("tour_team_members").delete().eq("id", id)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    const { status, message } = adminAccessErrorResponse(error, "Failed to remove team member", 400)
    return NextResponse.json({ error: message }, { status })
  }
})
