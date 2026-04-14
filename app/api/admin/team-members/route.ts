import { NextRequest, NextResponse } from 'next/server'
import { authenticateApiRequest } from '@/lib/auth/api-auth'

export async function GET(request: NextRequest) {
  const auth = await authenticateApiRequest(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { searchParams } = new URL(request.url)
    const venueId = searchParams.get('venue_id')
    const role = searchParams.get('role')
    const status = searchParams.get('status')

    let query = auth.supabase
      .from('venue_team_members')
      .select(`
        id,
        user_id,
        venue_id,
        role,
        status,
        created_at,
        profiles:user_id (id, full_name, email, avatar_url)
      `)
      .order('created_at', { ascending: false })

    if (venueId) query = query.eq('venue_id', venueId)
    if (role) query = query.eq('role', role)
    if (status) query = query.eq('status', status)

    const { data, error } = await query.limit(200)

    if (error) {
      console.error('[Team Members] GET error:', error)

      const { data: fallback, error: fallbackError } = await auth.supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url, account_type, role')
        .limit(100)

      if (fallbackError) {
        return NextResponse.json({ error: fallbackError.message }, { status: 500 })
      }

      return NextResponse.json({ members: fallback || [], source: 'profiles' })
    }

    return NextResponse.json({ members: data || [] })
  } catch (error: any) {
    console.error('[Team Members] GET exception:', error)
    return NextResponse.json({ error: 'Failed to fetch team members' }, { status: 500 })
  }
}
