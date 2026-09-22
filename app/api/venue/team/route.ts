import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { authenticateApiRequest } from "@/lib/auth/api-auth"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { canManageVenue, getCurrentVenueContext } from "@/lib/venue/venue-access"

export const dynamic = "force-dynamic"

// VEN-104: live staff_members requires NOT NULL department + employment_type.
const DEPARTMENTS = ["operations", "production", "security", "hospitality", "technical", "admin"] as const
const EMPLOYMENT_TYPES = ["full_time", "part_time", "contract", "seasonal"] as const

const createSchema = z.object({
  venue_id: z.string().uuid().optional(),
  user_id: z.string().uuid().optional().nullable(),
  name: z.string().min(1),
  email: z.string().email(),
  role: z.string().min(1).optional(),
  department: z.enum(DEPARTMENTS).default("operations"),
  employment_type: z.enum(EMPLOYMENT_TYPES).default("full_time"),
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
      .select("id, user_id, venue_id, name, email, role, permissions, status, created_at, updated_at, canonical_staff_member_id")
      .eq("venue_id", venueId)
      .order("created_at", { ascending: false })
      .limit(250),
  ])

  if (staffResult.error && legacyResult.error) {
    return NextResponse.json({ success: false, error: staffResult.error.message, members: [] }, { status: 500 })
  }

  // VEN-106: canonical rows are the roster. Legacy rows appear ONLY when they
  // have NOT been bridge-linked to a canonical row — email is never an
  // identity key.
  const members = (staffResult.error ? [] : staffResult.data || []).map((member: any) => ({
    ...member,
    venue_id: venueId,
    source: "staff_members" as const,
  }))

  const linkedLegacyIds = new Set(
    (legacyResult.error ? [] : legacyResult.data || [])
      .filter((row: any) => row.canonical_staff_member_id)
      .map((row: any) => String(row.id)),
  )
  const orphanLegacy = (legacyResult.error ? [] : legacyResult.data || []).filter(
    (row: any) => !linkedLegacyIds.has(String(row.id)) && !row.canonical_staff_member_id,
  )

  return NextResponse.json({
    success: true,
    members: [
      ...members,
      ...orphanLegacy.map((member: any) => ({ ...member, source: "legacy" })),
    ],
  })
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
      department: body.department,
      employment_type: body.employment_type,
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

  // VEN-105: hard delete is replaced by a terminate/deactivate lifecycle so
  // historical assignments, pay references and audits stay intact.
  const { error, data } = await service
    .from(table)
    .update({ status: table === "staff_members" ? "inactive" : "inactive", updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("id, status")
    .single()
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, member: data, terminated: true })
}
