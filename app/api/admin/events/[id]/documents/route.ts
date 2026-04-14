import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withAuth } from '@/lib/auth/api-auth'
import { createClient } from '@supabase/supabase-js'

function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

const documentSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1),
  document_type: z.enum(['general', 'runsheet', 'safety', 'contact_list', 'schedule', 'map_notes', 'technical', 'custom']).default('general'),
  visible_to: z.array(z.enum(['admin', 'manager', 'staff', 'crew', 'vendor', 'all'])).default(['all']),
  pinned: z.boolean().default(false),
})

export const GET = withAuth(async (request: NextRequest, { user }) => {
  try {
    const eventId = request.nextUrl.pathname.split('/')[5]
    const svc = createServiceClient()

    const { data: participant } = await svc
      .from('event_participants')
      .select('id, role')
      .eq('event_id', eventId)
      .eq('user_id', user.id)
      .maybeSingle()

    const { data: eventOwner } = await svc
      .from('events_v2')
      .select('id')
      .eq('id', eventId)
      .eq('created_by', user.id)
      .maybeSingle()

    if (!participant && !eventOwner) {
      return NextResponse.json({ error: 'Not a member of this event' }, { status: 403 })
    }

    const userRole = eventOwner ? 'admin' : (participant?.role || 'staff')

    const { data, error } = await svc
      .from('event_documents')
      .select('*')
      .eq('event_id', eventId)
      .order('pinned', { ascending: false })
      .order('updated_at', { ascending: false })

    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json({
          success: true,
          documents: [],
          userRole,
          _notice: 'event_documents table not yet created'
        })
      }
      console.error('[Event Documents] Fetch error:', error)
      return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 })
    }

    const visibleDocs = (data || []).filter((d: any) => {
      if (!d.visible_to || d.visible_to.includes('all')) return true
      return d.visible_to.includes(userRole)
    })

    return NextResponse.json({ success: true, documents: visibleDocs, userRole })
  } catch (error) {
    console.error('[Event Documents] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})

export const POST = withAuth(async (request: NextRequest, { user }) => {
  try {
    const eventId = request.nextUrl.pathname.split('/')[5]
    const svc = createServiceClient()

    const { data: eventOwner } = await svc
      .from('events_v2')
      .select('id')
      .eq('id', eventId)
      .eq('created_by', user.id)
      .maybeSingle()

    const { data: participant } = await svc
      .from('event_participants')
      .select('role')
      .eq('event_id', eventId)
      .eq('user_id', user.id)
      .maybeSingle()

    const isAdmin = !!eventOwner || participant?.role === 'admin' || participant?.role === 'manager'
    if (!isAdmin) {
      return NextResponse.json({ error: 'Only admins can create documents' }, { status: 403 })
    }

    const body = await request.json()
    const validated = documentSchema.parse(body)

    const { data, error } = await svc
      .from('event_documents')
      .insert({
        event_id: eventId,
        author_id: user.id,
        title: validated.title,
        content: validated.content,
        document_type: validated.document_type,
        visible_to: validated.visible_to,
        pinned: validated.pinned,
      })
      .select()
      .single()

    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json({ success: false, error: 'table not yet created' }, { status: 501 })
      }
      console.error('[Event Documents] Insert error:', error)
      return NextResponse.json({ error: 'Failed to create document' }, { status: 500 })
    }

    return NextResponse.json({ success: true, document: data })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 })
    }
    console.error('[Event Documents] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})

export const PATCH = withAuth(async (request: NextRequest, { user }) => {
  try {
    const eventId = request.nextUrl.pathname.split('/')[5]
    const svc = createServiceClient()
    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: 'Missing document id' }, { status: 400 })
    }

    const { data: eventOwner } = await svc
      .from('events_v2')
      .select('id')
      .eq('id', eventId)
      .eq('created_by', user.id)
      .maybeSingle()

    const { data: participant } = await svc
      .from('event_participants')
      .select('role')
      .eq('event_id', eventId)
      .eq('user_id', user.id)
      .maybeSingle()

    const isAdmin = !!eventOwner || participant?.role === 'admin' || participant?.role === 'manager'
    if (!isAdmin) {
      return NextResponse.json({ error: 'Only admins can edit documents' }, { status: 403 })
    }

    const allowedFields: Record<string, any> = {}
    if (updates.title) allowedFields.title = updates.title
    if (updates.content) allowedFields.content = updates.content
    if (updates.document_type) allowedFields.document_type = updates.document_type
    if (updates.visible_to) allowedFields.visible_to = updates.visible_to
    if (typeof updates.pinned === 'boolean') allowedFields.pinned = updates.pinned
    allowedFields.updated_at = new Date().toISOString()

    const { error } = await svc
      .from('event_documents')
      .update(allowedFields)
      .eq('id', id)
      .eq('event_id', eventId)

    if (error) {
      console.error('[Event Documents] Update error:', error)
      return NextResponse.json({ error: 'Failed to update document' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Event Documents] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})

export const DELETE = withAuth(async (request: NextRequest, { user }) => {
  try {
    const eventId = request.nextUrl.pathname.split('/')[5]
    const { searchParams } = new URL(request.url)
    const docId = searchParams.get('id')
    if (!docId) {
      return NextResponse.json({ error: 'Missing document id' }, { status: 400 })
    }

    const svc = createServiceClient()

    const { data: eventOwner } = await svc
      .from('events_v2')
      .select('id')
      .eq('id', eventId)
      .eq('created_by', user.id)
      .maybeSingle()

    if (!eventOwner) {
      return NextResponse.json({ error: 'Only event admin can delete documents' }, { status: 403 })
    }

    await svc.from('event_documents').delete().eq('id', docId).eq('event_id', eventId)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Event Documents] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})
