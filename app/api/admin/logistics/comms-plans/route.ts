import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withAdminAuth } from '@/lib/auth/api-auth'
import {
  applyOrgLogisticsTaskFilter,
  resolveAuthorizedOrgLogisticsScope,
} from '@/lib/admin/resolve-authorized-org'

const planSchema = z.object({
  title: z.string().min(1),
  event_id: z.string().uuid().optional().nullable(),
  tour_id: z.string().uuid().optional().nullable(),
  site_map_id: z.string().uuid().optional().nullable(),
  version_label: z.string().optional(),
  operating_date: z.string().optional().nullable(),
  escalation_notes: z.string().optional().nullable(),
  status: z.enum(['draft', 'published', 'superseded', 'archived']).optional(),
  channels: z.array(z.object({
    channel_type: z.enum(['radio', 'intercom', 'phone', 'group_chat', 'email', 'external', 'other']),
    name: z.string().min(1),
    purpose: z.string().optional().nullable(),
    audience_label: z.string().optional().nullable(),
    instructions: z.string().optional().nullable(),
    visibility: z.enum([
      'admin_internal', 'assigned_team', 'specific_users', 'venue_shared', 'vendor_shared',
    ]).optional(),
    is_restricted: z.boolean().optional(),
  })).optional(),
})

export async function GET(request: NextRequest) {
  return withAdminAuth(async (_req, { user }) => {
    try {
      const { searchParams } = new URL(request.url)
      const eventId = searchParams.get('eventId') || searchParams.get('event_id')
      const tourId = searchParams.get('tourId') || searchParams.get('tour_id')
      const scope = await resolveAuthorizedOrgLogisticsScope({
        userId: user.id,
        eventId,
        tourId,
      })

      let query = scope.service
        .from('logistics_comms_plans')
        .select('*, logistics_comms_channels(*)')
        .order('created_at', { ascending: false })
        .limit(100)

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
        if (error.code === '42P01') return NextResponse.json({ plans: [], needsMigration: true })
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      return NextResponse.json({ plans: data || [] })
    } catch (error: any) {
      return NextResponse.json({ error: error.message || 'Failed to load comms plans' }, { status: 500 })
    }
  })(request)
}

export async function POST(request: NextRequest) {
  return withAdminAuth(async (req, { user }) => {
    try {
      const body = await req.json()
      const parsed = planSchema.safeParse(body)
      if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
      const input = parsed.data
      const scope = await resolveAuthorizedOrgLogisticsScope({
        userId: user.id,
        eventId: input.event_id,
        tourId: input.tour_id,
      })

      const status = input.status || 'draft'
      const { data: plan, error } = await scope.service
        .from('logistics_comms_plans')
        .insert({
          org_id: scope.orgId,
          event_id: input.event_id || null,
          tour_id: input.tour_id || null,
          site_map_id: input.site_map_id || null,
          title: input.title,
          version_label: input.version_label || 'v1',
          operating_date: input.operating_date || null,
          escalation_notes: input.escalation_notes || null,
          status,
          published_at: status === 'published' ? new Date().toISOString() : null,
          published_by: status === 'published' ? user.id : null,
          created_by: user.id,
        })
        .select('*')
        .single()

      if (error) {
        if (error.code === '42P01') {
          return NextResponse.json({ error: 'Comms plan tables missing — apply logistics foundation migration' }, { status: 503 })
        }
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      let channels = []
      if (input.channels?.length) {
        const { data: inserted } = await scope.service
          .from('logistics_comms_channels')
          .insert(input.channels.map((ch) => ({
            plan_id: plan.id,
            channel_type: ch.channel_type,
            name: ch.name,
            purpose: ch.purpose || null,
            audience_label: ch.audience_label || null,
            instructions: ch.instructions || null,
            visibility: ch.visibility || 'assigned_team',
            is_restricted: Boolean(ch.is_restricted),
          })))
          .select('*')
        channels = inserted || []
      }

      return NextResponse.json({ plan, channels }, { status: 201 })
    } catch (error: any) {
      return NextResponse.json({ error: error.message || 'Failed to create comms plan' }, { status: 500 })
    }
  })(request)
}
