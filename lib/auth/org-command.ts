/**
 * SEC-103 — Canonical Admin org command wrappers.
 *
 * New Admin endpoints should prefer `withOrgCommand` / `executeOrgCommand`
 * so context, capability, schema validation, entity ownership, correlation ID,
 * and typed errors are enforced in one place.
 */

import { NextResponse } from 'next/server'
import type { ZodTypeAny, z } from 'zod'
import {
  requireAdminCapability,
  type ActingAdminContext,
  type AuthenticatedAdminRequest,
} from '@/lib/auth/admin-context'
import type { AdminCapability } from '@/lib/auth/admin-capabilities'
import { writeSecurityAuditEvent } from '@/lib/security/write-security-audit-event'

export type AdminErrorCode =
  | 'unauthenticated'
  | 'capability_denied'
  | 'entity_not_found'
  | 'acting_context_required'
  | 'acting_context_mismatch'
  | 'invalid_acting_context'
  | 'version_conflict'
  | 'business_rule_failed'
  | 'validation_failed'
  | 'idempotency_conflict'
  | 'dependency_unavailable'

export interface AdminCommandErrorBody {
  error: string
  code: AdminErrorCode | string
  correlationId?: string
  details?: unknown
}

export function adminErrorResponse(
  status: number,
  code: AdminErrorCode | string,
  message: string,
  correlationId?: string,
  details?: unknown,
): NextResponse {
  const body: AdminCommandErrorBody = { error: message, code }
  if (correlationId) body.correlationId = correlationId
  if (details !== undefined) body.details = details
  const response = NextResponse.json(body, { status })
  if (correlationId) response.headers.set('x-correlation-id', correlationId)
  return response
}

export function withCorrelationHeaders(
  response: NextResponse,
  correlationId: string,
): NextResponse {
  response.headers.set('x-correlation-id', correlationId)
  return response
}

export type AdminEntityType = 'tour' | 'event'
export type AdminCommandTarget<TInput = unknown> =
  | { kind: 'organization' }
  | {
      kind: 'entity'
      type: AdminEntityType
      id: string | readonly string[] | ((parsed: TInput) => string | readonly string[])
    }

/**
 * Assert the target entity belongs to the acting organization.
 * Returns 404 without leaking cross-org existence.
 */
export async function requireEntityAccess(
  auth: AuthenticatedAdminRequest,
  context: ActingAdminContext,
  entityType: AdminEntityType,
  entityId: string,
  capability?: AdminCapability,
): Promise<NextResponse | null> {
  if (capability) {
    const denied = requireAdminCapability(context, capability)
    if (denied) {
      denied.headers.set('x-correlation-id', context.correlationId)
      return denied
    }
  }

  if (!entityId?.trim()) {
    return adminErrorResponse(
      422,
      'business_rule_failed',
      'A target entity id is required.',
      context.correlationId,
    )
  }

  if (context.scope === 'tour_collaborator') {
    const allowedTourIds = context.allowedTourIds || []
    if (entityType === 'tour') {
      return allowedTourIds.includes(entityId)
        ? null
        : adminErrorResponse(
            404,
            'entity_not_found',
            'The requested record was not found.',
            context.correlationId,
          )
    }

    if (allowedTourIds.length === 0) {
      return adminErrorResponse(
        404,
        'entity_not_found',
        'The requested record was not found.',
        context.correlationId,
      )
    }

    const { data: assignment, error: assignmentError } = await auth.supabase
      .from('tour_events')
      .select('event_id')
      .eq('event_id', entityId)
      .in('tour_id', allowedTourIds)
      .limit(1)
      .maybeSingle()
    if (assignmentError) {
      return adminErrorResponse(
        503,
        'dependency_unavailable',
        'Unable to verify entity access.',
        context.correlationId,
      )
    }
    return assignment?.event_id
      ? null
      : adminErrorResponse(
          404,
          'entity_not_found',
          'The requested record was not found.',
          context.correlationId,
        )
  }

  const table = entityType === 'tour' ? 'tours' : 'events_v2'
  const { data, error } = await auth.supabase
    .from(table)
    .select('id, org_id')
    .eq('id', entityId)
    .eq('org_id', context.orgId)
    .maybeSingle()

  if (error) {
    return adminErrorResponse(
      503,
      'dependency_unavailable',
      'Unable to verify entity access.',
      context.correlationId,
    )
  }

  if (!data?.id) {
    return adminErrorResponse(
      404,
      'entity_not_found',
      'The requested record was not found.',
      context.correlationId,
    )
  }

  return null
}

export interface ExecuteOrgCommandOptions<TSchema extends ZodTypeAny> {
  context: ActingAdminContext
  auth: AuthenticatedAdminRequest
  schema: TSchema
  input: unknown
  capability?: AdminCapability
  target?: AdminCommandTarget<z.infer<TSchema>>
  /** @deprecated Migrate callers to the explicit target contract. */
  entity?: { type: AdminEntityType; id: string | ((parsed: z.infer<TSchema>) => string) }
  /** When set, duplicate keys with different payloads return 409 idempotency_conflict. */
  idempotencyKey?: string | null
  commandName?: string
  handler: (args: {
    context: ActingAdminContext
    auth: AuthenticatedAdminRequest
    input: z.infer<TSchema>
    idempotencyKey?: string | null
  }) => Promise<NextResponse> | NextResponse
}

/** In-memory idempotency for a single process (tests / short-lived). Durable store lands with SEC-111. */
const idempotencyMemory = new Map<string, { hash: string; status: number; body: unknown }>()

function hashPayload(value: unknown): string {
  return JSON.stringify(value)
}

export async function executeOrgCommand<TSchema extends ZodTypeAny>(
  options: ExecuteOrgCommandOptions<TSchema>,
): Promise<NextResponse> {
  const { context, auth, schema, input, capability, entity, idempotencyKey, commandName, handler } =
    options
  const target: AdminCommandTarget<z.infer<TSchema>> | undefined =
    options.target || (entity ? { kind: 'entity', ...entity } : undefined)

  if (capability) {
    const denied = requireAdminCapability(context, capability)
    if (denied) {
      denied.headers.set('x-correlation-id', context.correlationId)
      await writeSecurityAuditEvent({
        actorUserId: context.userId,
        actingOrgId: context.orgId,
        actingProfileId: context.profileId,
        action: `${commandName || 'command'}.capability_denied`,
        actionClass: 'authz_decision',
        result: 'denied',
        reason: capability,
        correlationId: context.correlationId,
        moduleId: commandName || 'executeOrgCommand',
      }).catch(() => undefined)
      return denied
    }
  }

  const parsed = schema.safeParse(input)
  if (!parsed.success) {
    return adminErrorResponse(
      422,
      'validation_failed',
      'Request validation failed.',
      context.correlationId,
      parsed.error.flatten(),
    )
  }

  let resolvedEntityIds: string[] = []
  if (target?.kind === 'organization') {
    if (context.scope === 'tour_collaborator') {
      return adminErrorResponse(
        403,
        'tour_scope_required',
        'This administrator account is limited to an assigned tour.',
        context.correlationId,
      )
    }
    const candidate = parsed.data as Record<string, unknown>
    const suppliedOrgId = candidate.org_id ?? candidate.orgId
    if (suppliedOrgId !== undefined && suppliedOrgId !== context.orgId) {
      return adminErrorResponse(
        403,
        'acting_context_mismatch',
        'The requested organization does not match the acting context.',
        context.correlationId,
      )
    }
  }
  if (target?.kind === 'entity') {
    const resolved = typeof target.id === 'function' ? target.id(parsed.data) : target.id
    resolvedEntityIds = (Array.isArray(resolved) ? resolved : [resolved])
      .map((value) => String(value).trim())
      .filter(Boolean)
    if (resolvedEntityIds.length === 0) {
      return adminErrorResponse(422, 'business_rule_failed', 'A target entity id is required.', context.correlationId)
    }
    for (const resolvedEntityId of [...new Set(resolvedEntityIds)]) {
      const accessDenied = await requireEntityAccess(
        auth,
        context,
        target.type,
        resolvedEntityId,
      )
      if (!accessDenied) continue
      await writeSecurityAuditEvent({
        actorUserId: context.userId,
        actingOrgId: context.orgId,
        actingProfileId: context.profileId,
        action: `${commandName || 'command'}.entity_denied`,
        actionClass: 'authz_decision',
        targetType: target.type,
        targetId: resolvedEntityId,
        result: 'denied',
        correlationId: context.correlationId,
        moduleId: commandName || 'executeOrgCommand',
      }).catch(() => undefined)
      return accessDenied
    }
  }
  const auditTargetType = target?.kind === 'entity' ? target.type : 'organization'
  const auditTargetId = target?.kind === 'entity' ? resolvedEntityIds[0] : context.orgId

  async function runWithMutationAudit(
    response: NextResponse,
  ): Promise<NextResponse> {
    // The fail-closed intent was persisted before the handler. Outcome logging
    // is best-effort because the handler may already have committed; critical
    // domain commands additionally write outcome + mutation in one DB RPC.
    await writeSecurityAuditEvent({
      actorUserId: context.userId,
      actingOrgId: context.orgId,
      actingProfileId: context.profileId,
      action: commandName || 'org.command',
      actionClass: 'mutation',
      targetType: auditTargetType,
      targetId: auditTargetId,
      result: response.status < 400 ? 'success' : response.status === 403 ? 'denied' : 'error',
      correlationId: context.correlationId,
      moduleId: commandName || 'executeOrgCommand',
      metadata: { status: response.status },
      forceFailOpen: true,
    }).catch(() => undefined)
    return withCorrelationHeaders(response, context.correlationId)
  }

  async function requireMutationAuditIntent(): Promise<NextResponse | null> {
    try {
      await writeSecurityAuditEvent({
        actorUserId: context.userId,
        actingOrgId: context.orgId,
        actingProfileId: context.profileId,
        action: `${commandName || 'org.command'}.authorized_intent`,
        actionClass: 'mutation',
        targetType: auditTargetType,
        targetId: auditTargetId,
        result: 'success',
        reason: 'Authorized mutation intent; command outcome pending.',
        correlationId: context.correlationId,
        moduleId: commandName || 'executeOrgCommand',
        metadata: { phase: 'preflight' },
      })
      return null
    } catch {
      return adminErrorResponse(
        503,
        'dependency_unavailable',
        'Security audit is unavailable; no changes were made.',
        context.correlationId,
      )
    }
  }

  if (idempotencyKey) {
    const memoryKey = `${context.orgId}:${context.userId}:${commandName || 'command'}:${idempotencyKey}`
    const payloadHash = hashPayload(parsed.data)
    const prior = idempotencyMemory.get(memoryKey)
    if (prior) {
      if (prior.hash !== payloadHash) {
        return adminErrorResponse(
          409,
          'idempotency_conflict',
          'Idempotency key was reused with a different payload.',
          context.correlationId,
        )
      }
      return withCorrelationHeaders(
        NextResponse.json(prior.body, { status: prior.status }),
        context.correlationId,
      )
    }

    const auditUnavailable = await requireMutationAuditIntent()
    if (auditUnavailable) return auditUnavailable

    const response = await handler({
      context,
      auth,
      input: parsed.data,
      idempotencyKey,
    })
    const cloned = response.clone()
    const body = await cloned.json().catch(() => ({}))
    if (response.status < 500) {
      idempotencyMemory.set(memoryKey, {
        hash: payloadHash,
        status: response.status,
        body,
      })
    }
    return runWithMutationAudit(response)
  }

  const auditUnavailable = await requireMutationAuditIntent()
  if (auditUnavailable) return auditUnavailable

  const response = await handler({
    context,
    auth,
    input: parsed.data,
    idempotencyKey,
  })
  return runWithMutationAudit(response)
}

/** Test helper — clear process-local idempotency map. */
export function clearOrgCommandIdempotencyForTests() {
  idempotencyMemory.clear()
}
