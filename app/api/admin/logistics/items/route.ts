import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { hasEntityPermission } from '@/lib/services/rbac'

interface QueryParams {
  eventId?: string | null
  tourId?: string | null
  type?: string | null
}

function parseQuery(request: NextRequest): QueryParams {
  const { searchParams } = new URL(request.url)
  return {
    eventId: searchParams.get('eventId'),
    tourId: searchParams.get('tourId'),
    type: searchParams.get('type')
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const { eventId, tourId, type } = parseQuery(request)

    let query = supabase.from('logistics_tasks').select('*').order('updated_at', { ascending: false })

    if (eventId) query = query.eq('event_id', eventId)
    if (tourId) query = query.eq('tour_id', tourId)
    if (type && type !== 'all') query = query.eq('type', type)

    const { data, error } = await query
    if (error) throw error

    return NextResponse.json({ items: data || [] })
  } catch (error) {
    console.error('[Logistics Items] GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch logistics items' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    const body = await request.json()

    // Map UI payload to DB columns
    let resolvedAssignee: string | null = null
    if (body.assignedTo) {
      const candidate: string = body.assignedTo
      const uuidRegex = /^[0-9a-fA-F-]{36}$/
      if (uuidRegex.test(candidate)) resolvedAssignee = candidate
      else if (candidate.includes('@')) {
        // try to resolve by email
        const { data: user } = await supabase
          .from('profiles')
          .select('id, email')
          .ilike('email', candidate)
          .single()
        if (user) resolvedAssignee = user.id as any
      }
    }

    const payload = {
      event_id: body.eventId || null,
      tour_id: body.tourId || null,
      type: body.type,
      title: body.title,
      description: body.description || null,
      status: body.status || 'pending',
      priority: body.priority || 'medium',
      assigned_to_user_id: resolvedAssignee,
      due_date: body.dueDate || null,
      budget: body.budget ?? null,
      actual_cost: body.actualCost ?? null,
      notes: body.notes || null,
      tags: body.tags || null,
      created_by: body.createdBy || null
    }

    const eventId: string | null = payload.event_id
    const tourIdForPerm: string | null = payload.tour_id
    let allowed = false

    if (eventId) {
      try { allowed = await hasEntityPermission({ userId: user.id, entityType: 'Event', entityId: eventId, permission: 'EDIT_EVENT_LOGISTICS' }) } catch {}
    }

    if (!allowed && tourIdForPerm) {
      try { allowed = await hasEntityPermission({ userId: user.id, entityType: 'Tour', entityId: tourIdForPerm, permission: 'EDIT_EVENT_LOGISTICS' }) } catch {}
    }

    // Allow creation when no event/tour scope is specified (org-level logistics)
    if (!eventId && !tourIdForPerm) allowed = true

    if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { data, error } = await supabase
      .from('logistics_tasks')
      .insert(payload)
      .select('*')
      .single()

    if (error) throw error

    // Notify assignee if present
    if (data?.assigned_to_user_id) {
      await supabase
        .from('notifications')
        .insert({
          user_id: data.assigned_to_user_id,
          type: 'task_assigned',
          title: `New task: ${data.title}`,
          content: data.description || null,
          metadata: { task_id: data.id, event_id: data.event_id }
        })
    }

    return NextResponse.json({ item: data }, { status: 201 })
  } catch (error) {
    console.error('[Logistics Items] POST error:', error)
    return NextResponse.json({ error: 'Failed to create logistics item' }, { status: 500 })
  }
}


