import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"

const milestoneSchema = z.object({
  title: z.string().min(2).max(160),
  description: z.string().max(2000).optional().nullable(),
  dueAt: z.string().datetime().optional().nullable(),
  revisionLimit: z.number().int().min(0).max(20).optional(),
})

const updateMilestoneSchema = z.object({
  milestoneId: z.string().uuid(),
  status: z.enum(["pending", "in_progress", "delivered", "accepted", "needs_revision"]).optional(),
  revisionCount: z.number().int().min(0).max(20).optional(),
})

export const dynamic = "force-dynamic"

export async function GET(_: NextRequest, { params }: { params: Promise<{ orderItemId: string }> }) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { orderItemId } = await params
    const { data: orderItem, error: itemError } = await supabase
      .from("marketplace_order_items")
      .select("id, order_id, product_type")
      .eq("id", orderItemId)
      .single()
    if (itemError || !orderItem) return NextResponse.json({ error: "Order item not found" }, { status: 404 })

    const { data: order } = await supabase
      .from("marketplace_orders")
      .select("buyer_user_id, seller_user_id")
      .eq("id", orderItem.order_id)
      .single()
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 })
    if (order.buyer_user_id !== user.id && order.seller_user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { data: milestones, error } = await supabase
      .from("marketplace_service_milestones")
      .select("*")
      .eq("order_item_id", orderItemId)
      .order("created_at", { ascending: true })

    if (error) return NextResponse.json({ error: "Failed to load milestones" }, { status: 500 })
    return NextResponse.json({ data: milestones || [] })
  } catch (error) {
    console.error("Unexpected service milestone GET error", error)
    return NextResponse.json({ error: "Unexpected service milestone error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ orderItemId: string }> }) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { orderItemId } = await params
    const payload = milestoneSchema.parse(await request.json())

    const { data: orderItem } = await supabase
      .from("marketplace_order_items")
      .select("id, order_id, product_type")
      .eq("id", orderItemId)
      .single()

    if (!orderItem || orderItem.product_type !== "service") {
      return NextResponse.json({ error: "Service order item not found" }, { status: 404 })
    }

    const { data: order } = await supabase
      .from("marketplace_orders")
      .select("seller_user_id")
      .eq("id", orderItem.order_id)
      .single()

    if (!order || order.seller_user_id !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const { data, error } = await supabase
      .from("marketplace_service_milestones")
      .insert({
        order_item_id: orderItemId,
        title: payload.title,
        description: payload.description || null,
        due_at: payload.dueAt || null,
        revision_limit: payload.revisionLimit ?? 1,
      })
      .select("*")
      .single()

    if (error) return NextResponse.json({ error: "Failed to create milestone" }, { status: 500 })
    return NextResponse.json({ data })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid milestone payload", issues: error.issues }, { status: 400 })
    }
    console.error("Unexpected service milestone POST error", error)
    return NextResponse.json({ error: "Unexpected service milestone error" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const payload = updateMilestoneSchema.parse(await request.json())
    const { data: milestone } = await supabase
      .from("marketplace_service_milestones")
      .select("id, order_item_id")
      .eq("id", payload.milestoneId)
      .single()
    if (!milestone) return NextResponse.json({ error: "Milestone not found" }, { status: 404 })

    const { data: orderItem } = await supabase
      .from("marketplace_order_items")
      .select("order_id")
      .eq("id", milestone.order_item_id)
      .single()
    if (!orderItem) return NextResponse.json({ error: "Order item not found" }, { status: 404 })

    const { data: order } = await supabase
      .from("marketplace_orders")
      .select("seller_user_id, buyer_user_id")
      .eq("id", orderItem.order_id)
      .single()
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 })
    if (order.seller_user_id !== user.id && order.buyer_user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const updatePayload = {
      status: payload.status,
      revision_count: payload.revisionCount,
      delivered_at: payload.status === "delivered" ? new Date().toISOString() : undefined,
    }
    const cleaned = Object.fromEntries(Object.entries(updatePayload).filter(([, value]) => value !== undefined))
    const { data, error } = await supabase
      .from("marketplace_service_milestones")
      .update(cleaned)
      .eq("id", payload.milestoneId)
      .select("*")
      .single()

    if (error) return NextResponse.json({ error: "Failed to update milestone" }, { status: 500 })
    return NextResponse.json({ data })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid milestone update", issues: error.issues }, { status: 400 })
    }
    console.error("Unexpected service milestone PATCH error", error)
    return NextResponse.json({ error: "Unexpected service milestone error" }, { status: 500 })
  }
}
