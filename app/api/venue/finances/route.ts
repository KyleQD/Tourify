import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { authenticateApiRequest } from "@/lib/auth/api-auth"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { canManageVenue, getCurrentVenueContext } from "@/lib/venue/venue-access"

export const dynamic = "force-dynamic"

const createSchema = z.object({
  venue_id: z.string().uuid().optional(),
  type: z.enum(["income", "expense"]),
  category: z.string().min(1),
  description: z.string().min(1),
  amount: z.number().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: z.enum(["completed", "pending", "cancelled"]).default("completed"),
  reference: z.string().optional().nullable(),
  event_id: z.string().optional().nullable(),
})

const patchSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(["income", "expense"]).optional(),
  category: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  amount: z.number().positive().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  status: z.enum(["completed", "pending", "cancelled"]).optional(),
  reference: z.string().optional().nullable(),
})

async function resolveVenueId(request: NextRequest, auth: { user: any; supabase: any }) {
  const { searchParams } = new URL(request.url)
  const venueId = searchParams.get("venue_id")
  if (venueId) return venueId
  const venue = await getCurrentVenueContext(auth.supabase, auth.user.id)
  return venue?.id || null
}

export async function GET(request: NextRequest) {
  const auth = await authenticateApiRequest(request)
  if (!auth) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

  const venueId = await resolveVenueId(request, auth)
  if (!venueId) return NextResponse.json({ success: false, error: "venue_id is required" }, { status: 400 })
  const access = await canManageVenue(auth.supabase, auth.user.id, venueId, "view_finances")
  if (!access.allowed) {
    return NextResponse.json({ success: false, error: access.reason || "Forbidden" }, { status: 403 })
  }

  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from("venue_manual_transactions")
    .select("*")
    .eq("venue_id", venueId)
    .order("date", { ascending: false })

  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })

  return NextResponse.json({ success: true, data })
}

export async function POST(request: NextRequest) {
  const auth = await authenticateApiRequest(request)
  if (!auth) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

  const body = await request.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 })
  }

  let venueId = parsed.data.venue_id
  if (!venueId) {
    venueId = await resolveVenueId(request, auth) ?? undefined
  }
  if (!venueId) return NextResponse.json({ success: false, error: "venue_id is required" }, { status: 400 })
  const access = await canManageVenue(auth.supabase, auth.user.id, venueId, "manage_finances")
  if (!access.allowed) {
    return NextResponse.json({ success: false, error: access.reason || "Forbidden" }, { status: 403 })
  }

  const { venue_id: _vid, ...rest } = parsed.data
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from("venue_manual_transactions")
    .insert({ ...rest, venue_id: venueId, created_by: auth.user.id })
    .select()
    .single()

  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })

  return NextResponse.json({ success: true, data }, { status: 201 })
}

export async function PATCH(request: NextRequest) {
  const auth = await authenticateApiRequest(request)
  if (!auth) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

  const body = await request.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 })
  }

  const { id, ...updates } = parsed.data
  const supabase = createServiceRoleClient()
  const { data: existing, error: existingError } = await supabase
    .from("venue_manual_transactions")
    .select("id, venue_id")
    .eq("id", id)
    .maybeSingle()
  if (existingError) {
    return NextResponse.json({ success: false, error: existingError.message }, { status: 500 })
  }
  if (!existing) {
    return NextResponse.json({ success: false, error: "Transaction not found" }, { status: 404 })
  }
  const access = await canManageVenue(
    auth.supabase,
    auth.user.id,
    existing.venue_id,
    "manage_finances",
  )
  if (!access.allowed) {
    return NextResponse.json({ success: false, error: access.reason || "Forbidden" }, { status: 403 })
  }
  const { data, error } = await supabase
    .from("venue_manual_transactions")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single()

  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })

  return NextResponse.json({ success: true, data })
}

export async function DELETE(request: NextRequest) {
  const auth = await authenticateApiRequest(request)
  if (!auth) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")
  if (!id) return NextResponse.json({ success: false, error: "id is required" }, { status: 400 })

  const supabase = createServiceRoleClient()
  const { data: existing, error: existingError } = await supabase
    .from("venue_manual_transactions")
    .select("id, venue_id")
    .eq("id", id)
    .maybeSingle()
  if (existingError) {
    return NextResponse.json({ success: false, error: existingError.message }, { status: 500 })
  }
  if (!existing) {
    return NextResponse.json({ success: false, error: "Transaction not found" }, { status: 404 })
  }
  const access = await canManageVenue(
    auth.supabase,
    auth.user.id,
    existing.venue_id,
    "manage_finances",
  )
  if (!access.allowed) {
    return NextResponse.json({ success: false, error: access.reason || "Forbidden" }, { status: 403 })
  }
  const { error } = await supabase
    .from("venue_manual_transactions")
    .delete()
    .eq("id", id)
    .eq("venue_id", existing.venue_id)

  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
