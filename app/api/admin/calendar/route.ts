import { NextRequest, NextResponse } from 'next/server'
import { authenticateApiRequest, checkAdminPermissions } from '@/lib/auth/api-auth'
import { formatSafeDate } from '@/lib/events/admin-event-normalization'
import {
  aggregateAdminCalendarItems,
} from '@/lib/admin/calendar/aggregate'
import { AdminTourEventOperationsService } from '@/lib/admin/tour-event-operations.service'
import { parseCalendarKinds } from '@/lib/admin/calendar/helpers'
import { getCalendarItemColor } from '@/lib/admin/calendar/helpers'
import type {
  AdminCalendarKind,
  AdminCalendarPriority,
  AdminCalendarScopeMode,
} from '@/lib/admin/calendar/types'
import { requireOpsOrgId, resolveOptionalAdminWorkspaceScope } from '@/lib/admin/workspace-scope'

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

    const hasAdminAccess = await checkAdminPermissions(user)
    if (!hasAdminAccess)
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })

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

    const workspaceScope = await resolveOptionalAdminWorkspaceScope(request, { supabase, user })
    if (workspaceScope instanceof NextResponse) return workspaceScope
    const orgId = workspaceScope ? requireOpsOrgId(workspaceScope) : null
    if (orgId instanceof NextResponse) return orgId

    const { items, summary, context } = await aggregateAdminCalendarItems({
      supabase,
      userId: user.id,
      orgId,
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

    // Backward-compatible `events` alias for older clients
    const events = items.map((item) => ({
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
      items,
      events,
      total: items.length,
      orgId,
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

    const hasAdminAccess = await checkAdminPermissions(user)
    if (!hasAdminAccess)
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })

    const body = await request.json()
    const {
      title,
      type,
      start,
      end,
      description,
      location,
      priority,
      event_id,
      tour_id,
      assignee_id,
      attendees = [],
      reminders = [],
      sendNotifications = false,
      enableReminders = false,
    } = body

    if (!title || !type || !start)
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })

    const assigneeId = typeof assignee_id === 'string' && assignee_id.trim()
      ? assignee_id.trim()
      : null

    const workspaceScope = await resolveOptionalAdminWorkspaceScope(request, { supabase, user })
    if (workspaceScope instanceof NextResponse) return workspaceScope
    const orgId = workspaceScope
      ? requireOpsOrgId(workspaceScope)
      : await AdminTourEventOperationsService.resolveOrgId({ supabase, userId: user.id })
    if (orgId instanceof NextResponse) return orgId
    if (!orgId) {
      return NextResponse.json({ error: 'Organization workspace is missing its operational scope.' }, { status: 409 })
    }

    let insertData: Record<string, unknown> = {
      created_by: user.id,
    }

    let tableName = 'events_v2'
    const kind = type === 'logistics' ? 'shift' : type as AdminCalendarKind

    switch (type) {
      case 'event': {
        const slugBase = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'event'
        const slug = `${slugBase}-${Date.now().toString(36)}`
        tableName = 'events_v2'
        insertData = {
          ...insertData,
          org_id: orgId,
          title,
          slug,
          start_at: new Date(start).toISOString(),
          end_at: new Date(end || new Date(new Date(start).getTime() + 2 * 60 * 60 * 1000)).toISOString(),
          status: 'inquiry',
          settings: { description: description || '', venue_label: location || '' },
        }
        break
      }
      case 'tour':
        tableName = 'tours'
        insertData = {
          ...insertData,
          org_id: orgId,
          name: title,
          slug: `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 48)}-${Date.now().toString(36)}`,
          description,
          start_date: new Date(start).toISOString().split('T')[0],
          end_date: new Date(end || start).toISOString().split('T')[0],
          status: 'planning',
        }
        break
      case 'task': {
        // Live public.tasks.assigned_to FKs empty public.users and rejects all assignees.
        // logistics_tasks.assigned_to_user_id FKs auth.users and is already aggregated as kind:task.
        if (!event_id && !tour_id) {
          return NextResponse.json({
            error: 'event_id or tour_id is required when creating a task',
          }, { status: 400 })
        }

        let resolvedAssigneeId: string | null = null
        if (assigneeId) {
          const { data: authUser } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', assigneeId)
            .maybeSingle()
          // profiles.id matches auth.users in this project; only assign when profile exists
          resolvedAssigneeId = authUser?.id || null
        }

        tableName = 'logistics_tasks'
        insertData = {
          created_by: user.id,
          org_id: orgId,
          ...(event_id ? { event_id } : {}),
          ...(tour_id ? { tour_id } : {}),
          title,
          description: description || null,
          due_date: new Date(start).toISOString().split('T')[0],
          status: 'pending',
          priority: priority || 'medium',
          type: 'communication',
          ...(resolvedAssigneeId ? { assigned_to_user_id: resolvedAssigneeId } : {}),
        }
        break
      }
      case 'logistics':
      case 'shift': {
        tableName = 'staff_shifts'
        let staffMemberId: string | null = null
        if (assigneeId) {
          const { data: staffMember } = await supabase
            .from('staff_members')
            .select('id')
            .eq('user_id', assigneeId)
            .limit(1)
            .maybeSingle()
          staffMemberId = staffMember?.id || null
        }
        insertData = {
          ...insertData,
          org_id: orgId,
          role_assignment: title,
          shift_date: new Date(start).toISOString().split('T')[0],
          start_time: new Date(start).toTimeString().split(' ')[0],
          end_time: new Date(end || start).toTimeString().split(' ')[0],
          status: 'scheduled',
          notes: description,
          ...(event_id ? { event_id } : {}),
          ...(staffMemberId ? { staff_member_id: staffMemberId } : {}),
        }
        break
      }
      default:
        return NextResponse.json({
          error: 'Invalid event type. Supported: event, tour, task, logistics, shift',
        }, { status: 400 })
    }

    const { data, error } = await supabase
      .from(tableName)
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error('[Admin Calendar API] Insert error:', error)
      return NextResponse.json({ error: 'Failed to create event' }, { status: 500 })
    }

    if (sendNotifications && attendees.length > 0) {
      try {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', attendees)

        const profileIds = new Set((profiles || []).map((p: { user_id: string }) => p.user_id))

        await Promise.all(
          attendees
            .filter((attendeeId: string) => profileIds.has(attendeeId) || true)
            .map(async (attendeeId: string) => {
              await supabase.from('notifications').insert({
                user_id: attendeeId,
                type: 'event_invitation',
                title: `New Event: ${title}`,
                content: `You have been invited to "${title}" on ${formatSafeDate(start)} at ${new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(new Date(start))}`,
                metadata: {
                  eventId: data.id,
                  eventType: type,
                  location,
                  description,
                },
              })
            }),
        )
      } catch (notificationError) {
        console.error('[Admin Calendar API] Failed to send notifications:', notificationError)
      }
    }

    if (enableReminders && reminders.length > 0) {
      try {
        await Promise.all(reminders.map(async (reminderTime: string) => {
          let reminderDate: Date
          switch (reminderTime) {
            case '5min':
              reminderDate = new Date(new Date(start).getTime() - 5 * 60 * 1000)
              break
            case '15min':
              reminderDate = new Date(new Date(start).getTime() - 15 * 60 * 1000)
              break
            case '30min':
              reminderDate = new Date(new Date(start).getTime() - 30 * 60 * 1000)
              break
            case '1hour':
              reminderDate = new Date(new Date(start).getTime() - 60 * 60 * 1000)
              break
            case '1day':
              reminderDate = new Date(new Date(start).getTime() - 24 * 60 * 60 * 1000)
              break
            case '1week':
              reminderDate = new Date(new Date(start).getTime() - 7 * 24 * 60 * 60 * 1000)
              break
            default:
              reminderDate = new Date(new Date(start).getTime() - 15 * 60 * 1000)
          }

          await supabase.from('notifications').insert({
            user_id: user.id,
            type: 'event_reminder',
            title: `Reminder: ${title}`,
            content: `Your event "${title}" is starting soon!`,
            metadata: {
              eventId: data.id,
              eventType: type,
              reminderTime,
              scheduledFor: reminderDate.toISOString(),
            },
          })
        }))
      } catch (reminderError) {
        console.error('[Admin Calendar API] Failed to create reminders:', reminderError)
      }
    }

    const color = getCalendarItemColor(
      (kind === 'shift' ? 'shift' : kind) as AdminCalendarKind,
      (priority || 'medium') as AdminCalendarPriority,
    )

    return NextResponse.json({
      success: true,
      event: {
        id: `${type}-${data.id}`,
        title,
        type,
        start: new Date(start),
        end: new Date(end || start),
        color,
        description,
        location,
        priority,
        status: 'upcoming',
        attendees,
        reminders: enableReminders ? reminders : [],
        originalData: data,
      },
    })
  } catch (error) {
    console.error('[Admin Calendar API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
