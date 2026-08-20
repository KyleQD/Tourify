import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { assertOrgEntityReferences, OrgEntityAccessError } from '@/lib/admin/org-entity-access'
import { withAdminCapability } from '@/lib/auth/api-auth'
import { fromZodError, jsonError, readJson } from '@/lib/api/route-helpers'
import { executeServiceRoleJob, ServiceRoleJobError } from '@/lib/supabase/service-role-job'
import { resolveEventPromoterFlags } from '@/lib/promoter-network/feature-flags'
import { hasTicketingPermission } from '@/lib/ticketing/permissions'
import {
  promoterProgramPatchSchema,
  promoterProgramSettingsSchema,
  type PromoterProgramSettings,
} from '@/lib/promoter-network/program-settings'

const eventParamsSchema = z.object({ id: z.string().uuid() })

function eventParamsFromRequest(request: NextRequest) {
  const segments = new URL(request.url).pathname.split('/').filter(Boolean)
  const eventIndex = segments.lastIndexOf('events')
  return { id: segments[eventIndex + 1] }
}

function unexpectedError(error: unknown) {
  if (error instanceof OrgEntityAccessError) {
    return jsonError({ status: error.status, code: error.code, message: error.message })
  }
  if (error instanceof ServiceRoleJobError) {
    return jsonError({ status: 403, code: error.code, message: error.message })
  }
  console.error('[event-promoter-program] request failed', error)
  return jsonError({ status: 500, code: 'program_unavailable', message: 'The promoter program is temporarily unavailable.', retryable: true })
}

function databaseError(error: { message?: string; code?: string } | null, fallback: string) {
  const message = error?.message || fallback
  if (error?.code === 'P0002') return jsonError({ status: 404, code: 'program_not_found', message })
  if (error?.code === '22023' || error?.code === '23514' || error?.code === '23505') {
    return jsonError({ status: 422, code: 'program_rejected', message })
  }
  return jsonError({ status: 503, code: 'program_write_unavailable', message: fallback, retryable: true })
}

function toSettings(row: any, eligibility: any[]): PromoterProgramSettings {
  return promoterProgramSettingsSchema.parse({
    status: row.status,
    application_mode: row.application_mode,
    commission_type: row.commission_type,
    commission_rate_bps: row.commission_rate_bps,
    commission_fixed_amount_minor: row.commission_fixed_amount_minor,
    currency: row.currency,
    attribution_window_days: row.attribution_window_days,
    starts_at: row.starts_at,
    ends_at: row.ends_at,
    promoter_cap: row.promoter_cap,
    allow_promo_codes: row.allow_promo_codes,
    allow_native_post_attribution: row.allow_native_post_attribution,
    allow_external_links: row.allow_external_links,
    terms_markdown: row.terms_markdown,
    eligible_ticket_types: eligibility.map((item) => ({
      ticket_type_id: item.ticket_type_id,
      commission_type_override: item.commission_type_override,
      commission_rate_bps_override: item.commission_rate_bps_override,
      commission_fixed_amount_minor_override: item.commission_fixed_amount_minor_override,
    })),
  })
}

async function loadProgram(service: any, eventId: string) {
  const [{ data: program, error: programError }, { data: ticketTypes, error: ticketTypesError }] = await Promise.all([
    service
      .from('event_promotion_programs')
      .select('*')
      .eq('event_id', eventId)
      .maybeSingle(),
    service
      .from('ticket_types')
      .select('id, name, price, is_active, category')
      .eq('event_id', eventId)
      .order('priority_order', { ascending: true }),
  ])
  if (programError || ticketTypesError) throw new Error('Unable to load promoter program data.')

  if (!program) return { program: null, ticketTypes: ticketTypes || [], auditEvents: [] }

  const [{ data: eligibility, error: eligibilityError }, { data: versions }, { data: auditEvents }] = await Promise.all([
    service
      .from('event_promotion_ticket_eligibility')
      .select('*')
      .eq('program_id', program.id)
      .is('retired_at', null)
      .order('ticket_type_id'),
    service
      .from('event_promotion_program_versions')
      .select('id, version_number, effective_at, created_at')
      .eq('program_id', program.id)
      .order('version_number', { ascending: false }),
    service
      .from('event_promotion_program_audit_events')
      .select('id, action, actor_user_id, created_at, previous_values, next_values')
      .eq('program_id', program.id)
      .order('created_at', { ascending: false })
      .limit(25),
  ])
  if (eligibilityError) throw new Error('Unable to load promoter program eligibility.')
  const settings = toSettings(program, eligibility || [])
  return {
    program: {
      id: program.id,
      event_id: program.event_id,
      organizer_org_id: program.organizer_org_id,
      created_at: program.created_at,
      updated_at: program.updated_at,
      current_version_number: Number(versions?.[0]?.version_number || 0),
      ...settings,
    },
    ticketTypes: ticketTypes || [],
    auditEvents: auditEvents || [],
  }
}

async function inProgramScope(args: {
  eventId: string
  userId: string
  orgId: string
  supabase: any
  reason: string
  run: (service: any) => Promise<NextResponse>
}) {
  await assertOrgEntityReferences(args.supabase, args.orgId, { eventId: args.eventId })
  const canManage = await hasTicketingPermission({
    supabase: args.supabase,
    userId: args.userId,
    eventId: args.eventId,
    permission: 'manage_ticket_types',
  })
  if (!canManage) {
    return jsonError({ status: 403, code: 'event_permission_denied', message: 'You do not have permission to manage this event promoter program.' })
  }
  return executeServiceRoleJob({
    orgId: args.orgId,
    reason: args.reason,
    moduleId: 'admin.event-promoter.program',
    target: { eventId: args.eventId },
  }, args.run)
}

async function assertProgramEnabled(service: any) {
  const flags = await resolveEventPromoterFlags(service)
  return flags.event_promoter_program_enabled
}

export function organizerProgramGetRoute() {
  return withAdminCapability('ticketing.manage', async (request, { supabase, user, admin }) => {
    try {
      const eventId = eventParamsSchema.parse(eventParamsFromRequest(request)).id
      return await inProgramScope({
        eventId,
        userId: user.id,
        orgId: admin.orgId,
        supabase,
        reason: 'Read event promoter program settings',
        run: async (service) => {
          if (!(await assertProgramEnabled(service))) {
            return jsonError({ status: 404, code: 'feature_disabled', message: 'Promoter programs are not enabled for this organization.' })
          }
          const data = await loadProgram(service, eventId)
          return NextResponse.json({ data, enabled: true })
        },
      })
    } catch (error) {
      const zod = fromZodError(error, 'Invalid event id.')
      return zod || unexpectedError(error)
    }
  })
}

async function writeProgram(args: {
  request: NextRequest
  eventId: string
  supabase: any
  userId: string
  orgId: string
  input: PromoterProgramSettings
  existingProgramId: string | null
}) {
  return inProgramScope({
    eventId: args.eventId,
    userId: args.userId,
    orgId: args.orgId,
    supabase: args.supabase,
    reason: args.existingProgramId ? 'Update event promoter program settings' : 'Create event promoter program settings',
    run: async (service) => {
      if (!(await assertProgramEnabled(service))) {
        return jsonError({ status: 404, code: 'feature_disabled', message: 'Promoter programs are not enabled for this organization.' })
      }
      const { error } = await service.rpc('upsert_event_promoter_program', {
        p_event_id: args.eventId,
        p_actor_id: args.userId,
        p_existing_program_id: args.existingProgramId,
        p_payload: args.input,
      })
      if (error) return databaseError(error, 'Unable to save the promoter program.')
      const data = await loadProgram(service, args.eventId)
      return NextResponse.json({ data, enabled: true })
    },
  })
}

export function organizerProgramPostRoute() {
  return withAdminCapability('ticketing.manage', async (request, { supabase, user, admin }) => {
    const params = eventParamsSchema.safeParse(eventParamsFromRequest(request))
    if (!params.success) return jsonError({ status: 400, code: 'invalid_event_id', message: 'A valid event id is required.' })
    const body = await readJson(request, promoterProgramSettingsSchema, 'invalid_program_settings', 'Invalid promoter program settings.')
    if (!body.success) return body.response
    try {
      return await writeProgram({
        request,
        eventId: params.data.id,
        supabase,
        userId: user.id,
        orgId: admin.orgId,
        input: body.data,
        existingProgramId: null,
      })
    } catch (error) {
      return unexpectedError(error)
    }
  })
}

export function organizerProgramPatchRoute() {
  return withAdminCapability('ticketing.manage', async (request, { supabase, user, admin }) => {
    const params = eventParamsSchema.safeParse(eventParamsFromRequest(request))
    if (!params.success) return jsonError({ status: 400, code: 'invalid_event_id', message: 'A valid event id is required.' })
    const body = await readJson(request, promoterProgramPatchSchema, 'invalid_program_settings', 'Invalid promoter program settings.')
    if (!body.success) return body.response
    try {
      return await inProgramScope({
        eventId: params.data.id,
        userId: user.id,
        orgId: admin.orgId,
        supabase,
        reason: 'Load and update event promoter program settings',
        run: async (service) => {
          if (!(await assertProgramEnabled(service))) {
            return jsonError({ status: 404, code: 'feature_disabled', message: 'Promoter programs are not enabled for this organization.' })
          }
          const current = await loadProgram(service, params.data.id)
          if (!current.program) return jsonError({ status: 404, code: 'program_not_found', message: 'Create a promoter program before editing it.' })
          const input = promoterProgramSettingsSchema.parse({
            ...toSettings(current.program, current.program.eligible_ticket_types),
            ...body.data,
          })
          const { error } = await service.rpc('upsert_event_promoter_program', {
            p_event_id: params.data.id,
            p_actor_id: user.id,
            p_existing_program_id: current.program.id,
            p_payload: input,
          })
          if (error) return databaseError(error, 'Unable to save the promoter program.')
          return NextResponse.json({ data: await loadProgram(service, params.data.id), enabled: true })
        },
      })
    } catch (error) {
      return unexpectedError(error)
    }
  })
}

export function organizerProgramStateRoute(status: 'open' | 'paused') {
  return withAdminCapability('ticketing.manage', async (request, { supabase, user, admin }) => {
    const params = eventParamsSchema.safeParse(eventParamsFromRequest(request))
    if (!params.success) return jsonError({ status: 400, code: 'invalid_event_id', message: 'A valid event id is required.' })
    try {
      return await inProgramScope({
        eventId: params.data.id,
        userId: user.id,
        orgId: admin.orgId,
        supabase,
        reason: `${status === 'open' ? 'Publish' : 'Pause'} event promoter program`,
        run: async (service) => {
          if (!(await assertProgramEnabled(service))) {
            return jsonError({ status: 404, code: 'feature_disabled', message: 'Promoter programs are not enabled for this organization.' })
          }
          const current = await loadProgram(service, params.data.id)
          if (!current.program) return jsonError({ status: 404, code: 'program_not_found', message: 'Create a promoter program before changing its state.' })
          const input = promoterProgramSettingsSchema.parse({
            ...toSettings(current.program, current.program.eligible_ticket_types),
            status,
          })
          const { error } = await service.rpc('upsert_event_promoter_program', {
            p_event_id: params.data.id,
            p_actor_id: user.id,
            p_existing_program_id: current.program.id,
            p_payload: input,
          })
          if (error) return databaseError(error, 'Unable to change the promoter program state.')
          return NextResponse.json({ data: await loadProgram(service, params.data.id), enabled: true })
        },
      })
    } catch (error) {
      return unexpectedError(error)
    }
  })
}
