import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { resolveCommerceContext } from "@/lib/admin/commerce/resolve-context"
import { commerceErrorResponse, commerceJsonResponse } from "@/lib/admin/commerce/errors"

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
    const commerce = await resolveCommerceContext(request, {
      requiredPermission: "commerce.manage_cases",
    })
    if (commerce instanceof NextResponse) return commerce

    const supabase = await createClient()

    const parsedQuery = moderationQuerySchema.safeParse({
      status: request.nextUrl.searchParams.get("status") || undefined,
      q: request.nextUrl.searchParams.get("q") || undefined,
      page: request.nextUrl.searchParams.get("page") || undefined,
      pageSize: request.nextUrl.searchParams.get("pageSize") || undefined,
      sortBy: request.nextUrl.searchParams.get("sortBy") || undefined,
      sortDirection: request.nextUrl.searchParams.get("sortDirection") || undefined,
    })
    if (!parsedQuery.success) {
      return commerceErrorResponse({
        status: 400,
        code: "invalid_request",
        message: "Invalid moderation query params.",
        issues: parsedQuery.error.issues,
        correlationId: commerce.request.correlationId,
      })
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
    if (error) {
      return commerceErrorResponse({
        status: 500,
        code: "moderation_queue_unavailable",
        message: "Failed to load moderation queue.",
        retryable: true,
        correlationId: commerce.request.correlationId,
      })
    }

    return commerceJsonResponse({
      data: data || [],
      pagination: {
        page,
        pageSize,
        total: count || 0,
        totalPages: Math.max(Math.ceil((count || 0) / pageSize), 1),
        sortBy,
        sortDirection: sortAscending ? "asc" : "desc",
      },
    }, {
      correlationId: commerce.request.correlationId,
    })
  } catch (error) {
    console.error("Unexpected moderation GET error", error)
    return commerceErrorResponse({
      status: 500,
      code: "unexpected_moderation_error",
      message: "Unexpected moderation error.",
      retryable: true,
    })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const commerce = await resolveCommerceContext(request, {
      requiredPermission: "commerce.manage_cases",
    })
    if (commerce instanceof NextResponse) return commerce

    const supabase = await createClient()

    const payload = updateQueueSchema.parse(await request.json())
    const { data, error } = await supabase
      .from("marketplace_moderation_queue")
      .update({
        status: payload.status,
        resolution: payload.resolution || null,
        assigned_admin_id: commerce.actor.userId,
      })
      .eq("id", payload.id)
      .select("*")
      .single()

    if (error) {
      return commerceErrorResponse({
        status: 500,
        code: "moderation_update_failed",
        message: "Failed to update moderation item.",
        retryable: true,
        correlationId: commerce.request.correlationId,
      })
    }
    return commerceJsonResponse({ data }, {
      correlationId: commerce.request.correlationId,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return commerceErrorResponse({
        status: 400,
        code: "invalid_request",
        message: "Invalid moderation payload.",
        issues: error.issues,
      })
    }
    console.error("Unexpected moderation PATCH error", error)
    return commerceErrorResponse({
      status: 500,
      code: "unexpected_moderation_error",
      message: "Unexpected moderation error.",
      retryable: true,
    })
  }
}
