import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/auth/api-auth'

export const GET = withAdminAuth(async (req: NextRequest, { supabase }) => {
  const tourId = new URL(req.url).searchParams.get('tour_id')
  if (!tourId) return NextResponse.json({ error: 'tour_id required' }, { status: 400 })

  const { data, error } = await supabase
    .from('tour_teams')
    .select('*')
    .eq('tour_id', tourId)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ data: data ?? [] })
})

export const POST = withAdminAuth(async (req: NextRequest, { supabase }) => {
  const body = await req.json()
  const { tour_id, name, team_type } = body
  if (!tour_id || !name)
    return NextResponse.json({ error: 'tour_id and name required' }, { status: 400 })

  const { data, error } = await supabase
    .from('tour_teams')
    .insert({ tour_id, name, team_type: team_type ?? null })
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ data })
})

export const DELETE = withAdminAuth(async (req: NextRequest, { supabase }) => {
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { error } = await supabase.from('tour_teams').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
})
