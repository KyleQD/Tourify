import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { authenticateApiRequest } from "@/lib/auth/api-auth"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import {
  canManageVenue,
  ensureVenueOperationalContext,
  getCurrentVenueContext,
} from "@/lib/venue/venue-access"

export const dynamic = "force-dynamic"

const createEventSchema = z.object({
  venue_id: z.string().uuid().optional(),
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  start_at: z.string().min(1),
  end_at: z.string().min(1),
  timezone: z.string().optional().default("UTC"),
  capacity: z.number().int().positive().optional().nullable(),
  status: z
    .enum(["inquiry", "hold", "offer", "confirmed", "advancing", "onsite", "settled", "archived"])
    .optional()
    .default("inquiry"),
  event_type: z.string().optional().nullable(),
})

function buildSlug(input: string) {
  const base = (input || "event")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48)
  return `${base || "event"}-${Math.random().toString(36).slice(2, 8)}`
}

async function resolveVenue(request: NextRequest, auth: { user: any; supabase: any }) {
  const { searchParams } = new URL(request.url)
  const requestedVenueId = searchParams.get("venue_id")
  const venue = await getCurrentVenueContext(auth.supabase, auth.user.id, requestedVenueId)
  return venue
}

function mergeById(lists: any[][]) {
  const map = new Map<string, any>()
  for (const list of lists) {
    for (const row of list || []) {
      if (row?.id) map.set(row.id, row)
    }
  }
  return Array.from(map.values()).sort(
    (a, b) => new Date(a.start_at || 0).getTime() - new Date(b.start_at || 0).getTime(),
  )
}

export async function GET(request: NextRequest) {
  const auth = await authenticateApiRequest(request)
  if (!auth) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

  const venue = await resolveVenue(request, auth)
  if (!venue) return NextResponse.json({ success: false, error: "No manageable venue found" }, { status: 404 })

  const access = await canManageVenue(auth.supabase, auth.user.id, venue.id, "manage_events")
  if (!access.allowed) return NextResponse.json({ success: false, error: access.reason || "Forbidden" }, { status: 403 })

  const service = createServiceRoleClient()
  const mappedVenue = await ensureVenueOperationalContext(service as any, venue, auth.user.id)
  const { searchParams } = new URL(request.url)
  const limit = Math.min(Number(searchParams.get("limit") || 100), 250)
  const status = searchParams.get("status")

  const baseSelect = "id, org_id, venue_id, title, slug, status, start_at, end_at, timezone, capacity, settings, created_by, created_at, updated_at"
  const queries = []

  if (mappedVenue.venuesV2Id) {
    let query = service.from("events_v2").select(baseSelect).eq("venue_id", mappedVenue.venuesV2Id).limit(limit)
    if (status && status !== "all") query = query.eq("status", status)
    queries.push(query)
  }

  if (mappedVenue.operationalOrgId) {
    let query = service.from("events_v2").select(baseSelect).eq("org_id", mappedVenue.operationalOrgId).limit(limit)
    if (status && status !== "all") query = query.eq("status", status)
    queries.push(query)
  }

  let settingsQuery = service
    .from("events_v2")
    .select(baseSelect)
    .contains("settings", { venue_profile_id: mappedVenue.id })
    .limit(limit)
  if (status && status !== "all") settingsQuery = settingsQuery.eq("status", status)
  queries.push(settingsQuery)

  const results = await Promise.all(queries)
  const firstError = results.find((result) => result.error)?.error
  if (firstError) return NextResponse.json({ success: false, error: firstError.message }, { status: 500 })

  return NextResponse.json({
    success: true,
    data: mergeById(results.map((result) => result.data || [])),
    venue: {
      venueProfileId: mappedVenue.id,
      venuesV2Id: mappedVenue.venuesV2Id,
      operationalOrgId: mappedVenue.operationalOrgId,
    },
  })
}

export async function POST(request: NextRequest) {
  const auth = await authenticateApiRequest(request)
  if (!auth) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

  const body = createEventSchema.parse(await request.json())
  const venue = await getCurrentVenueContext(auth.supabase, auth.user.id, body.venue_id)
  if (!venue) return NextResponse.json({ success: false, error: "No manageable venue found" }, { status: 404 })

  const access = await canManageVenue(auth.supabase, auth.user.id, venue.id, "manage_events")
  if (!access.allowed) return NextResponse.json({ success: false, error: access.reason || "Forbidden" }, { status: 403 })

  const service = createServiceRoleClient()
  const mappedVenue = await ensureVenueOperationalContext(service as any, venue, auth.user.id)
  if (!mappedVenue.operationalOrgId) {
    return NextResponse.json({ success: false, error: "Could not resolve Venue event organization" }, { status: 500 })
  }

  const start = new Date(body.start_at)
  const end = new Date(body.end_at)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    return NextResponse.json({ success: false, error: "Valid start_at and end_at are required" }, { status: 400 })
  }

  const { data, error } = await service
    .from("events_v2")
    .insert({
      org_id: mappedVenue.operationalOrgId,
      venue_id: mappedVenue.venuesV2Id || null,
      title: body.title,
      slug: buildSlug(body.title),
      status: body.status,
      start_at: start.toISOString(),
      end_at: end.toISOString(),
      timezone: body.timezone,
      capacity: body.capacity || null,
      settings: {
        description: body.description || null,
        event_type: body.event_type || null,
        venue_profile_id: mappedVenue.id,
        venue_label: mappedVenue.displayName || mappedVenue.venue_name || "Venue",
        source: "venue",
      },
      created_by: auth.user.id,
    })
    .select("*")
    .single()

  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, data })
}
