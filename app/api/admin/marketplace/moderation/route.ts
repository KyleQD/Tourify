import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"

const updateQueueSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["open", "in_review", "resolved", "dismissed"]),
  resolution: z.string().max(1000).optional().nullable(),
})

const moderationQuerySchema = z.object({
  status: z.enum(["all", "open", "in_review", "resolved", "dismissed"]).default("all"),
  q: z.string().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(["created_at", "status"]).default("created_at"),
  sortDirection: z.enum(["asc", "desc"]).default("desc"),
})

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
    if (profile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const parsedQuery = moderationQuerySchema.safeParse({
      status: request.nextUrl.searchParams.get("status") || undefined,
      q: request.nextUrl.searchParams.get("q") || undefined,
      page: request.nextUrl.searchParams.get("page") || undefined,
      pageSize: request.nextUrl.searchParams.get("pageSize") || undefined,
      sortBy: request.nextUrl.searchParams.get("sortBy") || undefined,
      sortDirection: request.nextUrl.searchParams.get("sortDirection") || undefined,
    })
    if (!parsedQuery.success) {
      return NextResponse.json(
        {
          error: "Invalid moderation query params",
          issues: parsedQuery.error.issues,
        },
        { status: 400 }
      )
    }

    const { status, q, page, pageSize, sortBy, sortDirection } = parsedQuery.data
    const query = q?.trim()
    const sortAscending = sortDirection === "asc"
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let moderationQuery = supabase
      .from("marketplace_moderation_queue")
      .select("*, marketplace_listings(title, seller_user_id), marketplace_orders(total_amount, payment_status)", { count: "exact" })
      .order(sortBy, { ascending: sortAscending })
      .order("created_at", { ascending: false })
      .range(from, to)

    if (status && status !== "all") moderationQuery = moderationQuery.eq("status", status)
    if (query) moderationQuery = moderationQuery.or(`reason.ilike.%${query}%,details.ilike.%${query}%,resolution.ilike.%${query}%`)

    const { data, error, count } = await moderationQuery
    if (error) return NextResponse.json({ error: "Failed to load moderation queue" }, { status: 500 })

    return NextResponse.json({
      data: data || [],
      pagination: {
        page,
        pageSize,
        total: count || 0,
        totalPages: Math.max(Math.ceil((count || 0) / pageSize), 1),
        sortBy,
        sortDirection: sortAscending ? "asc" : "desc",
      },
    })
  } catch (error) {
    console.error("Unexpected moderation GET error", error)
    return NextResponse.json({ error: "Unexpected moderation error" }, { status: 500 })
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

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
    if (profile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const payload = updateQueueSchema.parse(await request.json())
    const { data, error } = await supabase
      .from("marketplace_moderation_queue")
      .update({
        status: payload.status,
        resolution: payload.resolution || null,
        assigned_admin_id: user.id,
      })
      .eq("id", payload.id)
      .select("*")
      .single()

    if (error) return NextResponse.json({ error: "Failed to update moderation item" }, { status: 500 })
    return NextResponse.json({ data })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid moderation payload", issues: error.issues }, { status: 400 })
    }
    console.error("Unexpected moderation PATCH error", error)
    return NextResponse.json({ error: "Unexpected moderation error" }, { status: 500 })
  }
}
