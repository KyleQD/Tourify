import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { parseUserFromRequestCookieHeader } from '@/lib/supabase/tourify-session-cookie'

const threadIdSchema = z.string().uuid({ message: 'Invalid thread id' })
const patchSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  description: z.string().max(500).optional(),
  is_admin_only: z.boolean().optional(),
})

function getThreadIdFromPath(request: NextRequest) {
  const parts = request.nextUrl.pathname.split('/')
  return parts[parts.length - 1]
}

async function getMembership(supabase: ReturnType<typeof createServiceRoleClient>, threadId: string, userId: string) {
  const { data } = await supabase
    .from('thread_members')
    .select('thread_id, user_id, role, left_at')
    .eq('thread_id', threadId)
    .eq('user_id', userId)
    .is('left_at', null)
    .maybeSingle()

  return data
}

export async function GET(request: NextRequest) {
  try {
    const user = parseUserFromRequestCookieHeader(request.headers.get('cookie'))
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const parsed = threadIdSchema.safeParse(getThreadIdFromPath(request))
    if (!parsed.success) return NextResponse.json({ error: 'Invalid thread id' }, { status: 400 })

    const supabase = createServiceRoleClient()
    const membership = await getMembership(supabase, parsed.data, user.id)
    if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { data: thread, error } = await supabase
      .from('group_threads')
      .select('*')
      .eq('id', parsed.data)
      .single()

    if (error || !thread) return NextResponse.json({ error: 'Thread not found' }, { status: 404 })

    return NextResponse.json({ thread, membership })
  } catch (error) {
    console.error('Group thread GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = parseUserFromRequestCookieHeader(request.headers.get('cookie'))
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const parsed = threadIdSchema.safeParse(getThreadIdFromPath(request))
    if (!parsed.success) return NextResponse.json({ error: 'Invalid thread id' }, { status: 400 })

    const supabase = createServiceRoleClient()
    const membership = await getMembership(supabase, parsed.data, user.id)
    if (!membership || (membership.role !== 'owner' && membership.role !== 'admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const rawBody = await request.json().catch(() => null)
    const parsedBody = patchSchema.safeParse(rawBody)
    if (!parsedBody.success)
      return NextResponse.json(
        { error: 'Invalid request body', details: parsedBody.error.flatten() },
        { status: 400 },
      )

    const updates: Record<string, unknown> = { ...parsedBody.data, updated_at: new Date().toISOString() }

    const { data, error } = await supabase
      .from('group_threads')
      .update(updates)
      .eq('id', parsed.data)
      .select('*')
      .single()

    if (error || !data) return NextResponse.json({ error: 'Failed to update thread' }, { status: 500 })
    return NextResponse.json({ success: true, thread: data })
  } catch (error) {
    console.error('Group thread PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = parseUserFromRequestCookieHeader(request.headers.get('cookie'))
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const parsed = threadIdSchema.safeParse(getThreadIdFromPath(request))
    if (!parsed.success) return NextResponse.json({ error: 'Invalid thread id' }, { status: 400 })

    const supabase = createServiceRoleClient()
    const membership = await getMembership(supabase, parsed.data, user.id)
    if (!membership || membership.role !== 'owner')
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { error } = await supabase.from('group_threads').delete().eq('id', parsed.data)
    if (error) return NextResponse.json({ error: 'Failed to delete thread' }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Group thread DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
