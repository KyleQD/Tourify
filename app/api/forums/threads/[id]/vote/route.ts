import { withAuth } from '@/lib/auth/api-auth'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  return withAuth(async (_request, { supabase, user }) => {
  try {
    if (!id) return NextResponse.json({ error: 'Missing thread id' }, { status: 400 })

    const payload = await request.json()
    const value = Number(payload?.value)
    if (![1, -1].includes(value)) return NextResponse.json({ error: 'Invalid vote value' }, { status: 400 })

    const { error } = await supabase
      .from('forum_votes')
      .upsert({ user_id: user.id, thread_id: id, value }, { onConflict: 'user_id,thread_id' })
    if (error) return NextResponse.json({ error: 'Failed to vote' }, { status: 400 })

    const { data: thread } = await supabase
      .from('forum_threads')
      .select('id, score, comments_count, created_at')
      .eq('id', id)
      .single()

    return NextResponse.json({ success: true, thread })
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  })(request)
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  return withAuth(async (_request, { supabase, user }) => {
  try {
    if (!id) return NextResponse.json({ error: 'Missing thread id' }, { status: 400 })

    const { error } = await supabase
      .from('forum_votes')
      .delete()
      .eq('user_id', user.id)
      .eq('thread_id', id)
    if (error) return NextResponse.json({ error: 'Failed to remove vote' }, { status: 400 })

    const { data: thread } = await supabase
      .from('forum_threads')
      .select('id, score, comments_count, created_at')
      .eq('id', id)
      .single()

    return NextResponse.json({ success: true, thread })
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  })(request)
}


