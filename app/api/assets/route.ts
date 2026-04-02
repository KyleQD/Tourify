import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api-auth'

export const dynamic = 'force-dynamic'

export const GET = withAuth(async (request: NextRequest, { supabase, user }) => {
  try {
    const url = new URL(request.url)
    const ownerType = url.searchParams.get('ownerType')
    const ownerId = url.searchParams.get('ownerId')
    if (!ownerType || !ownerId) return NextResponse.json({ assets: [] })

    const { data: canManage, error: permissionError } = await supabase.rpc('has_entity_permission', {
      p_user_id: user.id,
      p_entity_type: ownerType,
      p_entity_id: ownerId,
      p_permission_name: 'MANAGE_ASSETS'
    })
    if (permissionError) return NextResponse.json({ error: permissionError.message }, { status: 400 })
    if (!canManage) return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })

    const { data, error } = await supabase
      .from('equipment_assets')
      .select('*')
      .eq('owner_type', ownerType)
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ assets: data ?? [] })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to load assets' }, { status: 500 })
  }
})

export const POST = withAuth(async (request: NextRequest, { supabase, user }) => {
  try {
    const body = await request.json()
    const { ownerType, ownerId, name, category, description, serialNumber, metadata } = body || {}
    if (!ownerType || !ownerId || !name) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })

    // Permission: MANAGE_ASSETS on owner scope
    const { data: canManage, error: rpcError } = await supabase.rpc('has_entity_permission', {
      p_user_id: user.id,
      p_entity_type: ownerType,
      p_entity_id: ownerId,
      p_permission_name: 'MANAGE_ASSETS'
    })
    if (rpcError) return NextResponse.json({ error: rpcError.message }, { status: 400 })
    if (!canManage) return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })

    const { data, error } = await supabase
      .from('equipment_assets')
      .insert({
        owner_type: ownerType,
        owner_id: ownerId,
        name,
        category: category ?? null,
        description: description ?? null,
        serial_number: serialNumber ?? null,
        metadata: metadata ?? null
      })
      .select('*')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ asset: data })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to create asset' }, { status: 500 })
  }
})


