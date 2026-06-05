import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/auth/api-auth'

export const GET = withAdminAuth(async (req: NextRequest, { supabase }) => {
  const teamId = new URL(req.url).searchParams.get('team_id')
  if (!teamId) return NextResponse.json({ error: 'team_id required' }, { status: 400 })

  const { data, error } = await supabase
    .from('tour_team_members')
    .select('*')
    .eq('team_id', teamId)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ data: data ?? [] })
})

export const POST = withAdminAuth(async (req: NextRequest, { supabase }) => {
  const body = await req.json()
  const { team_id, user_id, profile, role } = body
  if (!team_id || (!user_id && !profile))
    return NextResponse.json({ error: 'team_id and (user_id or profile) required' }, { status: 400 })

  const { data, error } = await supabase
    .from('tour_team_members')
    .insert({ team_id, user_id: user_id ?? null, profile: profile ?? null, role: role ?? null })
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ data })
})

export const DELETE = withAdminAuth(async (req: NextRequest, { supabase }) => {
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { error } = await supabase.from('tour_team_members').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
})
