import { NextRequest, NextResponse } from 'next/server'
import { authenticateApiRequest } from '@/lib/auth/api-auth'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const auth = await authenticateApiRequest(request)
    let userId: string | null = null
    if (auth) {
      userId = auth.user.id
    }
    const supabase = await createClient()
    const { slug } = await context.params

    const { data: forum } = await supabase
      .from('forums')
      .select('id, slug, name, description')
      .eq('slug', slug)
      .maybeSingle()
    if (!forum) return NextResponse.json({ error: 'Forum not found' }, { status: 404 })

    const { count: subscribers } = await supabase
      .from('forum_subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('forum_id', forum.id)

    let is_subscribed = false
    if (userId) {
      const { count } = await supabase
        .from('forum_subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('forum_id', forum.id)
        .eq('user_id', userId)
      is_subscribed = (count || 0) > 0
    }

    return NextResponse.json({ forum: { ...forum, subscribers: subscribers || 0, is_subscribed } })
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


