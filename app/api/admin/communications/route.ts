import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withAdminAuth } from '@/lib/auth/api-auth'

const sendMessageSchema = z.object({
  subject: z.string().min(1),
  content: z.string().min(1),
  message_type: z.enum(['announcement', 'update', 'alert', 'general']).default('general'),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  recipients: z.array(z.string().uuid()).default([]),
  requires_acknowledgment: z.boolean().default(false),
})

export const GET = withAdminAuth(async (request: NextRequest, { supabase }) => {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const type = searchParams.get('type')

    let q = supabase
      .from('team_communications')
      .select('*', { count: 'exact' })

    if (type && type !== 'all') {
      q = q.eq('message_type', type)
    }

    const { data, error, count } = await q
      .order('sent_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('[Admin Communications API] Fetch error:', error)
      return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      messages: data || [],
      total: count || 0,
    })
  } catch (error) {
    console.error('[Admin Communications API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})

export const POST = withAdminAuth(async (request: NextRequest, { supabase, user }) => {
  try {
    const body = await request.json()
    const validated = sendMessageSchema.parse(body)

    const { data, error } = await supabase
      .from('team_communications')
      .insert({
        sender_id: user.id,
        subject: validated.subject,
        content: validated.content,
        message_type: validated.message_type,
        priority: validated.priority,
        recipients: validated.recipients,
        requires_acknowledgment: validated.requires_acknowledgment,
        sent_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error('[Admin Communications API] Insert error:', error)
      return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: data })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 })
    }
    console.error('[Admin Communications API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})

export const PATCH = withAdminAuth(async (request: NextRequest, { supabase, user }) => {
  try {
    const body = await request.json()
    const { id, action } = body

    if (!id) {
      return NextResponse.json({ error: 'Missing message id' }, { status: 400 })
    }

    if (action === 'mark_read') {
      const { data: msg } = await supabase
        .from('team_communications')
        .select('read_by')
        .eq('id', id)
        .single()

      if (!msg) {
        return NextResponse.json({ error: 'Message not found' }, { status: 404 })
      }

      const readBy = Array.isArray(msg.read_by) ? msg.read_by : []
      if (!readBy.includes(user.id)) {
        readBy.push(user.id)
      }

      const { error } = await supabase
        .from('team_communications')
        .update({ read_by: readBy })
        .eq('id', id)

      if (error) {
        return NextResponse.json({ error: 'Failed to mark as read' }, { status: 500 })
      }

      return NextResponse.json({ success: true })
    }

    if (action === 'acknowledge') {
      const { data: msg } = await supabase
        .from('team_communications')
        .select('acknowledged_by')
        .eq('id', id)
        .single()

      if (!msg) {
        return NextResponse.json({ error: 'Message not found' }, { status: 404 })
      }

      const ackedBy = Array.isArray(msg.acknowledged_by) ? msg.acknowledged_by : []
      if (!ackedBy.includes(user.id)) {
        ackedBy.push(user.id)
      }

      const { error } = await supabase
        .from('team_communications')
        .update({ acknowledged_by: ackedBy })
        .eq('id', id)

      if (error) {
        return NextResponse.json({ error: 'Failed to acknowledge' }, { status: 500 })
      }

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('[Admin Communications API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})
