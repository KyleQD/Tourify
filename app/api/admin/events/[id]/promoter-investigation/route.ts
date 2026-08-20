import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { assertOrgEntityReferences } from '@/lib/admin/org-entity-access'
import { logAuditEvent } from '@/lib/audit'
import { withAdminCapability } from '@/lib/auth/api-auth'
import { resolveEventPromoterFlags } from '@/lib/promoter-network/feature-flags'
import {
  createEventPromoterRiskFlag,
  getEventPromoterInvestigation,
  PromoterInvestigationError,
  transitionEventPromoterRiskFlag,
} from '@/lib/promoter-network/investigation'
import { recordPromoterOperationalEvent } from '@/lib/promoter-network/observability'

const id = z.string().uuid()
const requestSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('create'),
    program_id: id,
    membership_id: id.optional(),
    attribution_id: id.optional(),
    user_id: id.optional(),
    risk_type: z.string().trim().min(3).max(120),
    severity: z.enum(['low', 'medium', 'high', 'critical']),
    reason: z.string().trim().min(3).max(1_000),
  }),
  z.object({
    action: z.enum(['reviewing', 'resolved', 'dismissed', 'severity_changed']),
    risk_flag_id: id,
    severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
    reason: z.string().trim().min(3).max(1_000),
  }),
])

function eventIdFromRequest(request: NextRequest) {
  const parts = new URL(request.url).pathname.split('/').filter(Boolean)
  return id.parse(parts[parts.lastIndexOf('events') + 1])
}

function csvCell(value: unknown) {
  const text = String(value ?? '')
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

export const GET = withAdminCapability('finance.view', async (request, { supabase, admin }) => {
  const startedAt = Date.now()
  let eventId: string | null = null
  let outcome: 'success' | 'failed' = 'failed'
  try {
    eventId = eventIdFromRequest(request)
    await assertOrgEntityReferences(supabase, admin.orgId, { eventId })
    const flags = await resolveEventPromoterFlags(supabase)
    if (!flags.event_promoter_program_enabled)
      return NextResponse.json({ error: 'Promoter programs are not enabled.' }, { status: 404 })

    const url = new URL(request.url)
    const membershipId = url.searchParams.get('membership_id')
    const limit = z.coerce.number().int().min(1).max(200).default(100).parse(url.searchParams.get('limit') || undefined)
    if (membershipId) id.parse(membershipId)
    const data = await getEventPromoterInvestigation({ orgId: admin.orgId, eventId, membershipId, limit })

    if (url.searchParams.get('format') === 'csv') {
      const lines = [
        ['ledger_id', 'membership_id', 'entry_type', 'amount_minor', 'currency', 'originating_entry_id', 'payout_status', 'source_type', 'occurred_at'],
        ...data.ledgerEntries.map((entry: any) => [
          entry.id, entry.membership_id, entry.entry_type, entry.amount_minor, entry.currency,
          entry.originating_entry_id,
          Array.isArray(entry.promoter_payout_allocations) ? entry.promoter_payout_allocations[0]?.status : entry.promoter_payout_allocations?.status,
          Array.isArray(entry.ticket_sale_attributions) ? entry.ticket_sale_attributions[0]?.source_type : entry.ticket_sale_attributions?.source_type,
          entry.occurred_at,
        ]),
      ].map((row) => row.map(csvCell).join(',')).join('\n')
      outcome = 'success'
      return new NextResponse(lines, {
        headers: {
          'content-type': 'text/csv; charset=utf-8',
          'content-disposition': `attachment; filename="event-${eventId}-promoter-reconciliation.csv"`,
          'cache-control': 'no-store',
        },
      })
    }
    outcome = 'success'
    return NextResponse.json({ data })
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Invalid investigation request.' }, { status: 400 })
    if (error instanceof PromoterInvestigationError)
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status })
    console.error('[event-promoter] investigation unavailable', error)
    return NextResponse.json({ error: 'Promoter investigation is temporarily unavailable.' }, { status: 503 })
  } finally {
    if (eventId) void recordPromoterOperationalEvent({
      orgId: admin.orgId,
      eventId,
      eventType: 'investigation_read',
      outcome,
      durationMs: Date.now() - startedAt,
      correlationId: admin.correlationId,
      metadata: { surface: 'investigation_read' },
    })
  }
})

export const POST = withAdminCapability('finance.manage', async (request, { supabase, user, admin }) => {
  try {
    const eventId = eventIdFromRequest(request)
    const input = requestSchema.parse(await request.json())
    await assertOrgEntityReferences(supabase, admin.orgId, { eventId })
    const flags = await resolveEventPromoterFlags(supabase)
    if (!flags.event_promoter_program_enabled)
      return NextResponse.json({ error: 'Promoter programs are not enabled.' }, { status: 404 })

    const data = input.action === 'create'
      ? await createEventPromoterRiskFlag({
        orgId: admin.orgId, eventId, actorId: user.id, programId: input.program_id,
        membershipId: input.membership_id, attributionId: input.attribution_id, userId: input.user_id,
        riskType: input.risk_type, severity: input.severity, reason: input.reason,
      })
      : await transitionEventPromoterRiskFlag({
        orgId: admin.orgId, eventId, actorId: user.id, riskFlagId: input.risk_flag_id,
        action: input.action, severity: input.severity, reason: input.reason,
      })

    await logAuditEvent({
      actorId: user.id,
      orgId: admin.orgId,
      action: 'flag',
      entityType: 'settlement',
      entityId: String((data as any).riskFlagId || (data as any).risk_flag_id),
      newValues: { event_id: eventId, promoter_risk_action: input.action, ...data },
      correlationId: admin.correlationId,
    })
    void recordPromoterOperationalEvent({
      orgId: admin.orgId,
      eventId,
      eventType: 'risk_flag_updated',
      outcome: 'success',
      correlationId: admin.correlationId,
      metadata: { surface: 'risk_flag_mutation', action: input.action },
    })
    return NextResponse.json({ success: true, data })
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Invalid risk flag command.', details: error.issues }, { status: 400 })
    if (error instanceof PromoterInvestigationError)
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status })
    console.error('[event-promoter] risk flag command failed', error)
    return NextResponse.json({ error: 'Promoter risk flag action could not be completed.' }, { status: 503 })
  }
})
