import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/auth/api-auth'

export const POST = withAdminAuth(async (req: NextRequest, { supabase }) => {
  const body = await req.json()
  const { tour_id, event_id, ordinal } = body
  if (!tour_id || !event_id)
    return NextResponse.json({ error: 'tour_id and event_id required' }, { status: 400 })

  const { data, error } = await supabase
    .from('tour_events')
    .insert({ tour_id, event_id, ordinal: ordinal ?? null })
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ data })
})

export const DELETE = withAdminAuth(async (req: NextRequest, { supabase }) => {
  const params = new URL(req.url).searchParams
  const tourId = params.get('tour_id')
  const eventId = params.get('event_id')
  if (!tourId || !eventId)
    return NextResponse.json({ error: 'tour_id and event_id required' }, { status: 400 })

  const { error } = await supabase
    .from('tour_events')
    .delete()
    .eq('tour_id', tourId)
    .eq('event_id', eventId)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
})
