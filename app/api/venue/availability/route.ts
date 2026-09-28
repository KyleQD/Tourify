import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { authenticateApiRequest } from "@/lib/auth/api-auth"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { canManageVenue, getCurrentVenueContext } from "@/lib/venue/venue-access"
import {
  clearVenueAvailability,
  clearVenueAvailabilityById,
  getVenueAvailabilityById,
  listVenueAvailability,
  parseAvailabilityDate,
  updateVenueAvailabilityById,
  upsertVenueAvailability,
} from "@/lib/venue/availability"

export const dynamic = "force-dynamic"

const BLOCKED_REASON_MAX = 500
const NOTES_MAX = 2000

const writeBlockSchema = z.object({
  venueId: z.string().uuid().optional(),
  date: z.string().min(1),
  isAvailable: z.boolean().optional(),
  blockedReason: z.string().max(BLOCKED_REASON_MAX).optional().nullable(),
  notes: z.string().max(NOTES_MAX).optional().nullable(),
})

const patchBlockSchema = z.object({
  id: z.string().uuid(),
  isAvailable: z.boolean().optional(),
  blockedReason: z.string().max(BLOCKED_REASON_MAX).optional().nullable(),
  notes: z.string().max(NOTES_MAX).optional().nullable(),
})

const UNAUTHORIZED = NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

async function resolveVenueId(request: NextRequest, auth: { user: { id: string }; supabase: any }) {
  const { searchParams } = new URL(request.url)
  const requestedVenueId = searchParams.get("venue_id") || searchParams.get("venueId")
  if (requestedVenueId) return requestedVenueId
  const venue = await getCurrentVenueContext(auth.supabase, auth.user.id)
  return venue?.id || null
}

function forbidden(reason?: string) {
  return NextResponse.json({ success: false, error: reason || "Forbidden" }, { status: 403 })
}

/**
 * VENUE-004 — venue-scoped availability block writer.
 *
 * Every read/write is bound to the resolved venue and gated by
 * `canManageVenue(..., "manage_bookings")` at the data edge before the
 * service-role client is used. Callers must not rely on raw-row RLS writes on
 * `venue_availability` (that boundary is owned by VENUE-005/DB-002).
 */
export async function GET(request: NextRequest) {
  const auth = await authenticateApiRequest(request)
  if (!auth) return UNAUTHORIZED

  const venueId = await resolveVenueId(request, auth)
  if (!venueId) {
    return NextResponse.json({ success: false, error: "venue_id is required" }, { status: 400 })
  }

  const access = await canManageVenue(auth.supabase, auth.user.id, venueId, "manage_bookings")
  if (!access.allowed) return forbidden(access.reason)

  const { searchParams } = new URL(request.url)
  const fromParam = searchParams.get("from")
  const toParam = searchParams.get("to")
  const from = fromParam ? (parseAvailabilityDate(fromParam) ?? undefined) : undefined
  const to = toParam ? (parseAvailabilityDate(toParam) ?? undefined) : undefined
  if (fromParam && !from) {
    return NextResponse.json({ success: false, error: "from must be a yyyy-MM-dd date" }, { status: 400 })
  }
  if (toParam && !to) {
    return NextResponse.json({ success: false, error: "to must be a yyyy-MM-dd date" }, { status: 400 })
  }

  const service = createServiceRoleClient()
  const { data, error } = await listVenueAvailability(service, { venueId, from, to })
  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, data: data ?? [] })
}

/** Creates/replaces a manual block (isAvailable=false) or opens a date. */
export async function POST(request: NextRequest) {
  const auth = await authenticateApiRequest(request)
  if (!auth) return UNAUTHORIZED

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 })
  }

  const parsed = writeBlockSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Invalid availability payload", details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  const date = parseAvailabilityDate(parsed.data.date)
  if (!date) {
    return NextResponse.json({ success: false, error: "date must be a yyyy-MM-dd date" }, { status: 400 })
  }

  const venueId = parsed.data.venueId || (await resolveVenueId(request, auth))
  if (!venueId) {
    return NextResponse.json({ success: false, error: "venueId is required" }, { status: 400 })
  }

  const access = await canManageVenue(auth.supabase, auth.user.id, venueId, "manage_bookings")
  if (!access.allowed) return forbidden(access.reason)

  const service = createServiceRoleClient()
  const { data, error } = await upsertVenueAvailability(service, {
    venueId,
    date,
    isAvailable: parsed.data.isAvailable ?? false,
    blockedReason: parsed.data.blockedReason ?? null,
    notes: parsed.data.notes ?? null,
  })
  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, data }, { status: data ? 201 : 200 })
}

/** Updates an existing availability row by id (scope resolved from the row). */
export async function PATCH(request: NextRequest) {
  const auth = await authenticateApiRequest(request)
  if (!auth) return UNAUTHORIZED

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 })
  }

  const parsed = patchBlockSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Invalid availability update", details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  const service = createServiceRoleClient()
  const { data: existing, error: existingError } = await getVenueAvailabilityById(service, parsed.data.id)
  if (existingError) {
    return NextResponse.json({ success: false, error: existingError.message }, { status: 500 })
  }
  if (!existing?.id) {
    return NextResponse.json({ success: false, error: "Availability row not found" }, { status: 404 })
  }

  const access = await canManageVenue(auth.supabase, auth.user.id, existing.venue_id, "manage_bookings")
  if (!access.allowed) return forbidden(access.reason)

  const { data, error } = await updateVenueAvailabilityById(service, parsed.data.id, {
    isAvailable: parsed.data.isAvailable,
    blockedReason: parsed.data.blockedReason,
    notes: parsed.data.notes,
  })
  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, data })
}

/** Clears a manual block by `?id=` or by `?date=` within the resolved venue. */
export async function DELETE(request: NextRequest) {
  const auth = await authenticateApiRequest(request)
  if (!auth) return UNAUTHORIZED

  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")
  const dateParam = searchParams.get("date")

  if (!id && !dateParam) {
    return NextResponse.json({ success: false, error: "id or date is required" }, { status: 400 })
  }

  const service = createServiceRoleClient()

  if (id) {
    const { data: existing, error: existingError } = await getVenueAvailabilityById(service, id)
    if (existingError) {
      return NextResponse.json({ success: false, error: existingError.message }, { status: 500 })
    }
    if (!existing?.id) {
      return NextResponse.json({ success: false, error: "Availability row not found" }, { status: 404 })
    }
    const access = await canManageVenue(auth.supabase, auth.user.id, existing.venue_id, "manage_bookings")
    if (!access.allowed) return forbidden(access.reason)
    const { data, error } = await clearVenueAvailabilityById(service, id)
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
    return NextResponse.json({ success: true, data, cleared: true })
  }

  const date = parseAvailabilityDate(dateParam)
  if (!date) {
    return NextResponse.json({ success: false, error: "date must be a yyyy-MM-dd date" }, { status: 400 })
  }

  const venueId = await resolveVenueId(request, auth)
  if (!venueId) {
    return NextResponse.json({ success: false, error: "venue_id is required" }, { status: 400 })
  }

  const access = await canManageVenue(auth.supabase, auth.user.id, venueId, "manage_bookings")
  if (!access.allowed) return forbidden(access.reason)

  const { data, error, cleared } = await clearVenueAvailability(service, { venueId, date })
  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
  return NextResponse.json({ success: true, data, cleared: Boolean(cleared) })
}