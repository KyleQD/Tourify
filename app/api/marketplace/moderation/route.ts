import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"

const reportSchema = z.object({
  listingId: z.string().uuid().optional().nullable(),
  orderId: z.string().uuid().optional().nullable(),
  reason: z.string().min(3).max(280),
  details: z.string().max(2000).optional().nullable(),
})

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const payload = reportSchema.parse(await request.json())
    if (!payload.listingId && !payload.orderId) {
      return NextResponse.json({ error: "listingId or orderId is required" }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("marketplace_moderation_queue")
      .insert({
        listing_id: payload.listingId || null,
        order_id: payload.orderId || null,
        reason: payload.reason,
        details: payload.details || null,
      })
      .select("*")
      .single()

    if (error) {
      console.error("Failed to create moderation ticket", error)
      return NextResponse.json({ error: "Failed to submit moderation request" }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid moderation report payload", issues: error.issues }, { status: 400 })
    }
    console.error("Unexpected moderation report error", error)
    return NextResponse.json({ error: "Unexpected moderation report error" }, { status: 500 })
  }
}
