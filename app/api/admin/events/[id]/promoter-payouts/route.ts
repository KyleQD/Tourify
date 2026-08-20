import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { assertOrgEntityReferences } from '@/lib/admin/org-entity-access'
import { logAuditEvent } from '@/lib/audit'
import { withAdminCapability } from '@/lib/auth/api-auth'
import { resolveEventPromoterFlags } from '@/lib/promoter-network/feature-flags'
import {
  createEventPromoterPayoutBatch,
  getEventPromoterPayoutAudit,
  PromoterPayoutAdapterError,
  setEventPromoterCommissionHold,
  transitionEventPromoterPayoutBatch,
} from '@/lib/promoter-network/payout-adapter'
import { recordPromoterOperationalEvent, type PromoterOperationalEventType } from '@/lib/promoter-network/observability'

const eventIdSchema = z.string().uuid()
const commandSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('allocate'),
    currency: z.string().trim().length(3).default('usd'),
    idempotency_key: z.string().trim().min(8).max(200),
  }),
  z.object({
    action: z.enum(['submit', 'confirm', 'fail', 'retry', 'cancel']),
    payout_batch_id: z.string().uuid(),
    settlement_reference: z.string().trim().min(1).max(200).optional(),
    provider_reference: z.string().trim().min(1).max(200).optional(),
    reason: z.string().trim().min(3).max(1_000).optional(),
  }),
  z.object({
    action: z.enum(['hold', 'release']),
    commission_ledger_id: z.string().uuid(),
    reason: z.string().trim().min(3).max(1_000),
  }),
])

function eventIdFromRequest(request: NextRequest) {
  const parts = new URL(request.url).pathname.split('/').filter(Boolean)
  return eventIdSchema.parse(parts[parts.lastIndexOf('events') + 1])
}

function can(capabilities: readonly string[], capability: string) {
  return capabilities.includes(capability)
}

function requirePayoutCapability(capabilities: readonly string[], action: string) {
  const required = action === 'allocate' || action === 'hold' || action === 'release'
    ? 'finance.manage'
    : 'finance.pay'
  return can(capabilities, required) ? null : NextResponse.json({
    error: `The ${required} capability is required for this promoter payout action.`,
    code: 'capability_denied',
  }, { status: 403 })
}

export const GET = withAdminCapability('finance.view', async (request, { supabase, admin }) => {
  try {
    const eventId = eventIdFromRequest(request)
    await assertOrgEntityReferences(supabase, admin.orgId, { eventId })
    const flags = await resolveEventPromoterFlags(supabase)
    if (!flags.event_promoter_payouts_enabled)
      return NextResponse.json({ error: 'Promoter payouts are not enabled.' }, { status: 404 })

    const data = await getEventPromoterPayoutAudit({ orgId: admin.orgId, eventId })
    return NextResponse.json({ data })
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'A valid event id is required.' }, { status: 400 })
    if (error instanceof PromoterPayoutAdapterError)
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status })
    console.error('[event promoter payouts] audit unavailable', error)
    return NextResponse.json({ error: 'Promoter payout audit is temporarily unavailable.' }, { status: 503 })
  }
})

export const POST = withAdminCapability('finance.view', async (request, { supabase, user, admin }) => {
  try {
    const eventId = eventIdFromRequest(request)
    const command = commandSchema.parse(await request.json())
    const denied = requirePayoutCapability(admin.capabilities, command.action)
    if (denied) return denied
    await assertOrgEntityReferences(supabase, admin.orgId, { eventId })

    const flags = await resolveEventPromoterFlags(supabase)
    if (!flags.event_promoter_payouts_enabled)
      return NextResponse.json({ error: 'Promoter payouts are not enabled.' }, { status: 404 })

    let data: Record<string, unknown>
    if (command.action === 'allocate') {
      data = await createEventPromoterPayoutBatch({
        orgId: admin.orgId,
        eventId,
        actorId: user.id,
        currency: command.currency.toLowerCase(),
        idempotencyKey: command.idempotency_key,
      })
    } else if (command.action === 'hold' || command.action === 'release') {
      data = await setEventPromoterCommissionHold({
        orgId: admin.orgId,
        eventId,
        commissionLedgerId: command.commission_ledger_id,
        actorId: user.id,
        action: command.action,
        reason: command.reason,
      })
    } else {
      data = await transitionEventPromoterPayoutBatch({
        orgId: admin.orgId,
        eventId,
        payoutBatchId: command.payout_batch_id,
        actorId: user.id,
        action: command.action,
        settlementReference: command.settlement_reference,
        providerReference: command.provider_reference,
        reason: command.reason,
      })
    }

    await logAuditEvent({
      actorId: user.id,
      orgId: admin.orgId,
      action: command.action === 'confirm' ? 'settle' : 'update',
      entityType: 'settlement',
      entityId: String(data.batch_id || data.commission_ledger_id || eventId),
      newValues: {
        promoter_payout_action: command.action,
        event_id: eventId,
        ...data,
      },
      correlationId: admin.correlationId,
    })
    const eventType: PromoterOperationalEventType = command.action === 'allocate'
      ? 'payout_allocated'
      : command.action === 'submit'
        ? 'payout_submitted'
        : command.action === 'confirm'
          ? 'payout_paid'
          : command.action === 'fail'
            ? 'payout_failed'
            : command.action === 'retry'
              ? 'payout_retried'
              : command.action === 'cancel'
                ? 'payout_cancelled'
                : 'commission_hold_updated'
    void recordPromoterOperationalEvent({
      orgId: admin.orgId,
      eventId,
      eventType,
      outcome: 'success',
      correlationId: admin.correlationId,
      metadata: { surface: 'payout_admin', action: command.action },
    })

    return NextResponse.json({ success: true, data })
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Invalid promoter payout command.', details: error.issues }, { status: 400 })
    if (error instanceof PromoterPayoutAdapterError)
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status })
    console.error('[event promoter payouts] command failed', error)
    return NextResponse.json({ error: 'Promoter payout action could not be completed.' }, { status: 503 })
  }
})
