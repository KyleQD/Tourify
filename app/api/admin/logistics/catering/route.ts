import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withAdminCapability } from '@/lib/auth/api-auth'
import {
  applyOrgLogisticsTaskFilter,
  resolveAuthorizedOrgLogisticsScope,
} from '@/lib/admin/resolve-authorized-org'
import { buildDietaryKitchenSummary, type DietaryPreferenceRecord } from '@/lib/logistics/dietary-privacy'
import { buildLogisticsTaskInsert } from '@/lib/logistics/tasks-adapter'
import { projectCateringServiceRecord } from '@/lib/admin/traveler-field-projection'

const serviceSchema = z.object({
  title: z.string().min(1),
  service_type: z.string().min(1).default('meal'),
  event_id: z.string().uuid().optional().nullable(),
  tour_id: z.string().uuid().optional().nullable(),
  service_date: z.string().optional().nullable(),
  window_start: z.string().optional().nullable(),
  window_end: z.string().optional().nullable(),
  location_label: z.string().optional().nullable(),
  site_map_id: z.string().uuid().optional().nullable(),
  site_map_version_id: z.string().uuid().optional().nullable(),
  anchor_id: z.string().optional().nullable(),
  department_scope: z.string().optional().nullable(),
  vendor_id: z.string().uuid().optional().nullable(),
  menu: z.string().optional().nullable(),
  service_style: z.string().optional().nullable(),
  headcount_manual: z.number().int().nonnegative().optional().nullable(),
  projected_cost: z.number().optional().nullable(),
  timezone: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  status: z.string().optional(),
  dietary_records: z.array(z.object({
    preference: z.string().optional().nullable(),
    allergy: z.string().optional().nullable(),
  })).optional(),
  freeze_headcount: z.boolean().optional(),
  create_task: z.boolean().optional(),
})

export const GET = withAdminCapability('logistics.view', async (request, { user, admin }) => {
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
      .from('catering_services')
      .select('*, catering_headcount_snapshots(*), catering_dietary_summaries(*)')
      .order('window_start', { ascending: true, nullsFirst: false })
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
      if (error.code === '42P01') return NextResponse.json({ services: [], needsMigration: true })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    const services = ((data || []) as Record<string, unknown>[]).map((row) =>
      projectCateringServiceRecord({
        row,
        capabilities: admin.capabilities,
      }),
    )
    return NextResponse.json({ services })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to load catering' }, { status: 500 })
  }
})

export async function POST(request: NextRequest) {
  return withAdminCapability('logistics.manage', async (req, { user, admin }) => {
    try {
      const body = await req.json()
      const parsed = serviceSchema.safeParse(body)
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
      }
      const input = parsed.data
      const scope = await resolveAuthorizedOrgLogisticsScope({
        userId: user.id,
        requestedOrgId: admin.orgId,
        eventId: input.event_id,
        tourId: input.tour_id,
      })

      const { data: service, error } = await scope.service
        .from('catering_services')
        .insert({
          org_id: scope.orgId,
          event_id: input.event_id || null,
          tour_id: input.tour_id || null,
          title: input.title,
          service_type: input.service_type,
          service_date: input.service_date || null,
          window_start: input.window_start || null,
          window_end: input.window_end || null,
          location_label: input.location_label || null,
          site_map_id: input.site_map_id || null,
          site_map_version_id: input.site_map_version_id || null,
          anchor_id: input.anchor_id || null,
          department_scope: input.department_scope || null,
          vendor_id: input.vendor_id || null,
          menu: input.menu || null,
          service_style: input.service_style || null,
          headcount_manual: input.headcount_manual ?? null,
          projected_cost: input.projected_cost ?? null,
          timezone: input.timezone || 'UTC',
          notes: input.notes || null,
          status: input.status || 'requested',
          created_by: user.id,
        })
        .select('*')
        .single()

      if (error) {
        if (error.code === '42P01') {
          return NextResponse.json({ error: 'Catering tables missing — apply logistics foundation migration' }, { status: 503 })
        }
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      const headcount = input.headcount_manual ?? 0
      const { data: snapshot } = await scope.service
        .from('catering_headcount_snapshots')
        .insert({
          catering_service_id: service.id,
          snapshot_label: input.freeze_headcount ? 'published' : 'draft',
          headcount,
          source: 'manual',
          is_frozen: Boolean(input.freeze_headcount),
          frozen_at: input.freeze_headcount ? new Date().toISOString() : null,
          frozen_by: input.freeze_headcount ? user.id : null,
          created_by: user.id,
        })
        .select('*')
        .maybeSingle()

      const dietaryRecords: DietaryPreferenceRecord[] = (input.dietary_records || []).map((r) => ({
        preference: r.preference,
        allergy: r.allergy,
      }))
      const kitchen = buildDietaryKitchenSummary(dietaryRecords)
      await scope.service.from('catering_dietary_summaries').insert({
        catering_service_id: service.id,
        headcount: kitchen.headcount || headcount,
        preference_counts: kitchen.preferenceCounts,
        allergy_counts: kitchen.allergyCounts,
        unspecified_count: kitchen.hasUnspecified,
        safety_instructions: kitchen.safetyInstructions,
      })

      let task = null
      if (input.create_task !== false) {
        const { data: createdTask } = await scope.service
          .from('logistics_tasks')
          .insert(buildLogisticsTaskInsert({
            eventId: input.event_id,
            tourId: input.tour_id,
            type: 'catering',
            title: `Catering: ${input.title}`,
            description: input.menu || null,
            createdBy: user.id,
            sourceType: 'catering_service',
            sourceId: service.id,
            budget: input.projected_cost ?? null,
          }))
          .select('*')
          .maybeSingle()
        task = createdTask
      }

      return NextResponse.json({
        service,
        snapshot,
        dietarySummary: kitchen,
        task,
      }, { status: 201 })
    } catch (error: any) {
      return NextResponse.json({ error: error.message || 'Failed to create catering service' }, { status: 500 })
    }
  })(request)
}

export async function PATCH(request: NextRequest) {
  return withAdminCapability('logistics.manage', async (req, { user, admin }) => {
    try {
      const body = await req.json()
      const id = body.id as string | undefined
      if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

      const scope = await resolveAuthorizedOrgLogisticsScope({ userId: user.id, requestedOrgId: admin.orgId })
      const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
      for (const key of ['status', 'menu', 'projected_cost', 'actual_cost', 'notes', 'location_label', 'window_start', 'window_end']) {
        if (body[key] !== undefined) updates[key] = body[key]
      }

      const { data, error } = await scope.service
        .from('catering_services')
        .update(updates)
        .eq('id', id)
        .select('*')
        .single()

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })

      if (body.freeze_headcount && typeof body.headcount === 'number') {
        await scope.service.from('catering_headcount_snapshots').insert({
          catering_service_id: id,
          snapshot_label: 'published',
          headcount: body.headcount,
          source: 'manual',
          is_frozen: true,
          frozen_at: new Date().toISOString(),
          frozen_by: user.id,
          created_by: user.id,
        })
      }

      return NextResponse.json({ service: data })
    } catch (error: any) {
      return NextResponse.json({ error: error.message || 'Failed to update catering' }, { status: 500 })
    }
  })(request)
}
