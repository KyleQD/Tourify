import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/auth/api-auth'

export const GET = withAdminAuth(async (request: NextRequest, { supabase }) => {
  try {
    const { searchParams } = new URL(request.url)
    const orgId = searchParams.get('org_id') || undefined

    let query = supabase
      .from('tours')
      .select('*')
      .order('start_date', { ascending: true })

    if (orgId) query = query.eq('org_id', orgId)

    const { data, error } = await query
    if (error) throw error

    return NextResponse.json({ success: true, tours: data || [] })
  } catch (error) {
    console.error('[Admin Tours API] Error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch tours', tours: [] }, { status: 500 })
  }
})
