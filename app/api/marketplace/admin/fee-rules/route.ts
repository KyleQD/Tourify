import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { resolveCommerceContext } from "@/lib/admin/commerce/resolve-context"
import {
  normalizeCommerceFinancialActionReason,
  requireCommerceHighRiskAction,
} from "@/lib/admin/commerce/high-risk-actions"
import { requireCommerceIdempotencyKey } from "@/lib/admin/commerce/idempotency"
import {
  assertCommerceUpdatedAtMatches,
  commerceVersionConflictResponse,
  requireCommerceExpectedUpdatedAt,
} from "@/lib/admin/commerce/concurrency"
import { commerceErrorResponse, commerceJsonResponse } from "@/lib/admin/commerce/errors"

export const dynamic = "force-dynamic"

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
  reason: z.string().trim().min(3).max(1_000),
  idempotencyKey: z.string().trim().min(8).max(200).optional(),
  idempotency_key: z.string().trim().min(8).max(200).optional(),
})

const updateRuleSchema = z.object({
  id: z.string().min(1),
  isActive: z.boolean(),
  reason: z.string().trim().min(3).max(1_000),
  idempotencyKey: z.string().trim().min(8).max(200).optional(),
  idempotency_key: z.string().trim().min(8).max(200).optional(),
  expectedUpdatedAt: z.string().datetime().optional(),
  expected_updated_at: z.string().datetime().optional(),
}).strict()

/**
 * POST /api/marketplace/admin/fee-rules
 *
 * Finance admin creates a new fee rule version.
 * New rules only affect checkouts created AFTER their effective_from date.
 * Existing orders' applied_fee_snapshot is immutable.
 */
export async function POST(request: NextRequest) {
  const commerce = await resolveCommerceContext(request, {
    requiredPermission: "commerce.manage_fees",
  })
  if (commerce instanceof NextResponse) return commerce

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return commerceErrorResponse({
      status: 400,
      code: "invalid_json",
      message: "Could not parse request body.",
      correlationId: commerce.request.correlationId,
    })
  }

  const parsed = createRuleSchema.safeParse(body)
  if (!parsed.success) {
    return commerceErrorResponse({
      status: 400,
      code: "invalid_request",
      message: "Invalid fee rule payload.",
      issues: parsed.error.issues,
      correlationId: commerce.request.correlationId,
    })
  }
  const denied = requireCommerceHighRiskAction(commerce, "fee_rule.write", {
    reason: parsed.success ? parsed.data.reason : undefined,
  })
  if (denied) return denied
  const idempotency = requireCommerceIdempotencyKey(request, commerce, parsed.data)
  if (idempotency instanceof NextResponse) return idempotency
  const d = parsed.data
  normalizeCommerceFinancialActionReason(d.reason)
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
      created_by: commerce.actor.userId,
    })
    .select("id, version, percentage_fee, description, effective_from, effective_until, is_active")
    .single()

  if (insertError || !rule) {
    console.error("Failed to create fee rule", insertError)
    return commerceErrorResponse({
      status: 500,
      code: "create_failed",
      message: "Failed to create fee rule.",
      retryable: true,
      correlationId: commerce.request.correlationId,
    })
  }

  return commerceJsonResponse({ data: rule, idempotencyKey: idempotency.idempotencyKey }, {
    status: 201,
    correlationId: commerce.request.correlationId,
  })
}

/**
 * GET /api/marketplace/admin/fee-rules
 * List all fee rules (admin view — includes inactive).
 */
export async function GET(request: NextRequest) {
  const commerce = await resolveCommerceContext(request, {
    requiredPermission: "commerce.manage_fees",
  })
  if (commerce instanceof NextResponse) return commerce

  const svc = createServiceRoleClient()
  const { data: rules, error: fetchError } = await svc
    .from("marketplace_fee_rules")
    .select("id, version, description, percentage_fee, fixed_fee_cents, scope, listing_kind_scope, effective_from, effective_until, is_active, created_at")
    .order("version", { ascending: false })

  if (fetchError) {
    return commerceErrorResponse({
      status: 500,
      code: "fetch_failed",
      message: "Failed to load fee rules.",
      retryable: true,
      correlationId: commerce.request.correlationId,
    })
  }

  return commerceJsonResponse({ data: rules ?? [] }, {
    correlationId: commerce.request.correlationId,
  })
}

/**
 * PATCH /api/marketplace/admin/fee-rules
 * Deactivate a specific fee rule (body: { id, isActive: false }).
 * Never deletes; only toggles is_active.
 */
export async function PATCH(request: NextRequest) {
  const commerce = await resolveCommerceContext(request, {
    requiredPermission: "commerce.manage_fees",
  })
  if (commerce instanceof NextResponse) return commerce

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return commerceErrorResponse({
      status: 400,
      code: "invalid_json",
      message: "Could not parse request body.",
      correlationId: commerce.request.correlationId,
    })
  }

  const parsed = updateRuleSchema.safeParse(body)
  const denied = requireCommerceHighRiskAction(commerce, "fee_rule.write", {
    reason: parsed.success ? parsed.data.reason : undefined,
  })
  if (denied) return denied
  if (!parsed.success) {
    return commerceErrorResponse({
      status: 400,
      code: "invalid_request",
      message: "Invalid fee rule update payload.",
      issues: parsed.error.issues,
      correlationId: commerce.request.correlationId,
    })
  }
  const { id, isActive, reason } = parsed.data
  const idempotency = requireCommerceIdempotencyKey(request, commerce, parsed.data)
  if (idempotency instanceof NextResponse) return idempotency
  const precondition = requireCommerceExpectedUpdatedAt(commerce, parsed.data)
  if (precondition instanceof NextResponse) return precondition
  const actionReason = normalizeCommerceFinancialActionReason(reason).reason

  const svc = createServiceRoleClient()
  const { data: currentRule, error: currentRuleError } = await svc
    .from("marketplace_fee_rules")
    .select("id, updated_at")
    .eq("id", id)
    .maybeSingle()

  if (currentRuleError) {
    return commerceErrorResponse({
      status: 503,
      code: "fee_rule_unavailable",
      message: "Unable to load fee rule.",
      retryable: true,
      correlationId: commerce.request.correlationId,
    })
  }
  if (!currentRule) {
    return commerceErrorResponse({
      status: 404,
      code: "fee_rule_not_found",
      message: "Fee rule not found.",
      correlationId: commerce.request.correlationId,
    })
  }
  const stale = assertCommerceUpdatedAtMatches(
    commerce,
    currentRule.updated_at,
    precondition,
    {
      entityType: "marketplace_fee_rules",
      message: "Fee rule changed while update was being prepared.",
    },
  )
  if (stale) return stale

  const { data: updatedRule, error: updateError } = await svc
    .from("marketplace_fee_rules")
    .update({ is_active: isActive })
    .eq("id", id)
    .eq("updated_at", precondition.expectedUpdatedAt)
    .select("updated_at")
    .maybeSingle()

  if (updateError || !updatedRule) {
    if (!updateError) return commerceVersionConflictResponse(commerce, {
      entityType: "marketplace_fee_rules",
      message: "Fee rule changed while update was being saved.",
      expectedUpdatedAt: precondition.expectedUpdatedAt,
      currentUpdatedAt: currentRule.updated_at,
    })
    return commerceErrorResponse({
      status: 500,
      code: "update_failed",
      message: "Failed to update fee rule.",
      retryable: true,
      correlationId: commerce.request.correlationId,
    })
  }

  return commerceJsonResponse({
    data: { id, isActive, reason: actionReason, updatedAt: updatedRule.updated_at ?? null },
    idempotencyKey: idempotency.idempotencyKey,
  }, {
    correlationId: commerce.request.correlationId,
  })
}
