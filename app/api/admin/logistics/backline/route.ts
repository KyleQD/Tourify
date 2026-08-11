import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withAdminCapability } from '@/lib/auth/api-auth'
import {
  applyOrgLogisticsTaskFilter,
  resolveAuthorizedOrgLogisticsScope,
} from '@/lib/admin/resolve-authorized-org'
import { buildLogisticsTaskInsert } from '@/lib/logistics/tasks-adapter'
import { detectMissingRequired } from '@/lib/logistics/conflicts'

const requirementSchema = z.object({
  gear_type: z.string().min(1),
  event_id: z.string().uuid().optional().nullable(),
  tour_id: z.string().uuid().optional().nullable(),
  artist_account_id: z.string().uuid().optional().nullable(),
  performance_name: z.string().optional().nullable(),
  requested_make_model: z.string().optional().nullable(),
  acceptable_alternatives: z.string().optional().nullable(),
  quantity: z.number().int().positive().default(1),
  configuration_notes: z.string().optional().nullable(),
  tuning_notes: z.string().optional().nullable(),
  power_voltage: z.string().optional().nullable(),
  placement_notes: z.string().optional().nullable(),
  priority: z.enum(['low', 'normal', 'high', 'critical']).optional(),
  requires_artist_approval: z.boolean().optional(),
  rider_version: z.string().optional().nullable(),
  setup_deadline: z.string().optional().nullable(),
  projected_cost: z.number().optional().nullable(),
  status: z.string().optional(),
  create_task: z.boolean().optional(),
})

const fulfillmentSchema = z.object({
  action: z.literal('fulfill'),
  requirement_id: z.string().uuid(),
  source_type: z.enum(['organization', 'venue', 'artist', 'vendor', 'rental', 'other']),
  equipment_asset_id: z.string().uuid().optional().nullable(),
  vendor_id: z.string().uuid().optional().nullable(),
  quantity: z.number().int().positive().default(1),
  provider_contact: z.string().optional().nullable(),
  projected_cost: z.number().optional().nullable(),
  notes: z.string().optional().nullable(),
  status: z.string().optional(),
})

const substitutionSchema = z.object({
  action: z.literal('substitute'),
  requirement_id: z.string().uuid(),
  fulfillment_id: z.string().uuid().optional().nullable(),
  proposed_make_model: z.string().min(1),
  reason: z.string().optional().nullable(),
  decision: z.enum(['pending', 'approved', 'changes_requested', 'rejected']).optional(),
  decision_comment: z.string().optional().nullable(),
  rider_version: z.string().optional().nullable(),
})

export async function GET(request: NextRequest) {
  return withAdminCapability('logistics.view', async (_req, { user, admin }) => {
    try {
      const { searchParams } = new URL(request.url)
      const eventId = searchParams.get('eventId') || searchParams.get('event_id')
      const tourId = searchParams.get('tourId') || searchParams.get('tour_id')
      const scope = await resolveAuthorizedOrgLogisticsScope({
        userId: user.id,
        requestedOrgId: admin.orgId,
        eventId,
        tourId,
      })

      let query = scope.service
        .from('backline_requirements')
        .select('*, backline_fulfillments(*), backline_substitution_approvals(*)')
        .order('created_at', { ascending: false })
        .limit(200)

      query = applyOrgLogisticsTaskFilter({
        query,
        userId: user.id,
        eventIds: scope.eventIds,
        tourIds: scope.tourIds,
        eventId,
        tourId,
        includeCreatedBy: true,
      })

      const { data, error } = await query
      if (error) {
        if (error.code === '42P01') return NextResponse.json({ requirements: [], needsMigration: true })
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      const requirements = data || []
      const conflicts = requirements.flatMap((req: any) => {
        const list = []
        if (!req.backline_fulfillments?.length && req.status !== 'cancelled') {
          const missing = detectMissingRequired({
            id: req.id,
            field: 'fulfillment',
            value: null,
          })
          if (missing) list.push(missing)
        }
        return list
      })

      return NextResponse.json({ requirements, conflicts })
    } catch (error: any) {
      return NextResponse.json({ error: error.message || 'Failed to load backline' }, { status: 500 })
    }
  })(request)
}

export async function POST(request: NextRequest) {
  return withAdminCapability('logistics.manage', async (req, { user, admin }) => {
    try {
      const body = await req.json()

      if (body.action === 'fulfill') {
        const parsed = fulfillmentSchema.safeParse(body)
        if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
        const scope = await resolveAuthorizedOrgLogisticsScope({ userId: user.id, requestedOrgId: admin.orgId })
        const input = parsed.data
        const { data, error } = await scope.service
          .from('backline_fulfillments')
          .insert({
            requirement_id: input.requirement_id,
            source_type: input.source_type,
            equipment_asset_id: input.equipment_asset_id || null,
            vendor_id: input.vendor_id || null,
            quantity: input.quantity,
            provider_contact: input.provider_contact || null,
            projected_cost: input.projected_cost ?? null,
            notes: input.notes || null,
            status: input.status || 'proposed',
            created_by: user.id,
          })
          .select('*')
          .single()
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })

        await scope.service
          .from('backline_requirements')
          .update({ status: 'sourcing', updated_at: new Date().toISOString() })
          .eq('id', input.requirement_id)

        return NextResponse.json({ fulfillment: data }, { status: 201 })
      }

      if (body.action === 'substitute') {
        const parsed = substitutionSchema.safeParse(body)
        if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
        const scope = await resolveAuthorizedOrgLogisticsScope({ userId: user.id, requestedOrgId: admin.orgId })
        const input = parsed.data
        const decision = input.decision || 'pending'
        const { data, error } = await scope.service
          .from('backline_substitution_approvals')
          .insert({
            requirement_id: input.requirement_id,
            fulfillment_id: input.fulfillment_id || null,
            proposed_make_model: input.proposed_make_model,
            reason: input.reason || null,
            requester_user_id: user.id,
            approver_user_id: decision === 'pending' ? null : user.id,
            decision,
            decision_comment: input.decision_comment || null,
            rider_version: input.rider_version || null,
            decided_at: decision === 'pending' ? null : new Date().toISOString(),
          })
          .select('*')
          .single()
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ substitution: data }, { status: 201 })
      }

      const parsed = requirementSchema.safeParse(body)
      if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
      const input = parsed.data
      const scope = await resolveAuthorizedOrgLogisticsScope({
        userId: user.id,
        requestedOrgId: admin.orgId,
        eventId: input.event_id,
        tourId: input.tour_id,
      })

      const { data: requirement, error } = await scope.service
        .from('backline_requirements')
        .insert({
          org_id: scope.orgId,
          event_id: input.event_id || null,
          tour_id: input.tour_id || null,
          artist_account_id: input.artist_account_id || null,
          performance_name: input.performance_name || null,
          gear_type: input.gear_type,
          requested_make_model: input.requested_make_model || null,
          acceptable_alternatives: input.acceptable_alternatives || null,
          quantity: input.quantity,
          configuration_notes: input.configuration_notes || null,
          tuning_notes: input.tuning_notes || null,
          power_voltage: input.power_voltage || null,
          placement_notes: input.placement_notes || null,
          priority: input.priority || 'normal',
          requires_artist_approval: Boolean(input.requires_artist_approval),
          rider_version: input.rider_version || null,
          setup_deadline: input.setup_deadline || null,
          projected_cost: input.projected_cost ?? null,
          status: input.status || 'requested',
          created_by: user.id,
        })
        .select('*')
        .single()

      if (error) {
        if (error.code === '42P01') {
          return NextResponse.json({ error: 'Backline tables missing — apply logistics foundation migration' }, { status: 503 })
        }
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      let task = null
      if (input.create_task !== false) {
        const { data: createdTask } = await scope.service
          .from('logistics_tasks')
          .insert(buildLogisticsTaskInsert({
            eventId: input.event_id,
            tourId: input.tour_id,
            type: 'backline',
            title: `Backline: ${input.gear_type}`,
            description: input.requested_make_model || null,
            createdBy: user.id,
            sourceType: 'backline_requirement',
            sourceId: requirement.id,
            budget: input.projected_cost ?? null,
          }))
          .select('*')
          .maybeSingle()
        task = createdTask
      }

      return NextResponse.json({ requirement, task }, { status: 201 })
    } catch (error: any) {
      return NextResponse.json({ error: error.message || 'Failed to save backline' }, { status: 500 })
    }
  })(request)
}
