import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/auth/api-auth'

export const GET = withAdminAuth(async (request: NextRequest, { supabase }) => {
  try {
    const url = new URL(request.url)
    const q = url.searchParams.get('q') || ''
    const ownerType = url.searchParams.get('ownerType')
    const ownerId = url.searchParams.get('ownerId')
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '10', 10), 50)

    if (!q && !ownerType && !ownerId) return NextResponse.json({ assets: [] })

    let query = supabase
      .from('equipment_assets')
      .select('id, name, category, serial_number, owner_type, owner_id, is_available, metadata')
      .order('updated_at', { ascending: false })
      .limit(limit)

    if (ownerType) query = query.eq('owner_type', ownerType)
    if (ownerId) query = query.eq('owner_id', ownerId)
    if (q) query = query.or(`name.ilike.%${q}%,serial_number.ilike.%${q}%`)

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ assets: data || [] })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to search assets' }, { status: 500 })
  }
})


