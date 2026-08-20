import { NextResponse } from "next/server"

export interface CommerceErrorEnvelope {
  error: {
    code: string
    message: string
    retryable: boolean
    issues?: unknown
    details?: Record<string, unknown>
  }
  correlationId?: string
}

export interface CommerceErrorOptions {
  status: number
  code: string
  message: string
  retryable?: boolean
  issues?: unknown
  details?: Record<string, unknown>
  correlationId?: string | null
}

export type CommerceResponseBody = Record<string, unknown>

export function commerceJsonResponse<TBody extends CommerceResponseBody>(
  body: TBody,
  options: {
    status?: number
    correlationId?: string | null
  } = {},
): NextResponse<TBody & { correlationId?: string }> {
  const { status = 200, correlationId } = options
  const response = NextResponse.json<TBody & { correlationId?: string }>({
    ...body,
    ...(correlationId ? { correlationId } : {}),
  }, { status })
  if (correlationId) response.headers.set("x-correlation-id", correlationId)
  return response
}

export function commerceErrorResponse({
  status,
  code,
  message,
  retryable = false,
  issues,
  details,
  correlationId,
}: CommerceErrorOptions): NextResponse<CommerceErrorEnvelope> {
  const response = NextResponse.json<CommerceErrorEnvelope>({
    error: {
      code,
      message,
      retryable,
      ...(issues ? { issues } : {}),
      ...(details ? { details } : {}),
    },
    ...(correlationId ? { correlationId } : {}),
  }, { status })
  if (correlationId) response.headers.set("x-correlation-id", correlationId)
  return response
}

export function isCommerceErrorEnvelope(value: unknown): value is CommerceErrorEnvelope {
  if (!value || typeof value !== "object") return false
  const envelope = value as { error?: unknown }
  if (!envelope.error || typeof envelope.error !== "object") return false
  const error = envelope.error as { code?: unknown; message?: unknown; retryable?: unknown }
  return (
    typeof error.code === "string"
    && typeof error.message === "string"
    && typeof error.retryable === "boolean"
  )
}
