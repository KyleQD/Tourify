import { NextRequest, NextResponse } from 'next/server'
import { authenticateApiRequest } from '@/lib/auth/api-auth'

export async function GET(request: NextRequest) {
  const auth = await authenticateApiRequest(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const status = searchParams.get('status')

    let query = auth.supabase
      .from('events')
      .select('*')
      .eq('user_id', auth.user.id)
      .order('date', { ascending: true })

    if (startDate) query = query.gte('date', startDate)
    if (endDate) query = query.lte('date', endDate)
    if (status) query = query.eq('status', status)

    const { data, error } = await query.limit(200)

    if (error) {
      console.error('[Event Planner] GET error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ events: data || [] })
  } catch (error: any) {
    console.error('[Event Planner] GET exception:', error)
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await authenticateApiRequest(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const { action, event_id, ...eventData } = body

    if (action === 'publish') {
      if (!event_id) {
        return NextResponse.json({ error: 'event_id is required for publish' }, { status: 400 })
      }

      const { data, error } = await auth.supabase
        .from('events')
        .update({ status: 'published', published_at: new Date().toISOString() })
        .eq('id', event_id)
        .eq('user_id', auth.user.id)
        .select()
        .single()

      if (error) {
        console.error('[Event Planner] publish error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ event: data, message: 'Event published' })
    }

    const { data, error } = await auth.supabase
      .from('events')
      .insert({ ...eventData, user_id: auth.user.id })
      .select()
      .single()

    if (error) {
      console.error('[Event Planner] POST error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ event: data }, { status: 201 })
  } catch (error: any) {
    console.error('[Event Planner] POST exception:', error)
    return NextResponse.json({ error: 'Failed to process event request' }, { status: 500 })
  }
}
