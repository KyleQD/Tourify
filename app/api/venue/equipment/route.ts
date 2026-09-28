import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { authenticateApiRequest } from "@/lib/auth/api-auth"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { getCurrentVenueContext } from "@/lib/venue/venue-access"

export const dynamic = "force-dynamic"

const createSchema = z.object({
  venue_id: z.string().uuid().optional(),
  name: z.string().min(1),
  category: z.enum(["sound", "lighting", "stage", "seating", "catering", "security", "other"]),
  description: z.string().optional().nullable(),
  quantity: z.number().int().min(1).default(1),
  condition: z.enum(["excellent", "good", "fair", "needs_repair", "out_of_service"]).default("good"),
  purchase_date: z.string().optional().nullable(),
  last_maintenance: z.string().optional().nullable(),
  next_maintenance: z.string().optional().nullable(),
  is_available_for_rent: z.boolean().default(false),
  rental_price: z.number().optional().nullable(),
})

const patchSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).optional(),
  category: z.enum(["sound", "lighting", "stage", "seating", "catering", "security", "other"]).optional(),
  description: z.string().optional().nullable(),
  quantity: z.number().int().min(1).optional(),
  condition: z.enum(["excellent", "good", "fair", "needs_repair", "out_of_service"]).optional(),
  purchase_date: z.string().optional().nullable(),
  last_maintenance: z.string().optional().nullable(),
  next_maintenance: z.string().optional().nullable(),
  is_available_for_rent: z.boolean().optional(),
  rental_price: z.number().optional().nullable(),
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

  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from("venue_equipment")
    .select("*")
    .eq("venue_id", venueId)
    .order("category", { ascending: true })

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

  const supabase = createServiceRoleClient()
  const { venue_id: _vid, ...rest } = parsed.data
  const { data, error } = await supabase
    .from("venue_equipment")
    .insert({ ...rest, venue_id: venueId })
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
  const { data, error } = await supabase
    .from("venue_equipment")
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
  const { error } = await supabase.from("venue_equipment").delete().eq("id", id)

  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
