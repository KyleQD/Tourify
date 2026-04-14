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

    if (error) {
      const code = (error as any)?.code
      if (code === '42P01' || code === 'PGRST204' || code === 'PGRST205') {
        return NextResponse.json({ success: true, tours: [] })
      }
      console.error('[Admin Tours API] Query error:', error)
      return NextResponse.json({ success: true, tours: [] })
    }

    return NextResponse.json({ success: true, tours: data || [] })
  } catch (error) {
    console.error('[Admin Tours API] Error:', error)
    return NextResponse.json({ success: true, tours: [] })
  }
})
