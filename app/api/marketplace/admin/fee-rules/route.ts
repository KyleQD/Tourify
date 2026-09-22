import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { authenticateApiRequest } from "@/lib/auth/api-auth"
import { userHasAdminSurfaceAccess } from "@/lib/auth/admin"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { jsonError } from "@/lib/api/route-helpers"

export const dynamic = "force-dynamic"

async function requireMarketplaceAdmin(request: NextRequest) {
  const auth = await authenticateApiRequest(request)
  if (!auth) return { admin: null, error: jsonError({ status: 401, code: "unauthorized", message: "Authentication required.", retryable: false }) }
  const isAdmin = await userHasAdminSurfaceAccess(auth.supabase, auth.user.id)
  if (!isAdmin) return { admin: null, error: jsonError({ status: 403, code: "forbidden", message: "Admin access required.", retryable: false }) }
  return { admin: auth.user, error: null }
}

const createRuleSchema = z.object({
  description: z.string().min(3).max(500),
  percentageFee: z.number().min(0).max(1),
  fixedFeeCents: z.number().int().min(0).optional(),
  minimumFeeCents: z.number().int().min(0).optional(),
  maximumFeeCents: z.number().int().min(0).optional(),
  scope: z.string().max(100).optional(),
  listingKindScope: z.string().max(100).optional(),
  effectiveFrom: z.string().datetime(),
  effectiveUntil: z.string().datetime().optional(),
})

/**
 * POST /api/marketplace/admin/fee-rules
 *
 * Finance admin creates a new fee rule version.
 * New rules only affect checkouts created AFTER their effective_from date.
 * Existing orders' applied_fee_snapshot is immutable.
 */
export async function POST(request: NextRequest) {
  const { admin, error } = await requireMarketplaceAdmin(request)
  if (error) return error

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return jsonError({ status: 400, code: "invalid_json", message: "Could not parse request body", retryable: false })
  }

  const parsed = createRuleSchema.safeParse(body)
  if (!parsed.success) {
    return jsonError({ status: 400, code: "invalid_request", message: "Invalid fee rule payload", retryable: false, issues: parsed.error.issues })
  }
  const d = parsed.data
  const svc = createServiceRoleClient()

  // Get current max version for this scope
  const { data: existing } = await svc
    .from("marketplace_fee_rules")
    .select("version")
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle()

  const nextVersion = ((existing as any)?.version ?? 0) + 1

  const { data: rule, error: insertError } = await svc
    .from("marketplace_fee_rules")
    .insert({
      description: d.description,
      percentage_fee: d.percentageFee,
      fixed_fee_cents: d.fixedFeeCents ?? 0,
      minimum_fee_cents: d.minimumFeeCents ?? null,
      maximum_fee_cents: d.maximumFeeCents ?? null,
      scope: d.scope ?? "all",
      listing_kind_scope: d.listingKindScope ?? null,
      effective_from: d.effectiveFrom,
      effective_until: d.effectiveUntil ?? null,
      is_active: true,
      version: nextVersion,
      created_by: admin!.id,
    })
    .select("id, version, percentage_fee, description, effective_from, effective_until, is_active")
    .single()

  if (insertError || !rule) {
    console.error("Failed to create fee rule", insertError)
    return jsonError({ status: 500, code: "create_failed", message: "Failed to create fee rule.", retryable: true })
  }

  return NextResponse.json({ data: rule }, { status: 201 })
}

/**
 * GET /api/marketplace/admin/fee-rules
 * List all fee rules (admin view — includes inactive).
 */
export async function GET(request: NextRequest) {
  const { error } = await requireMarketplaceAdmin(request)
  if (error) return error

  const svc = createServiceRoleClient()
  const { data: rules, error: fetchError } = await svc
    .from("marketplace_fee_rules")
    .select("id, version, description, percentage_fee, fixed_fee_cents, scope, listing_kind_scope, effective_from, effective_until, is_active, created_at")
    .order("version", { ascending: false })

  if (fetchError) {
    return jsonError({ status: 500, code: "fetch_failed", message: "Failed to load fee rules.", retryable: true })
  }

  return NextResponse.json({ data: rules ?? [] })
}

/**
 * PATCH /api/marketplace/admin/fee-rules
 * Deactivate a specific fee rule (body: { id, isActive: false }).
 * Never deletes; only toggles is_active.
 */
export async function PATCH(request: NextRequest) {
  const { admin, error } = await requireMarketplaceAdmin(request)
  if (error) return error

  const { id, isActive } = await request.json()
  if (!id || typeof isActive !== "boolean") {
    return jsonError({ status: 400, code: "invalid_request", message: "id and isActive are required.", retryable: false })
  }

  const svc = createServiceRoleClient()
  const { error: updateError } = await svc
    .from("marketplace_fee_rules")
    .update({ is_active: isActive })
    .eq("id", id)

  if (updateError) {
    return jsonError({ status: 500, code: "update_failed", message: "Failed to update fee rule.", retryable: true })
  }

  return NextResponse.json({ data: { id, isActive } })
}
