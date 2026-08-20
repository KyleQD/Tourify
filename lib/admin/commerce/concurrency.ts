import type { CommerceContext } from "@/lib/admin/commerce/context"
import { commerceErrorResponse } from "@/lib/admin/commerce/errors"

export interface CommerceExpectedUpdatedAtBody {
  expectedUpdatedAt?: unknown
  expected_updated_at?: unknown
}

export interface CommerceUpdatedAtPrecondition {
  expectedUpdatedAt: string
}

export function normalizeCommerceExpectedUpdatedAt(value: unknown): string {
  if (typeof value !== "string") throw new Error("commerce_expected_updated_at_required")
  const expectedUpdatedAt = value.trim()
  if (!expectedUpdatedAt) throw new Error("commerce_expected_updated_at_required")
  if (!Number.isFinite(Date.parse(expectedUpdatedAt))) {
    throw new Error("commerce_expected_updated_at_invalid")
  }
  return expectedUpdatedAt
}

export function readCommerceExpectedUpdatedAt(
  body?: CommerceExpectedUpdatedAtBody | null,
): CommerceUpdatedAtPrecondition | null {
  const value = body?.expectedUpdatedAt ?? body?.expected_updated_at
  if (value == null) return null
  return { expectedUpdatedAt: normalizeCommerceExpectedUpdatedAt(value) }
}

export function requireCommerceExpectedUpdatedAt(
  context: Pick<CommerceContext, "request">,
  body?: CommerceExpectedUpdatedAtBody | null,
): CommerceUpdatedAtPrecondition | ReturnType<typeof commerceErrorResponse> {
  try {
    const precondition = readCommerceExpectedUpdatedAt(body)
    if (precondition) return precondition
    throw new Error("commerce_expected_updated_at_required")
  } catch (error) {
    const code = error instanceof Error ? error.message : "commerce_expected_updated_at_required"
    return commerceErrorResponse({
      status: code === "commerce_expected_updated_at_required" ? 428 : 400,
      code,
      message: code === "commerce_expected_updated_at_invalid"
        ? "Expected updated_at value is invalid."
        : "Expected updated_at value is required.",
      correlationId: context.request.correlationId,
      details: {
        bodyFields: ["expectedUpdatedAt", "expected_updated_at"],
      },
    })
  }
}

export function commerceVersionConflictResponse(
  context: Pick<CommerceContext, "request">,
  options: {
    message: string
    expectedUpdatedAt?: string | null
    currentUpdatedAt?: string | null
    entityType?: string
  },
): ReturnType<typeof commerceErrorResponse> {
  return commerceErrorResponse({
    status: 409,
    code: "commerce_version_conflict",
    message: options.message,
    correlationId: context.request.correlationId,
    details: {
      entityType: options.entityType ?? null,
      expectedUpdatedAt: options.expectedUpdatedAt ?? null,
      currentUpdatedAt: options.currentUpdatedAt ?? null,
    },
  })
}

export function assertCommerceUpdatedAtMatches(
  context: Pick<CommerceContext, "request">,
  currentUpdatedAt: unknown,
  precondition: CommerceUpdatedAtPrecondition,
  options: {
    message: string
    entityType?: string
  },
): ReturnType<typeof commerceErrorResponse> | null {
  const current = typeof currentUpdatedAt === "string" ? currentUpdatedAt : null
  if (current && current === precondition.expectedUpdatedAt) return null
  return commerceVersionConflictResponse(context, {
    message: options.message,
    entityType: options.entityType,
    expectedUpdatedAt: precondition.expectedUpdatedAt,
    currentUpdatedAt: current,
  })
}
