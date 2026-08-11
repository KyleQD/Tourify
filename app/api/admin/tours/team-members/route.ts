import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { adminAccessErrorResponse, assertAdminTourAccess } from "@/lib/admin/admin-tour-event-access"
import {
  buildTourMemberWrite,
  presentTourMember,
  tourMemberInputSchema,
  tourMemberPatchSchema,
} from "@/lib/admin/tour-collaboration"
import {
  validateTeamParent,
  validateWorkforceAssignmentParents,
  workforceAuthorityErrorResponse,
} from "@/lib/admin/workforce-authority.service"
import { presentTourMemberAssignmentStatus } from "@/lib/admin/workforce-assignment-status"
import { projectWorkforceRecord } from "@/lib/admin/workforce-field-projections"
import { withAdminCapability } from "@/lib/auth/api-auth"
import type { AdminCapability } from "@/lib/auth/admin-capabilities"

const idSchema = z.string().uuid()

function errorResponse(error: unknown, fallback: string) {
  if (error instanceof z.ZodError) {
    return NextResponse.json({ error: "Validation error", details: error.issues }, { status: 400 })
  }
  const authority = workforceAuthorityErrorResponse(error, "")
  if (authority.code) {
    return NextResponse.json(
      { error: authority.message, code: authority.code },
      { status: authority.status },
    )
  }
  const resolved = adminAccessErrorResponse(error, fallback, 500)
  return NextResponse.json({ error: resolved.message }, { status: resolved.status })
}

function presentProjectedMember(row: Record<string, unknown>, capabilities: readonly AdminCapability[]) {
  const presented = presentTourMember(row) as Record<string, unknown>
  const statusBridge = presentTourMemberAssignmentStatus(
    typeof presented.status === "string" ? presented.status : null,
  )
  return projectWorkforceRecord(
    {
      ...presented,
      assignment_status: statusBridge.assignmentStatus,
    },
    { capabilities },
  )
}

async function loadTeam(supabase: any, teamId: string) {
  const { data, error } = await supabase
    .from("tour_teams")
    .select("id, tour_id")
    .eq("id", teamId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data as { id: string; tour_id: string } | null
}

async function ensureTeam(supabase: any, tourId: string, teamId: string | null | undefined, userId: string) {
  if (teamId) {
    await validateTeamParent({ supabase, tourId, teamId })
    return teamId
  }

  const { data: existing, error: lookupError } = await supabase
    .from("tour_teams")
    .select("id")
    .eq("tour_id", tourId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle()
  if (lookupError) throw new Error(lookupError.message)
  if (existing?.id) return existing.id as string

  const { data: created, error: createError } = await supabase
    .from("tour_teams")
    .insert({
      tour_id: tourId,
      name: "General Tour Team",
      role: "general",
      team_type: "general",
      description: "Default team for ungrouped tour members.",
      created_by: userId,
    })
    .select("id")
    .single()
  if (createError || !created?.id) throw new Error(createError?.message || "Failed to create a default tour team.")
  return created.id as string
}

async function loadMember(supabase: any, id: string) {
  const { data, error } = await supabase
    .from("tour_team_members")
    .select("*")
    .eq("id", id)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data as Record<string, unknown> | null
}

export const GET = withAdminCapability("workforce.view", async (request: NextRequest, { supabase, user, admin }) => {
  try {
    const url = new URL(request.url)
    const teamId = url.searchParams.get("team_id")
    const requestedTourId = url.searchParams.get("tour_id")
    let tourId = requestedTourId ? idSchema.parse(requestedTourId) : null

    if (teamId) {
      const team = await loadTeam(supabase, idSchema.parse(teamId))
      if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 })
      if (tourId && team.tour_id !== tourId) {
        return NextResponse.json({ error: "Team does not belong to the supplied tour" }, { status: 409 })
      }
      tourId = team.tour_id
    }
    if (!tourId) return NextResponse.json({ error: "tour_id or team_id required" }, { status: 400 })

    await validateWorkforceAssignmentParents({
      supabase,
      userId: user.id,
      orgId: admin.orgId,
      tourId,
      teamId: teamId ? idSchema.parse(teamId) : null,
    })
    await assertAdminTourAccess({ supabase, userId: user.id, tourId, orgId: admin.orgId })

    let query = supabase.from("tour_team_members").select("*").eq("tour_id", tourId)
    if (teamId) query = query.eq("team_id", teamId)
    const { data, error } = await query.order("created_at", { ascending: true })
    if (error) throw new Error(error.message)
    return NextResponse.json({
      data: (data ?? []).map((row: Record<string, unknown>) =>
        presentProjectedMember(row, admin.capabilities),
      ),
    })
  } catch (error) {
    return errorResponse(error, "Failed to load team members")
  }
})

export const POST = withAdminCapability("workforce.manage", async (request: NextRequest, { supabase, user, admin }) => {
  try {
    let input = tourMemberInputSchema.parse(await request.json())
    await validateWorkforceAssignmentParents({
      supabase,
      userId: user.id,
      orgId: admin.orgId,
      tourId: input.tour_id,
      teamId: input.team_id ?? null,
      role: input.role,
      requireRole: true,
    })
    await assertAdminTourAccess({ supabase, userId: user.id, tourId: input.tour_id, orgId: admin.orgId })
    const teamId = await ensureTeam(supabase, input.tour_id, input.team_id, user.id)

    if (input.user_id && (!input.name || !input.email)) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("id", input.user_id)
        .maybeSingle()
      input = {
        ...input,
        name: input.name || profile?.full_name || undefined,
        email: input.email || profile?.email || undefined,
      }
    }

    const { data, error } = await supabase
      .from("tour_team_members")
      .insert(buildTourMemberWrite(input, user.id, teamId, admin.orgId))
      .select("*")
      .single()
    if (error) throw new Error(error.message)
    return NextResponse.json(
      { data: presentProjectedMember(data as Record<string, unknown>, admin.capabilities) },
      { status: 201 },
    )
  } catch (error) {
    return errorResponse(error, "Failed to add team member")
  }
})

export const PATCH = withAdminCapability("workforce.manage", async (request: NextRequest, { supabase, user, admin }) => {
  try {
    const body = await request.json()
    const id = idSchema.parse(body.id)
    const existing = await loadMember(supabase, id)
    if (!existing) return NextResponse.json({ error: "Member not found" }, { status: 404 })
    const tourId = idSchema.parse(existing.tour_id)
    await validateWorkforceAssignmentParents({
      supabase,
      userId: user.id,
      orgId: admin.orgId,
      tourId,
      teamId: typeof body.team_id === "string" ? body.team_id : null,
      role: typeof body.role === "string" ? body.role : null,
    })
    await assertAdminTourAccess({ supabase, userId: user.id, tourId, orgId: admin.orgId })
    const input = tourMemberPatchSchema.parse(body)

    const patch: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
      org_id: admin.orgId,
    }
    if (input.team_id !== undefined) patch.team_id = await ensureTeam(supabase, tourId, input.team_id, user.id)
    for (const field of ["user_id", "name", "role", "email", "phone", "status", "arrival_date", "departure_date", "responsibilities"] as const) {
      if (input[field] !== undefined) patch[field] = input[field]
    }
    if (input.role !== undefined) patch.role_in_team = input.role
    if (input.status !== undefined) patch.is_active = input.status !== "declined"
    patch.profile = {
      ...(existing.profile && typeof existing.profile === "object" ? existing.profile : {}),
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.email !== undefined ? { email: input.email } : {}),
      ...(input.phone !== undefined ? { phone: input.phone } : {}),
      ...(input.arrival_date !== undefined ? { arrival_date: input.arrival_date } : {}),
      ...(input.departure_date !== undefined ? { departure_date: input.departure_date } : {}),
      ...(input.responsibilities !== undefined ? { responsibilities: input.responsibilities } : {}),
    }

    const { data, error } = await supabase
      .from("tour_team_members")
      .update(patch)
      .eq("id", id)
      .eq("tour_id", tourId)
      .select("*")
      .single()
    if (error) throw new Error(error.message)
    return NextResponse.json({
      data: presentProjectedMember(data as Record<string, unknown>, admin.capabilities),
    })
  } catch (error) {
    return errorResponse(error, "Failed to update team member")
  }
})

export const DELETE = withAdminCapability("workforce.manage", async (request: NextRequest, { supabase, user, admin }) => {
  try {
    const id = idSchema.parse(new URL(request.url).searchParams.get("id"))
    const existing = await loadMember(supabase, id)
    if (!existing) return NextResponse.json({ error: "Member not found" }, { status: 404 })
    const tourId = idSchema.parse(existing.tour_id)
    await validateWorkforceAssignmentParents({
      supabase,
      userId: user.id,
      orgId: admin.orgId,
      tourId,
    })
    await assertAdminTourAccess({ supabase, userId: user.id, tourId, orgId: admin.orgId })

    const { error } = await supabase
      .from("tour_team_members")
      .delete()
      .eq("id", id)
      .eq("tour_id", tourId)
    if (error) throw new Error(error.message)
    return NextResponse.json({ success: true })
  } catch (error) {
    return errorResponse(error, "Failed to remove team member")
  }
})
