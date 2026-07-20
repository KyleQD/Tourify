import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { adminAccessErrorResponse, assertAdminTourAccess } from "@/lib/admin/admin-tour-event-access"
import { presentTourMember, tourTeamInputSchema } from "@/lib/admin/tour-collaboration"
import { withAdminCapability } from "@/lib/auth/api-auth"

const idSchema = z.string().uuid()

function errorResponse(error: unknown, fallback: string) {
  if (error instanceof z.ZodError) {
    return NextResponse.json({ error: "Validation error", details: error.issues }, { status: 400 })
  }
  const resolved = adminAccessErrorResponse(error, fallback, 500)
  return NextResponse.json({ error: resolved.message }, { status: resolved.status })
}

async function loadTeamTourId(supabase: any, teamId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("tour_teams")
    .select("tour_id")
    .eq("id", teamId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data?.tour_id ?? null
}

export const GET = withAdminCapability("workforce.view", async (request: NextRequest, { supabase, user, admin }) => {
  try {
    const tourId = idSchema.parse(new URL(request.url).searchParams.get("tour_id"))
    await assertAdminTourAccess({ supabase, userId: user.id, tourId, orgId: admin.orgId })

    const [{ data: teams, error: teamsError }, { data: members, error: membersError }] = await Promise.all([
      supabase.from("tour_teams").select("*").eq("tour_id", tourId).order("created_at", { ascending: true }),
      supabase.from("tour_team_members").select("*").eq("tour_id", tourId).order("created_at", { ascending: true }),
    ])
    if (teamsError) throw new Error(teamsError.message)
    if (membersError) throw new Error(membersError.message)

    const presentedMembers: Array<ReturnType<typeof presentTourMember>> = (members ?? []).map(
      (row: Record<string, unknown>) => presentTourMember(row),
    )
    const data = (teams ?? []).map((team: Record<string, unknown>) => ({
      ...team,
      role: team.role ?? team.team_type ?? "general",
      members: presentedMembers.filter(member => member.team_id === team.id),
    }))
    return NextResponse.json({ data, team_members: presentedMembers })
  } catch (error) {
    return errorResponse(error, "Failed to load tour teams")
  }
})

export const POST = withAdminCapability("workforce.manage", async (request: NextRequest, { supabase, user, admin }) => {
  try {
    const input = tourTeamInputSchema.parse(await request.json())
    await assertAdminTourAccess({ supabase, userId: user.id, tourId: input.tour_id, orgId: admin.orgId })

    const { data, error } = await supabase
      .from("tour_teams")
      .insert({
        tour_id: input.tour_id,
        name: input.name,
        role: input.role ?? input.team_type ?? "general",
        team_type: input.team_type ?? input.role ?? "general",
        description: input.description ?? null,
        created_by: user.id,
      })
      .select("*")
      .single()
    if (error) throw new Error(error.message)
    return NextResponse.json({ data: { ...data, members: [] } }, { status: 201 })
  } catch (error) {
    return errorResponse(error, "Failed to create tour team")
  }
})

export const PATCH = withAdminCapability("workforce.manage", async (request: NextRequest, { supabase, user, admin }) => {
  try {
    const body = await request.json()
    const id = idSchema.parse(body.id)
    const tourId = await loadTeamTourId(supabase, id)
    if (!tourId) return NextResponse.json({ error: "Team not found" }, { status: 404 })
    await assertAdminTourAccess({ supabase, userId: user.id, tourId, orgId: admin.orgId })

    const input = tourTeamInputSchema.partial().omit({ tour_id: true }).parse(body)
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (input.name !== undefined) patch.name = input.name
    if (input.role !== undefined) patch.role = input.role
    if (input.team_type !== undefined) patch.team_type = input.team_type
    if (input.description !== undefined) patch.description = input.description
    const { data, error } = await supabase
      .from("tour_teams")
      .update(patch)
      .eq("id", id)
      .eq("tour_id", tourId)
      .select("*")
      .single()
    if (error) throw new Error(error.message)
    return NextResponse.json({ data })
  } catch (error) {
    return errorResponse(error, "Failed to update tour team")
  }
})

export const DELETE = withAdminCapability("workforce.manage", async (request: NextRequest, { supabase, user, admin }) => {
  try {
    const url = new URL(request.url)
    const id = idSchema.parse(url.searchParams.get("id"))
    const suppliedTourId = url.searchParams.get("tour_id")
    const tourId = await loadTeamTourId(supabase, id)
    if (!tourId) return NextResponse.json({ error: "Team not found" }, { status: 404 })
    if (suppliedTourId && suppliedTourId !== tourId) {
      return NextResponse.json({ error: "Team does not belong to the supplied tour" }, { status: 409 })
    }
    await assertAdminTourAccess({ supabase, userId: user.id, tourId, orgId: admin.orgId })

    const { error } = await supabase.from("tour_teams").delete().eq("id", id).eq("tour_id", tourId)
    if (error) throw new Error(error.message)
    return NextResponse.json({ success: true })
  } catch (error) {
    return errorResponse(error, "Failed to delete tour team")
  }
})
