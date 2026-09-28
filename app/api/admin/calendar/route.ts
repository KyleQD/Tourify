import { NextRequest, NextResponse } from 'next/server'
import { authenticateApiRequest } from '@/lib/auth/api-auth'
import {
  aggregateAdminCalendarItems,
} from '@/lib/admin/calendar/aggregate'
import { parseCalendarKinds } from '@/lib/admin/calendar/helpers'
import { getCalendarItemColor } from '@/lib/admin/calendar/helpers'
import {
  ADMIN_CALENDAR_KINDS,
  type AdminCalendarKind,
  type AdminCalendarPriority,
  type AdminCalendarScopeMode,
} from '@/lib/admin/calendar/types'
import { resolveActingAdminContext } from '@/lib/auth/admin-context'
import { hasCalendarEntryAccess } from '@/lib/admin/calendar/source-access'
import { projectCalendarItems } from '@/lib/admin/calendar/field-projection'
import {
  adminAccessErrorResponse,
  assertAdminEventAccess,
  assertAdminTourAccess,
} from '@/lib/admin/admin-tour-event-access'

function parseScopeMode(value: string | null): AdminCalendarScopeMode | undefined {
  if (value === 'tour' || value === 'event' || value === 'org') return value
  return undefined
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateApiRequest(request)
    if (!authResult)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { user, supabase } = authResult

    // CAL-102 — signed active org + capabilities (not optional workspace)
    const admin = await resolveActingAdminContext(request, { user, supabase })
    if (admin instanceof NextResponse) return admin

    if (!hasCalendarEntryAccess(admin.capabilities)) {
      return NextResponse.json(
        {
          error: 'This action requires a calendar source capability.',
          code: 'capability_denied',
        },
        { status: 403 },
      )
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate') || new Date().toISOString().split('T')[0]
    const endDate = searchParams.get('endDate')
      || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const types = parseCalendarKinds(searchParams.get('types') || searchParams.get('type'))
    const status = searchParams.get('status') || undefined
    const priority = (searchParams.get('priority') as AdminCalendarPriority | null) || undefined
    const scope = parseScopeMode(searchParams.get('scope'))
    const tourId = searchParams.get('tourId') || undefined
    const eventId = searchParams.get('eventId') || undefined

    if ((scope === 'tour' || (!scope && tourId)) && tourId) {
      try {
        await assertAdminTourAccess({
          supabase,
          userId: admin.userId,
          tourId,
          orgId: admin.orgId,
        })
      } catch (error) {
        const { status: accessStatus, message } = adminAccessErrorResponse(
          error,
          'Tour not accessible',
        )
        return NextResponse.json({ error: message, code: 'scope_denied' }, { status: accessStatus })
      }
    }

    if ((scope === 'event' || (!scope && eventId)) && eventId) {
      try {
        await assertAdminEventAccess({
          supabase,
          userId: admin.userId,
          eventId,
          orgId: admin.orgId,
        })
      } catch (error) {
        const { status: accessStatus, message } = adminAccessErrorResponse(
          error,
          'Event not accessible',
        )
        return NextResponse.json({ error: message, code: 'scope_denied' }, { status: accessStatus })
      }
    }

    const { items, summary, context, sources, isDegraded } = await aggregateAdminCalendarItems({
      supabase,
      userId: admin.userId,
      orgId: admin.orgId,
      capabilities: admin.capabilities,
      filters: {
        startDate,
        endDate,
        types,
        status,
        priority,
        scope,
        tourId,
        eventId,
      },
    })

    const projected = projectCalendarItems({
      items,
      capabilities: admin.capabilities,
      mode: 'admin',
    })

    // Backward-compatible `events` alias for older clients
    const events = projected.map((item) => ({
      id: item.id,
      title: item.title,
      type: item.kind === 'shift' ? 'logistics' : item.kind,
      start: item.start,
      end: item.end,
      color: item.color,
      description: item.description,
      location: item.location,
      status: item.status,
      priority: item.priority,
      href: item.href,
      allDay: item.allDay,
      originalData: item.meta,
    }))

    return NextResponse.json({
      success: true,
      items: projected,
      events,
      total: projected.length,
      orgId: admin.orgId,
      filters: {
        startDate,
        endDate,
        types,
        status,
        priority,
        scope,
        tourId,
        eventId,
      },
      summary,
      context,
      sources,
      isDegraded,
    })
  } catch (error) {
    console.error('[Admin Calendar API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateApiRequest(request)
    if (!authResult)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { user, supabase } = authResult

    // CAL-103 — signed acting org required; no heterogeneous inserts
    const admin = await resolveActingAdminContext(request, { user, supabase })
    if (admin instanceof NextResponse) return admin

    if (!hasCalendarEntryAccess(admin.capabilities)) {
      return NextResponse.json(
        {
          error: 'This action requires a calendar source capability.',
          code: 'capability_denied',
        },
        { status: 403 },
      )
    }

    const body = await request.json().catch(() => ({}))

    const { executeCalendarCreateCommand, getCalendarCommandErrorStatus, CalendarCommandError } =
      await import('@/lib/admin/calendar-command.service')

    try {
      const result = await executeCalendarCreateCommand({
        supabase,
        userId: admin.userId,
        orgId: admin.orgId,
        body,
      })

      const data = result.data as { id?: string } | null
      const type = typeof body?.type === 'string' ? body.type : result.table
      const title = typeof body?.title === 'string' ? body.title : ''
      const start = typeof body?.start === 'string' ? body.start : new Date().toISOString()
      const end = typeof body?.end === 'string' ? body.end : start
      const priority = (typeof body?.priority === 'string' ? body.priority : 'medium') as AdminCalendarPriority
      const kind = (type === 'logistics' ? 'shift' : type) as AdminCalendarKind
      const color = getCalendarItemColor(
        ADMIN_CALENDAR_KINDS.includes(kind) ? kind : 'task',
        priority,
      )

      return NextResponse.json({
        success: true,
        message: result.message,
        table: result.table,
        data: result.data,
        event: {
          id: data?.id ? `${type}-${data.id}` : result.table,
          title,
          type,
          start: new Date(start),
          end: new Date(end),
          color,
          description: typeof body?.description === 'string' ? body.description : null,
          location: typeof body?.location === 'string' ? body.location : null,
          priority,
          status: 'upcoming',
          originalData: result.data,
        },
      })
    } catch (commandError) {
      const status = getCalendarCommandErrorStatus(commandError, 500)
      const message =
        commandError instanceof Error ? commandError.message : 'Calendar create failed'
      const code =
        commandError instanceof CalendarCommandError
          ? commandError.code
          : 'command_failed'
      const details =
        commandError instanceof CalendarCommandError ? commandError.details : undefined
      return NextResponse.json({ error: message, code, details }, { status })
    }
  } catch (error) {
    console.error('[Admin Calendar API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
