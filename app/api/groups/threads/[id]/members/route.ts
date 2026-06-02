import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { parseUserFromRequestCookieHeader } from '@/lib/supabase/tourify-session-cookie'

const threadIdSchema = z.string().uuid({ message: 'Invalid thread id' })
const userIdSchema = z.string().uuid({ message: 'Invalid user id' })

const addMembersSchema = z.object({
  member_ids: z.array(z.string().uuid()).min(1).max(50),
})

const patchSchema = z.object({
  user_id: z.string().uuid(),
  role: z.enum(['owner', 'admin', 'member']),
})

function getThreadIdFromPath(request: NextRequest) {
  const parts = request.nextUrl.pathname.split('/')
  return parts[parts.length - 2]
}

async function getMembership(
  supabase: ReturnType<typeof createServiceRoleClient>,
  threadId: string,
  userId: string,
) {
  const { data } = await supabase
    .from('thread_members')
    .select('thread_id, user_id, role')
    .eq('thread_id', threadId)
    .eq('user_id', userId)
    .is('left_at', null)
    .maybeSingle()

  return data
}

async function countActiveOwners(
  supabase: ReturnType<typeof createServiceRoleClient>,
  threadId: string,
): Promise<number> {
  const { count } = await supabase
    .from('thread_members')
    .select('user_id', { count: 'exact', head: true })
    .eq('thread_id', threadId)
    .eq('role', 'owner')
    .is('left_at', null)
  return count ?? 0
}

export async function POST(request: NextRequest) {
  try {
    const user = parseUserFromRequestCookieHeader(request.headers.get('cookie'))
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const parsedId = threadIdSchema.safeParse(getThreadIdFromPath(request))
    if (!parsedId.success) return NextResponse.json({ error: 'Invalid thread id' }, { status: 400 })

    const supabase = createServiceRoleClient()
    const requesterMembership = await getMembership(supabase, parsedId.data, user.id)
    if (!requesterMembership || (requesterMembership.role !== 'owner' && requesterMembership.role !== 'admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const rawBody = await request.json().catch(() => null)
    const parsedBody = addMembersSchema.safeParse(rawBody)
    if (!parsedBody.success)
      return NextResponse.json(
        { error: 'Invalid request body', details: parsedBody.error.flatten() },
        { status: 400 },
      )

    const records = parsedBody.data.member_ids.map((memberId) => ({
      thread_id: parsedId.data,
      user_id: memberId,
      role: 'member',
      left_at: null,
    }))

    const { error } = await supabase
      .from('thread_members')
      .upsert(records, { onConflict: 'thread_id,user_id' })

    if (error) return NextResponse.json({ error: 'Failed to add members' }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Group members POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = parseUserFromRequestCookieHeader(request.headers.get('cookie'))
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const parsedId = threadIdSchema.safeParse(getThreadIdFromPath(request))
    if (!parsedId.success) return NextResponse.json({ error: 'Invalid thread id' }, { status: 400 })

    const supabase = createServiceRoleClient()
    const requesterMembership = await getMembership(supabase, parsedId.data, user.id)
    if (!requesterMembership || requesterMembership.role !== 'owner') {
      return NextResponse.json({ error: 'Only owners can change member roles' }, { status: 403 })
    }

    const rawBody = await request.json().catch(() => null)
    const parsedBody = patchSchema.safeParse(rawBody)
    if (!parsedBody.success)
      return NextResponse.json(
        { error: 'Invalid request body', details: parsedBody.error.flatten() },
        { status: 400 },
      )

    const { user_id: targetUserId, role } = parsedBody.data

    if (targetUserId === user.id && role !== 'owner') {
      const ownerCount = await countActiveOwners(supabase, parsedId.data)
      if (ownerCount <= 1) {
        return NextResponse.json(
          { error: 'Promote another member to owner before demoting yourself' },
          { status: 409 },
        )
      }
    }

    const { error } = await supabase
      .from('thread_members')
      .update({ role })
      .eq('thread_id', parsedId.data)
      .eq('user_id', targetUserId)
      .is('left_at', null)

    if (error) return NextResponse.json({ error: 'Failed to update member role' }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Group members PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = parseUserFromRequestCookieHeader(request.headers.get('cookie'))
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const parsedId = threadIdSchema.safeParse(getThreadIdFromPath(request))
    if (!parsedId.success) return NextResponse.json({ error: 'Invalid thread id' }, { status: 400 })

    const supabase = createServiceRoleClient()
    const requesterMembership = await getMembership(supabase, parsedId.data, user.id)
    if (!requesterMembership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const rawUserId = request.nextUrl.searchParams.get('user_id')
    const parsedUserId = userIdSchema.safeParse(rawUserId)
    if (!parsedUserId.success) return NextResponse.json({ error: 'Invalid user id' }, { status: 400 })

    const canManageOthers = requesterMembership.role === 'owner' || requesterMembership.role === 'admin'
    if (parsedUserId.data !== user.id && !canManageOthers) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const targetMembership = await getMembership(supabase, parsedId.data, parsedUserId.data)
    if (targetMembership?.role === 'owner') {
      const ownerCount = await countActiveOwners(supabase, parsedId.data)
      if (ownerCount <= 1) {
        return NextResponse.json(
          { error: 'Transfer ownership to another member before leaving' },
          { status: 409 },
        )
      }
    }

    const { error } = await supabase
      .from('thread_members')
      .update({ left_at: new Date().toISOString() })
      .eq('thread_id', parsedId.data)
      .eq('user_id', parsedUserId.data)
      .is('left_at', null)

    if (error) return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Group members DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
