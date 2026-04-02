import { withAuth } from '@/lib/auth/api-auth'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params
  return withAuth(async (_request, { supabase, user }) => {
  try {
    if (!slug) return NextResponse.json({ error: 'Missing forum slug' }, { status: 400 })

    const { data: forum } = await supabase
      .from('forums')
      .select('id')
      .eq('slug', slug)
      .maybeSingle()

    if (!forum) return NextResponse.json({ error: 'Forum not found' }, { status: 404 })

    const { error } = await supabase
      .from('forum_subscriptions')
      .upsert({ forum_id: forum.id, user_id: user.id }, { onConflict: 'forum_id,user_id' })

    if (error) return NextResponse.json({ error: 'Failed to subscribe' }, { status: 400 })
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  })(request)
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params
  return withAuth(async (_request, { supabase, user }) => {
  try {
    if (!slug) return NextResponse.json({ error: 'Missing forum slug' }, { status: 400 })

    const { data: forum } = await supabase
      .from('forums')
      .select('id')
      .eq('slug', slug)
      .maybeSingle()

    if (!forum) return NextResponse.json({ error: 'Forum not found' }, { status: 404 })

    const { error } = await supabase
      .from('forum_subscriptions')
      .delete()
      .eq('forum_id', forum.id)
      .eq('user_id', user.id)

    if (error) return NextResponse.json({ error: 'Failed to unsubscribe' }, { status: 400 })
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  })(request)
}


