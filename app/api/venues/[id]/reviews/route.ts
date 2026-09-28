import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { authenticateApiRequest } from "@/lib/auth/api-auth"

export const dynamic = "force-dynamic"

const createSchema = z.object({
  rating: z.number().int().min(1).max(5),
  title: z.string().max(200).optional().nullable(),
  comment: z.string().min(1).max(2000),
})

const respondSchema = z.object({
  review_id: z.string().uuid(),
  response_from_venue: z.string().min(1).max(2000),
})

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: venueId } = await params
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from("venue_reviews")
    .select(`
      id, venue_id, reviewer_id, rating, title, comment,
      is_verified, response_from_venue, responded_at, created_at, updated_at,
      profiles:reviewer_id ( full_name, avatar_url, username )
    `)
    .eq("venue_id", venueId)
    .order("created_at", { ascending: false })

  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })

  return NextResponse.json({ success: true, data })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateApiRequest(request)
  if (!auth) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

  const { id: venueId } = await params
  const body = await request.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 })
  }

  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from("venue_reviews")
    .insert({
      venue_id: venueId,
      reviewer_id: auth.user.id,
      rating: parsed.data.rating,
      title: parsed.data.title ?? null,
      comment: parsed.data.comment,
      photos: [],
      is_verified: false,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })

  return NextResponse.json({ success: true, data }, { status: 201 })
}

// Venue owner responds to a review
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateApiRequest(request)
  if (!auth) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

  const { id: venueId } = await params
  const body = await request.json()
  const parsed = respondSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 })
  }

  // Confirm caller owns this venue
  const supabase = createServiceRoleClient()
  const { data: venueRow, error: venueErr } = await supabase
    .from("venue_profiles")
    .select("id")
    .eq("id", venueId)
    .eq("user_id", auth.user.id)
    .single()

  if (venueErr || !venueRow) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
  }

  const { data, error } = await supabase
    .from("venue_reviews")
    .update({
      response_from_venue: parsed.data.response_from_venue,
      responded_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.review_id)
    .eq("venue_id", venueId)
    .select()
    .single()

  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })

  return NextResponse.json({ success: true, data })
}
