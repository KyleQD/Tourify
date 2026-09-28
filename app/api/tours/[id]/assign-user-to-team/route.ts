import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { adminAccessErrorResponse, assertAdminTourAccess } from "@/lib/admin/admin-tour-event-access"
import { withAdminCapability } from "@/lib/auth/api-auth"

/** VEND-101 — Assign user to a tour team with canonical tour + team.tour_id checks. */

const bodySchema = z.object({
  userId: z.string().uuid(),
  teamId: z.string().uuid(),
})

function routeError(error: unknown, fallback: string) {
  if (error instanceof z.ZodError) {
    return NextResponse.json(
      { error: "Validation error", details: error.errors },
      { status: 400 },
    )
  }
  const resolved = adminAccessErrorResponse(error, fallback, 500)
  return NextResponse.json({ error: resolved.message }, { status: resolved.status })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  return withAdminCapability("workforce.manage", async (_request, { user, supabase, admin }) => {
    try {
      await assertAdminTourAccess({
        supabase,
        userId: user.id,
        tourId: id,
        orgId: admin.orgId,
      })

      const { userId, teamId } = bodySchema.parse(await request.json())

      const { data: team, error: teamError } = await supabase
        .from("tour_teams")
        .select("id")
        .eq("id", teamId)
        .eq("tour_id", id)
        .maybeSingle()

      if (teamError) throw new Error(teamError.message)
      if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 })

      const { data: userData, error: userError } = await supabase
        .from("profiles")
        .select("id, email, full_name")
        .eq("id", userId)
        .maybeSingle()

      if (userError) throw new Error(userError.message)
      if (!userData) return NextResponse.json({ error: "User not found" }, { status: 404 })

      const { data: existingAssignment } = await supabase
        .from("tour_team_members")
        .select("id")
        .eq("team_id", teamId)
        .eq("user_id", userId)
        .maybeSingle()

      if (existingAssignment) {
        return NextResponse.json(
          { error: "User is already assigned to this team" },
          { status: 400 },
        )
      }

      const { data: assignment, error: assignError } = await supabase
        .from("tour_team_members")
        .insert({
          team_id: teamId,
          user_id: userId,
          tour_id: id,
          assigned_by: user.id,
          assigned_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (assignError) throw new Error(assignError.message)

      return NextResponse.json({
        success: true,
        assignment: {
          id: assignment.id,
          team_id: teamId,
          user_id: userId,
          tour_id: id,
        },
      }, { status: 201 })
    } catch (error) {
      return routeError(error, "Failed to assign user to team")
    }
  })(request)
}
