import type { NextRequest } from "next/server"
import type { CommerceContext } from "@/lib/admin/commerce/context"
import { commerceErrorResponse } from "@/lib/admin/commerce/errors"

export interface CommerceIdempotencyRequirement {
  idempotencyKey: string
  source: "header" | "body"
}

export interface CommerceIdempotencyBody {
  idempotencyKey?: unknown
  idempotency_key?: unknown
}

const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9._:-]+$/
const IDEMPOTENCY_KEY_MIN_LENGTH = 8
const IDEMPOTENCY_KEY_MAX_LENGTH = 200

export function normalizeCommerceIdempotencyKey(value: unknown): string {
  if (typeof value !== "string") throw new Error("commerce_idempotency_key_required")
  const key = value.trim()
  if (key.length < IDEMPOTENCY_KEY_MIN_LENGTH) throw new Error("commerce_idempotency_key_required")
  if (key.length > IDEMPOTENCY_KEY_MAX_LENGTH) throw new Error("commerce_idempotency_key_too_long")
  if (!IDEMPOTENCY_KEY_PATTERN.test(key)) throw new Error("commerce_idempotency_key_invalid")
  return key
}

export function readCommerceIdempotencyKey(
  request: Pick<NextRequest, "headers">,
  body?: CommerceIdempotencyBody | null,
): CommerceIdempotencyRequirement | null {
  const headerValue = request.headers.get("idempotency-key") || request.headers.get("x-idempotency-key")
  if (headerValue != null) {
    return {
      idempotencyKey: normalizeCommerceIdempotencyKey(headerValue),
      source: "header",
    }
  }

  const bodyValue = body?.idempotencyKey ?? body?.idempotency_key
  if (bodyValue != null) {
    return {
      idempotencyKey: normalizeCommerceIdempotencyKey(bodyValue),
      source: "body",
    }
  }

  return null
}

export function requireCommerceIdempotencyKey(
  request: Pick<NextRequest, "headers">,
  context: Pick<CommerceContext, "request">,
  body?: CommerceIdempotencyBody | null,
): CommerceIdempotencyRequirement | ReturnType<typeof commerceErrorResponse> {
  try {
    const idempotency = readCommerceIdempotencyKey(request, body)
    if (idempotency) return idempotency
    throw new Error("commerce_idempotency_key_required")
  } catch (error) {
    const code = error instanceof Error ? error.message : "commerce_idempotency_key_required"
    return commerceErrorResponse({
      status: code === "commerce_idempotency_key_required" ? 422 : 400,
      code,
      message: code === "commerce_idempotency_key_too_long"
        ? "Idempotency key is too long."
        : code === "commerce_idempotency_key_invalid"
          ? "Idempotency key has an invalid format."
          : "Idempotency key is required.",
      correlationId: context.request.correlationId,
      details: {
        headers: ["Idempotency-Key", "X-Idempotency-Key"],
        bodyFields: ["idempotencyKey", "idempotency_key"],
        minLength: IDEMPOTENCY_KEY_MIN_LENGTH,
        maxLength: IDEMPOTENCY_KEY_MAX_LENGTH,
      },
    })
  }
}
