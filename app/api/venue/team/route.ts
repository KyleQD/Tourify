import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { authenticateApiRequest } from "@/lib/auth/api-auth"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { canManageVenue, getCurrentVenueContext } from "@/lib/venue/venue-access"

export const dynamic = "force-dynamic"

const createSchema = z.object({
  venue_id: z.string().uuid().optional(),
  user_id: z.string().uuid().optional().nullable(),
  name: z.string().min(1),
  email: z.string().email(),
  role: z.string().min(1).optional(),
  permissions: z.record(z.boolean()).optional(),
})

const patchSchema = z.object({
  id: z.string().uuid(),
  role: z.string().optional(),
  status: z.string().optional(),
  permissions: z.record(z.boolean()).optional(),
})

async function resolveVenueId(request: NextRequest, auth: { user: any; supabase: any }) {
  const { searchParams } = new URL(request.url)
  const venueId = searchParams.get("venue_id")
  if (venueId) return venueId
  const venue = await getCurrentVenueContext(auth.supabase, auth.user.id)
  return venue?.id || null
}

const defaultPermissions = {
  manage_bookings: false,
  manage_events: false,
  manage_ticketing: false,
  manage_team: false,
  manage_documents: false,
  view_analytics: false,
  view_finances: false,
  door_check_in: false,
}

export async function GET(request: NextRequest) {
  const auth = await authenticateApiRequest(request)
  if (!auth) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

  const venueId = await resolveVenueId(request, auth)
  if (!venueId) return NextResponse.json({ success: false, error: "venue_id is required" }, { status: 400 })

  const access = await canManageVenue(auth.supabase, auth.user.id, venueId, "manage_team")
  if (!access.allowed) return NextResponse.json({ success: false, error: access.reason || "Forbidden" }, { status: 403 })

  const service = createServiceRoleClient()
  const [staffResult, legacyResult] = await Promise.all([
    service
      .from("staff_members")
      .select(
        "id, user_id, venue_id, employer_entity_id, name, email, role, department, employment_type, permissions, status, created_at, updated_at",
      )
      .eq("employer_entity_type", "venue")
      .eq("employer_entity_id", venueId)
      .order("created_at", { ascending: false })
      .limit(250),
    service
      .from("venue_team_members")
      .select("id, user_id, venue_id, name, email, role, permissions, status, created_at, updated_at")
      .eq("venue_id", venueId)
      .order("created_at", { ascending: false })
      .limit(250),
  ])

  if (staffResult.error && legacyResult.error) {
    return NextResponse.json({ success: false, error: staffResult.error.message, members: [] }, { status: 500 })
  }

  const membersByEmail = new Map<string, any>()
  for (const member of legacyResult.error ? [] : legacyResult.data || []) {
    membersByEmail.set(String(member.email || member.id).toLowerCase(), { ...member, source: "legacy" })
  }
  for (const member of staffResult.error ? [] : staffResult.data || []) {
    membersByEmail.set(String(member.email || member.id).toLowerCase(), {
      ...member,
      venue_id: venueId,
      source: "staff_members",
    })
  }

  return NextResponse.json({ success: true, members: Array.from(membersByEmail.values()) })
}

export async function POST(request: NextRequest) {
  const auth = await authenticateApiRequest(request)
  if (!auth) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

  const body = createSchema.parse(await request.json())
  const venueId = body.venue_id || (await getCurrentVenueContext(auth.supabase, auth.user.id))?.id
  if (!venueId) return NextResponse.json({ success: false, error: "venue_id is required" }, { status: 400 })

  const access = await canManageVenue(auth.supabase, auth.user.id, venueId, "manage_team")
  if (!access.allowed) return NextResponse.json({ success: false, error: access.reason || "Forbidden" }, { status: 403 })

  const service = createServiceRoleClient()
  const { data, error } = await service
    .from("staff_members")
    .insert({
      venue_id: null,
      employer_entity_type: "venue",
      employer_entity_id: venueId,
      user_id: body.user_id || null,
      name: body.name,
      email: body.email,
      role: body.role || "member",
      permissions: body.permissions || defaultPermissions,
      status: "active",
    })
    .select("*")
    .single()

  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, member: data })
}

export async function PATCH(request: NextRequest) {
  const auth = await authenticateApiRequest(request)
  if (!auth) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

  const body = patchSchema.parse(await request.json())
  const service = createServiceRoleClient()
  let { data: member } = await service
    .from("staff_members")
    .select("id, venue_id, employer_entity_id")
    .eq("id", body.id)
    .maybeSingle()
  let resolvedMember: any = member
  let table: "staff_members" | "venue_team_members" = "staff_members"

  if (!resolvedMember?.id) {
    const legacy = await service.from("venue_team_members").select("id, venue_id").eq("id", body.id).maybeSingle()
    resolvedMember = legacy.data
    table = "venue_team_members"
  }

  if (!resolvedMember?.id) return NextResponse.json({ success: false, error: "Team member not found" }, { status: 404 })

  const memberVenueId = resolvedMember.employer_entity_id || resolvedMember.venue_id
  const access = await canManageVenue(auth.supabase, auth.user.id, memberVenueId, "manage_team")
  if (!access.allowed) return NextResponse.json({ success: false, error: access.reason || "Forbidden" }, { status: 403 })

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.role !== undefined) updates.role = body.role
  if (body.status !== undefined) updates.status = body.status
  if (body.permissions !== undefined) updates.permissions = body.permissions

  const { data, error } = await service
    .from(table)
    .update(updates)
    .eq("id", body.id)
    .select("*")
    .single()

  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, member: data })
}

export async function DELETE(request: NextRequest) {
  const auth = await authenticateApiRequest(request)
  if (!auth) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")
  if (!id) return NextResponse.json({ success: false, error: "id is required" }, { status: 400 })

  const service = createServiceRoleClient()
  let { data: member } = await service
    .from("staff_members")
    .select("id, venue_id, employer_entity_id")
    .eq("id", id)
    .maybeSingle()
  let resolvedMember: any = member
  let table: "staff_members" | "venue_team_members" = "staff_members"

  if (!resolvedMember?.id) {
    const legacy = await service.from("venue_team_members").select("id, venue_id").eq("id", id).maybeSingle()
    resolvedMember = legacy.data
    table = "venue_team_members"
  }

  if (!resolvedMember?.id) return NextResponse.json({ success: false, error: "Team member not found" }, { status: 404 })

  const memberVenueId = resolvedMember.employer_entity_id || resolvedMember.venue_id
  const access = await canManageVenue(auth.supabase, auth.user.id, memberVenueId, "manage_team")
  if (!access.allowed) return NextResponse.json({ success: false, error: access.reason || "Forbidden" }, { status: 403 })

  const { error } = await service.from(table).delete().eq("id", id)
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
