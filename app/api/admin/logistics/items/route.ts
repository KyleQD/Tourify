import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { authenticateApiRequest, checkAdminPermissions, withAdminCapability } from '@/lib/auth/api-auth'
import { resolveActingAdminContext } from '@/lib/auth/admin-context'
import { hasEntityPermission } from '@/lib/services/rbac'
import {
  applyOrgLogisticsTaskFilter,
  resolveAuthorizedOrgLogisticsScope,
} from '@/lib/admin/resolve-authorized-org'
import {
  executeLogisticsCommand,
  getLogisticsCommandErrorStatus,
  LogisticsCommandError,
} from '@/lib/admin/logistics-command.service'
import { parseLogisticsCommand } from '@/lib/admin/logistics-command-schemas'

interface QueryParams {
  eventId?: string | null
  tourId?: string | null
  type?: string | null
  orgId?: string | null
}

function parseQuery(request: NextRequest): QueryParams {
  const { searchParams } = new URL(request.url)
  return {
    eventId: searchParams.get('eventId'),
    tourId: searchParams.get('tourId'),
    type: searchParams.get('type'),
    orgId: searchParams.get('orgId'),
  }
}

export async function GET(request: NextRequest) {
  return withAdminCapability('logistics.view', async (_req, { user, admin }) => {
    try {
      const { eventId, tourId, type } = parseQuery(request)
      const scope = await resolveAuthorizedOrgLogisticsScope({
        userId: user.id,
        requestedOrgId: admin.orgId,
        eventId,
        tourId,
      })
      const supabase = scope.service

      if (type === 'assignments') {
        // Resolve allowed task IDs first — nested or-filters on joined tables are unreliable
        let taskIdQuery = supabase.from('logistics_tasks').select('id')
        taskIdQuery = applyOrgLogisticsTaskFilter({
          query: taskIdQuery,
          userId: user.id,
          eventIds: scope.eventIds,
          tourIds: scope.tourIds,
          eventId,
          tourId,
        })
        const { data: scopedTasks, error: taskErr } = await taskIdQuery
        if (taskErr) throw taskErr

        const taskIds = (scopedTasks ?? []).map((row: { id: string }) => row.id)
        if (taskIds.length === 0)
          return NextResponse.json({ items: [], orgId: scope.orgId })

        const { data, error } = await supabase
          .from('logistics_task_equipment')
          .select(`
            *,
            task:logistics_tasks!inner(id, event_id, tour_id, type, title, status, priority, created_by),
            equipment:equipment_assets(id, name, serial_number, is_available)
          `)
          .in('task_id', taskIds)
          .order('created_at', { ascending: false })

        if (error) throw error

        return NextResponse.json({ items: data || [], orgId: scope.orgId })
      }

      if (type === 'analytics') {
        let analyticsQuery = supabase
          .from('logistics_tasks')
          .select('type, status, priority, budget, actual_cost')

        analyticsQuery = applyOrgLogisticsTaskFilter({
          query: analyticsQuery,
          userId: user.id,
          eventIds: scope.eventIds,
          tourIds: scope.tourIds,
          eventId,
          tourId,
        })

        const { data, error } = await analyticsQuery
        if (error) throw error

        const analytics = (data || []).reduce((acc: Record<string, any>, task: any) => {
          const key = task.type || 'unknown'
          if (!acc[key]) acc[key] = { total: 0, completed: 0, urgent: 0, budget: 0, actualCost: 0 }
          acc[key].total += 1
          if (task.status === 'completed') acc[key].completed += 1
          if (task.priority === 'urgent') acc[key].urgent += 1
          acc[key].budget += Number(task.budget || 0)
          acc[key].actualCost += Number(task.actual_cost || 0)
          return acc
        }, {})

        return NextResponse.json({ analytics, orgId: scope.orgId })
      }

      let query = supabase
        .from('logistics_tasks')
        .select(`
          *,
          equipment_links:logistics_task_equipment(
            id,
            equipment_asset_id,
            start_time,
            end_time,
            quantity,
            equipment:equipment_assets(id, name, serial_number, is_available)
          )
        `)
        .order('updated_at', { ascending: false })

      query = applyOrgLogisticsTaskFilter({
        query,
        userId: user.id,
        eventIds: scope.eventIds,
        tourIds: scope.tourIds,
        eventId,
        tourId,
      })

      if (type && type !== 'all') query = query.eq('type', type)

      const { data, error } = await query
      if (error) throw error

      return NextResponse.json({ items: data || [], orgId: scope.orgId })
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : typeof error === 'object' && error && 'message' in error
            ? String((error as { message: unknown }).message)
            : JSON.stringify(error)
      console.error('[Logistics Items] GET error:', message)

      if (
        message.includes('not available to this admin account') ||
        message.includes('Organization is not available')
      ) {
        return NextResponse.json({ error: message }, { status: 403 })
      }

      return NextResponse.json({ error: 'Failed to fetch logistics items' }, { status: 500 })
    }
  })(request)
}

export async function POST(request: NextRequest) {
  const auth = await authenticateApiRequest(request)
  if (!auth) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  const isAdmin = await checkAdminPermissions(auth.user)
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = await resolveActingAdminContext(request, auth)
  if (admin instanceof NextResponse) return admin

  try {
    const body = await request.json()

    let resolvedAssignee: string | null = null
    if (body.assignedTo || body.assigned_to_user_id) {
      const candidate: string = body.assignedTo || body.assigned_to_user_id
      const uuidRegex = /^[0-9a-fA-F-]{36}$/
      if (uuidRegex.test(candidate)) resolvedAssignee = candidate
      else if (typeof candidate === 'string' && candidate.includes('@')) {
        const { data: profile } = await auth.supabase
          .from('profiles')
          .select('id, email')
          .ilike('email', candidate)
          .single()
        if (profile) resolvedAssignee = profile.id as string
      }
    }

    const eventId: string | null = body.eventId || body.event_id || null
    const tourIdForPerm: string | null = body.tourId || body.tour_id || null
    let allowed = false

    if (eventId || tourIdForPerm) {
      try {
        const scope = await resolveAuthorizedOrgLogisticsScope({
          userId: auth.user.id,
          requestedOrgId: admin.orgId,
          eventId,
          tourId: tourIdForPerm,
        })
        if (eventId && scope.eventIds.includes(eventId)) allowed = true
        if (tourIdForPerm && scope.tourIds.includes(tourIdForPerm)) allowed = true
      } catch {
        allowed = false
      }
    }

    if (!allowed && eventId) {
      try {
        allowed = await hasEntityPermission({
          userId: auth.user.id,
          entityType: 'Event',
          entityId: eventId,
          permission: 'EDIT_EVENT_LOGISTICS',
        })
      } catch { /* continue */ }
    }

    if (!allowed && tourIdForPerm) {
      try {
        allowed = await hasEntityPermission({
          userId: auth.user.id,
          entityType: 'Tour',
          entityId: tourIdForPerm,
          permission: 'EDIT_EVENT_LOGISTICS',
        })
      } catch { /* continue */ }
    }

    if (!eventId && !tourIdForPerm) allowed = true
    if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const parsed = parseLogisticsCommand({
      action: 'create_task',
      type: body.type,
      title: body.title,
      description: body.description ?? null,
      category: body.category ?? null,
      priority: body.priority || 'medium',
      event_id: eventId,
      tour_id: tourIdForPerm,
      assigned_to_user_id: resolvedAssignee,
      due_date: body.dueDate || body.due_date || null,
      budget: body.budget ?? null,
      actual_cost: body.actualCost ?? body.actual_cost ?? null,
      notes: body.notes || null,
      tags: body.tags || null,
      source_type: body.sourceType || body.source_type || null,
      source_id: body.sourceId || body.source_id || null,
      is_authoritative: body.isAuthoritative || body.is_authoritative || undefined,
    })
    if (!parsed.ok) {
      return NextResponse.json(
        { error: parsed.error, details: parsed.details, code: 'validation_failed' },
        { status: 400 },
      )
    }

    const result = await executeLogisticsCommand({
      supabase: auth.supabase,
      userId: auth.user.id,
      orgId: admin.orgId,
      command: parsed.data,
    })

    return NextResponse.json({ item: result.data, message: result.message }, { status: 201 })
  } catch (error) {
    console.error('[Logistics Items] POST error:', error)
    const status = getLogisticsCommandErrorStatus(error, 500)
    const message = error instanceof Error ? error.message : 'Failed to create logistics item'
    const code = error instanceof LogisticsCommandError ? error.code : 'create_failed'
    return NextResponse.json({ error: message, code }, { status })
  }
}
