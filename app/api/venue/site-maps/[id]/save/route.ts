import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { authenticateApiRequest } from "@/lib/auth/api-auth"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export const dynamic = "force-dynamic"

function getSiteMapId(request: NextRequest) {
  const parts = request.nextUrl.pathname.split("/")
  return parts[parts.length - 1]
}

/**
 * VEN-231 — optimistic-concurrency save for Venue site maps.
 *
 * Body: { expected_version, name?, description?, background_color?,
 *         grid_enabled?, grid_size?, elements?, zones?, status? }
 *
 * The stored `version` acts as the checkpoint counter: a mismatch returns 409
 * CONFLICT so the editor can reload instead of clobbering someone else's work.
 */
const saveSchema = z.object({
  expected_version: z.number().int().positive(),
  name: z.string().trim().min(1).max(160).optional(),
  description: z.string().trim().max(2000).nullable().optional(),
  background_color: z.string().trim().max(32).nullable().optional(),
  grid_enabled: z.boolean().optional(),
  grid_size: z.number().int().min(4).max(200).optional(),
  elements: z.array(z.record(z.unknown())).max(2000).optional(),
  zones: z.array(z.record(z.unknown())).max(500).optional(),
})

export async function PUT(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await authenticateApiRequest(request)
  if (!auth) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

  const siteMapId = getSiteMapId(request)
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(siteMapId)) {
    return NextResponse.json({ success: false, error: "Invalid site map id" }, { status: 400 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 })
  }
  const parsed = saveSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Invalid save payload", details: parsed.error.flatten() },
      { status: 400 },
    )
  }
  const { expected_version, elements, zones, ...fields } = parsed.data

  const service = createServiceRoleClient()

  // Optimistic concurrency: only proceed when version still matches.
  const { data: current, error: currentError } = await service
    .from("site_maps")
    .select("id, version, created_by, venue_profile_id")
    .eq("id", siteMapId)
    .single()

  if (currentError || !current?.id) {
    return NextResponse.json({ success: false, error: "Site map not found" }, { status: 404 })
  }

  // Authorization: creator OR venue operator (VEN-227 bridge).
  const isCreator = current.created_by === auth.user.id
  let isOperator = false
  if (!isCreator && current.venue_profile_id) {
    const { data: opCheck } = await service.rpc("venue_has_operator_access", {
      p_venue_id: current.venue_profile_id,
    })
    isOperator = Boolean(opCheck)
  }
  if (!isCreator && !isOperator) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
  }

  if (current.version !== expected_version) {
    return NextResponse.json(
      {
        success: false,
        code: "VERSION_CONFLICT",
        error: `This map changed since you loaded it (server v${current.version}, you had v${expected_version}).`,
      },
      { status: 409 },
    )
  }

  const nextVersion = current.version + 1
  const updatePayload: Record<string, unknown> = {
    version: nextVersion,
    updated_at: new Date().toISOString(),
  }
  for (const key of ["name", "description", "background_color", "grid_enabled", "grid_size"] as const) {
    if (fields[key] !== undefined) updatePayload[key] = fields[key]
  }

  // Elements/zones replace wholesale when provided (editor sends full sets).
  if (elements) {
    await service.from("site_map_elements").delete().eq("site_map_id", siteMapId)
    if (elements.length > 0) {
      await service.from("site_map_elements").insert(
        elements.map((e) => ({ ...(e as object), site_map_id: siteMapId })),
      )
    }
  }
  if (zones) {
    await service.from("site_map_zones").delete().eq("site_map_id", siteMapId)
    if (zones.length > 0) {
      await service.from("site_map_zones").insert(
        zones.map((zn) => ({ ...(zn as object), site_map_id: siteMapId })),
      )
    }
  }

  const { data, error } = await service
    .from("site_maps")
    .update(updatePayload)
    .eq("id", siteMapId)
    .select("id, name, version, updated_at")
    .single()

  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, data })
}
