import { NextRequest, NextResponse } from "next/server"
import { authenticateApiRequest } from "@/lib/auth/api-auth"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { canManageVenue } from "@/lib/venue/venue-access"

export const dynamic = "force-dynamic"

function getRoleId(request: NextRequest) {
  const parts = request.nextUrl.pathname.split("/")
  return parts[parts.length - 1]
}

async function getRoleVenue(service: any, roleId: string) {
  const { data } = await service
    .from("role_templates")
    .select("id, owner_entity_type, owner_entity_id")
    .eq("id", roleId)
    .maybeSingle()
  return data || null
}

export async function PATCH(request: NextRequest) {
  const auth = await authenticateApiRequest(request)
  if (!auth) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

  const roleId = getRoleId(request)
  const service = createServiceRoleClient()
  const role = await getRoleVenue(service, roleId)
  if (!role?.id || role.owner_entity_type !== "venue" || !role.owner_entity_id) {
    return NextResponse.json({ success: false, error: "Venue role not found" }, { status: 404 })
  }

  const access = await canManageVenue(auth.supabase, auth.user.id, role.owner_entity_id, "manage_team")
  if (!access.allowed) return NextResponse.json({ success: false, error: access.reason || "Forbidden" }, { status: 403 })

  const body = await request.json()
  const { data, error } = await service
    .from("role_templates")
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq("id", roleId)
    .select("*")
    .single()

  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, role: data })
}

export async function DELETE(request: NextRequest) {
  const auth = await authenticateApiRequest(request)
  if (!auth) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

  const roleId = getRoleId(request)
  const service = createServiceRoleClient()
  const role = await getRoleVenue(service, roleId)
  if (!role?.id || role.owner_entity_type !== "venue" || !role.owner_entity_id) {
    return NextResponse.json({ success: false, error: "Venue role not found" }, { status: 404 })
  }

  const access = await canManageVenue(auth.supabase, auth.user.id, role.owner_entity_id, "manage_team")
  if (!access.allowed) return NextResponse.json({ success: false, error: access.reason || "Forbidden" }, { status: 403 })

  const { error } = await service.from("role_templates").delete().eq("id", roleId)
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
