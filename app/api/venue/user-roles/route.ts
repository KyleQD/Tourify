import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { authenticateApiRequest } from "@/lib/auth/api-auth"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { canManageVenue, getCurrentVenueContext } from "@/lib/venue/venue-access"

export const dynamic = "force-dynamic"

/**
 * VEN-126 — user role assignment backed by canonical rbac_user_entity_roles.
 *
 * GET    returns the Venue roster (canonical staff_members + legacy team members
 *        during migration) joined with their active RBAC assignments.
 * POST   upserts an assignment with optional expiry after validating the target
 *        user is a roster member and the role exists.
 */

const assignSchema = z.object({
  venue_id: z.string().uuid().optional(),
  user_id: z.string().uuid(),
  role_id: z.string().uuid(),
  expires_at: z.string().datetime({ offset: true }).nullable().optional(),
})

async function loadRosterUserIds(service: any, venueId: string) {
  // Canonical roster first; legacy team members included during VEN-103 window.
  const [staffRes, teamRes] = await Promise.all([
    service
      .from("staff_members")
      .select("user_id, name, email")
      .eq("employer_entity_type", "venue")
      .eq("employer_entity_id", venueId)
      .eq("status", "active"),
    service
      .from("venue_team_members")
      .select("user_id, name, email, avatar_url")
      .eq("venue_id", venueId)
      .eq("status", "active"),
  ])

  const users = new Map<
    string,
    { user_id: string; name: string | null; email: string | null; avatar_url?: string | null }
  >()
  for (const row of staffRes.data || []) {
    if (row.user_id) users.set(String(row.user_id), { ...row, user_id: String(row.user_id) })
  }
  for (const row of teamRes.data || []) {
    if (row.user_id && !users.has(String(row.user_id))) {
      users.set(String(row.user_id), {
        user_id: String(row.user_id),
        name: row.name,
        email: row.email,
        avatar_url: row.avatar_url ?? null,
      })
    }
  }
  return { users, error: staffRes.error && teamRes.error ? staffRes.error : null }
}

export async function GET(request: NextRequest) {
  const auth = await authenticateApiRequest(request)
  if (!auth) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

  const venueId =
    request.nextUrl.searchParams.get("venue_id") ||
    request.nextUrl.searchParams.get("venueId") ||
    (await getCurrentVenueContext(auth.supabase, auth.user.id))?.id
  if (!venueId) return NextResponse.json({ success: false, error: "venue_id is required" }, { status: 400 })

  const access = await canManageVenue(auth.supabase, auth.user.id, venueId, "manage_team")
  if (!access.allowed) return NextResponse.json({ success: false, error: access.reason || "Forbidden" }, { status: 403 })

  const service = createServiceRoleClient()
  const { users, error: rosterError } = await loadRosterUserIds(service, venueId)
  if (rosterError) {
    return NextResponse.json({ success: false, error: rosterError.message, usersWithRoles: [] }, { status: 500 })
  }

  const { data: assignments, error: assignError } = await service
    .from("rbac_user_entity_roles")
    .select("id, user_id, role_id, start_at, end_at, rbac_roles(name)")
    .eq("entity_type", "Venue")
    .eq("entity_id", venueId)
    .eq("is_active", true)

  if (assignError) {
    return NextResponse.json({ success: false, error: assignError.message, usersWithRoles: [] }, { status: 500 })
  }

  const byUser = new Map<string, any[]>()
  for (const row of assignments || []) {
    const rel = Array.isArray(row.rbac_roles) ? row.rbac_roles[0] : row.rbac_roles
    const entry = {
      id: row.id,
      role_id: row.role_id,
      role_name: rel?.name ?? "Unknown role",
      start_at: row.start_at,
      end_at: row.end_at,
      is_active: true,
    }
    const list = byUser.get(String(row.user_id)) ?? []
    list.push(entry)
    byUser.set(String(row.user_id), list)
  }

  const usersWithRoles = Array.from(users.values()).map((user) => ({
    ...user,
    roles: byUser.get(user.user_id) ?? [],
  }))

  return NextResponse.json({ success: true, usersWithRoles, data: usersWithRoles })
}

export async function POST(request: NextRequest) {
  const auth = await authenticateApiRequest(request)
  if (!auth) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

  const body = assignSchema.parse(await request.json())
  const venueId = body.venue_id || (await getCurrentVenueContext(auth.supabase, auth.user.id))?.id
  if (!venueId) return NextResponse.json({ success: false, error: "venue_id is required" }, { status: 400 })

  const access = await canManageVenue(auth.supabase, auth.user.id, venueId, "manage_team")
  if (!access.allowed) return NextResponse.json({ success: false, error: access.reason || "Forbidden" }, { status: 403 })

  const service = createServiceRoleClient()

  // Role must exist.
  const { data: role } = await service.from("rbac_roles").select("id").eq("id", body.role_id).maybeSingle()
  if (!role?.id) return NextResponse.json({ success: false, error: "Role not found" }, { status: 404 })

  // Target user must be a current roster member of THIS venue (no raw-UUID grants).
  const { users } = await loadRosterUserIds(service, venueId)
  if (!users.has(body.user_id)) {
    return NextResponse.json(
      { success: false, error: "User is not an active member of this venue roster." },
      { status: 422 },
    )
  }

  // Re-assign revives an existing (user, venue, role) row so assignment history
  // is preserved instead of relying on a hard unique constraint.
  const { data: existing } = await service
    .from("rbac_user_entity_roles")
    .select("id")
    .eq("user_id", body.user_id)
    .eq("entity_type", "Venue")
    .eq("entity_id", venueId)
    .eq("role_id", body.role_id)
    .maybeSingle()

  const payload = {
    user_id: body.user_id,
    entity_type: "Venue",
    entity_id: venueId,
    role_id: body.role_id,
    start_at: new Date().toISOString(),
    end_at: body.expires_at ?? null,
    is_active: true,
  }

  const { data: assignment, error } = existing?.id
    ? await service
        .from("rbac_user_entity_roles")
        .update(payload)
        .eq("id", existing.id)
        .select("*")
        .single()
    : await service.from("rbac_user_entity_roles").insert(payload).select("*").single()

  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, assignment })
}
