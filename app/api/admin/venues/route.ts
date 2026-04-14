import { NextRequest, NextResponse } from 'next/server'
import { authenticateApiRequest } from '@/lib/auth/api-auth'

export async function GET(request: NextRequest) {
  const auth = await authenticateApiRequest(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { data: venues } = await auth.supabase
      .from('venue_profiles')
      .select('id, venue_name, city, state')
      .limit(100)

    return NextResponse.json({
      venues: (venues || []).map((v: any) => ({ id: v.id, name: v.venue_name, city: v.city, state: v.state }))
    })
  } catch {
    return NextResponse.json({ venues: [] }, { status: 200 })
  }
}


