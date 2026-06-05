import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api-auth'
import { createClient } from '@supabase/supabase-js'

function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

export interface EventHQPermissions {
  can_post_bulletins: boolean
  can_add_resources: boolean
  can_edit_calendar: boolean
  can_manage_tasks: boolean
  can_manage_team: boolean
}

const ADMIN_PERMISSIONS: EventHQPermissions = {
  can_post_bulletins: true,
  can_add_resources: true,
  can_edit_calendar: true,
  can_manage_tasks: true,
  can_manage_team: true,
}

const VIEWER_PERMISSIONS: EventHQPermissions = {
  can_post_bulletins: false,
  can_add_resources: false,
  can_edit_calendar: false,
  can_manage_tasks: false,
  can_manage_team: false,
}

async function resolveUserRole(svc: any, eventId: string, userId: string) {
  const { data: event } = await svc
    .from('events_v2')
    .select('id, title, start_at, end_at, venue_id, status, created_by, settings')
    .eq('id', eventId)
    .single()

  if (!event) return { event: null, role: null, permissions: VIEWER_PERMISSIONS }

  if (event.created_by === userId) {
    return { event, role: 'admin' as const, permissions: ADMIN_PERMISSIONS }
  }

  const { data: participant } = await svc
    .from('event_participants')
    .select('participant_id, participant_type, role, status, metadata')
    .eq('event_id', eventId)
    .eq('participant_id', userId)
    .eq('participant_type', 'Individual')
    .maybeSingle()

  if (participant) {
    const role = participant.role || 'staff'
    const isManager = role === 'admin' || role === 'manager'
    const grantedPermissions = participant.metadata?.hq_permissions as Partial<EventHQPermissions> | undefined

    const permissions: EventHQPermissions = isManager
      ? ADMIN_PERMISSIONS
      : {
          can_post_bulletins: grantedPermissions?.can_post_bulletins ?? false,
          can_add_resources: grantedPermissions?.can_add_resources ?? false,
          can_edit_calendar: grantedPermissions?.can_edit_calendar ?? false,
          can_manage_tasks: grantedPermissions?.can_manage_tasks ?? false,
          can_manage_team: grantedPermissions?.can_manage_team ?? false,
        }

    return { event, role, permissions }
  }

  if (event.venue_id) {
    const { data: venueStaff } = await svc
      .from('venue_team_members')
      .select('id, role, user_id')
      .eq('venue_id', event.venue_id)
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle()

    if (venueStaff) {
      const isVenueManager = venueStaff.role === 'admin' || venueStaff.role === 'manager'
      return {
        event,
        role: isVenueManager ? 'manager' : 'staff',
        permissions: isVenueManager ? ADMIN_PERMISSIONS : VIEWER_PERMISSIONS,
      }
    }
  }

  let staffShift: any = null
  try {
    const res = await svc
      .from('event_staff')
      .select('id, role, user_id')
      .eq('event_id', eventId)
      .eq('user_id', userId)
      .maybeSingle()
    staffShift = res.data
  } catch {}

  if (staffShift) {
    return { event, role: staffShift.role || 'staff', permissions: VIEWER_PERMISSIONS }
  }

  // Last resort: check if user is an org member for this event's org (admin access)
  const { data: orgMember } = await svc
    .from('org_members')
    .select('org_id, role')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle()

  if (orgMember?.org_id) {
    const { data: orgEvent } = await svc
      .from('events_v2')
      .select('id')
      .eq('id', eventId)
      .eq('org_id', orgMember.org_id)
      .maybeSingle()

    if (orgEvent) {
      return { event, role: 'admin' as const, permissions: ADMIN_PERMISSIONS }
    }
  }

  return { event: null, role: null, permissions: VIEWER_PERMISSIONS }
}

export const GET = withAuth(async (request: NextRequest, { user }) => {
  try {
    const eventId = request.nextUrl.pathname.split('/').at(-2)!
    const svc = createServiceClient()
    const { event, role, permissions } = await resolveUserRole(svc, eventId, user.id)

    if (!event || !role) {
      return NextResponse.json({ error: 'Not a member of this event' }, { status: 403 })
    }

    const isAdmin = role === 'admin' || role === 'manager'

    const safeQuery = async (query: PromiseLike<{ data: any[] | null }>) => {
      try { return (await query).data || [] } catch { return [] }
    }

    const [bulletins, resources, calendar, team, tasks, eventPostings, eventGroups, eventDocs] = await Promise.all([
      safeQuery(
        svc.from('event_bulletins')
          .select('*')
          .eq('event_id', eventId)
          .order('pinned', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(30)
      ),
      safeQuery(
        svc.from('event_resources')
          .select('*')
          .eq('event_id', eventId)
          .order('pinned', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(50)
      ),
      safeQuery(
        svc.from('event_calendar_items')
          .select('*')
          .eq('event_id', eventId)
          .order('start_time', { ascending: true })
          .limit(100)
      ),
      safeQuery(
        svc.from('event_participants')
          .select('participant_id, participant_type, role, status, metadata, created_at')
          .eq('event_id', eventId)
          .order('created_at', { ascending: true })
          .limit(100)
      ),
      safeQuery(
        svc.from('logistics_tasks')
          .select('*')
          .eq('event_id', eventId)
          .order('due_date', { ascending: true })
          .limit(50)
      ),
      safeQuery(
        svc
          .from('job_posting_templates')
          .select('id,title,status,applications_count,created_at')
          .eq('event_id', eventId)
          .order('created_at', { ascending: false })
          .limit(30)
      ),
      safeQuery(
        svc.from('event_group_chats').select('id,name,group_type').eq('event_id', eventId).limit(30)
      ),
      safeQuery(
        svc.from('event_documents').select('id,title,document_type,visible_to,pinned,created_at').eq('event_id', eventId).limit(50)
      ),
    ])

    const visibleBulletins = bulletins.filter((b: any) => {
      if (!b.visible_to || b.visible_to.includes('all')) return true
      return b.visible_to.includes(role)
    })

    const visibleResources = resources.filter((r: any) => {
      if (!r.visible_to || r.visible_to.includes('all')) return true
      return r.visible_to.includes(role)
    })

    const visibleDocuments = (eventDocs || []).filter((d: any) => {
      if (!d.visible_to || d.visible_to.includes('all')) return true
      return d.visible_to.includes(role)
    })

    const postingIds = (eventPostings || []).map((p: { id: string }) => p.id).filter(Boolean)
    let hiringApplicationsTotal = 0
    if (postingIds.length > 0) {
      try {
        const { count } = await svc
          .from('job_applications')
          .select('id', { count: 'exact', head: true })
          .in('job_posting_id', postingIds)
        hiringApplicationsTotal = count || 0
      } catch {
        hiringApplicationsTotal = 0
      }
    }

    return NextResponse.json({
      success: true,
      event: {
        id: event.id,
        title: event.title,
        start_at: event.start_at,
        end_at: event.end_at,
        venue_id: event.venue_id,
        status: event.status,
        settings: event.settings,
      },
      userRole: role,
      isAdmin,
      permissions,
      bulletins: visibleBulletins,
      resources: visibleResources,
      calendar,
      team,
      tasks,
      hiring: {
        postings: eventPostings || [],
        applications_total: hiringApplicationsTotal,
      },
      group_chats: eventGroups || [],
      documents: visibleDocuments,
    })
  } catch (error) {
    console.error('[Event HQ] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})
