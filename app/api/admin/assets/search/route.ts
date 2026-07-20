import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withAdminCapability } from '@/lib/auth/api-auth'

const querySchema = z.string().trim().min(2).max(120).transform(value => value.replace(/[,()%]/g, ' '))
const ownerTypeSchema = z.string().trim().min(1).max(80).regex(/^[A-Za-z][A-Za-z0-9_-]*$/)

export const GET = withAdminCapability('logistics.manage', async (request: NextRequest, { supabase }) => {
  try {
    const url = new URL(request.url)
    const rawQuery = url.searchParams.get('q') || ''
    const q = rawQuery.trim().length >= 2 ? querySchema.parse(rawQuery) : ''
    const ownerType = url.searchParams.get('ownerType')
    const ownerId = url.searchParams.get('ownerId')
    if (ownerType) ownerTypeSchema.parse(ownerType)
    if (ownerId) z.string().uuid().parse(ownerId)
    const parsedLimit = Number.parseInt(url.searchParams.get('limit') || '10', 10)
    const limit = Number.isFinite(parsedLimit) ? Math.max(1, Math.min(parsedLimit, 50)) : 10

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
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid search query', details: error.issues }, { status: 400 })
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to search assets' }, { status: 500 })
  }
})

