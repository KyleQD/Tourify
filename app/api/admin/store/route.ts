import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/auth/api-auth'
import { z } from 'zod'

const createSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  price: z.number().min(0),
  category: z.string().default('merch'),
  product_type: z.string().default('physical'),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
  inventory_count: z.number().int().default(0),
  images: z.array(z.string()).default([]),
  variants: z.array(z.any()).default([]),
})

export const GET = withAdminAuth(async (request: NextRequest, { supabase, user }) => {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200)
  const offset = parseInt(searchParams.get('offset') || '0', 10)

  try {
    let query = supabase
      .from('marketplace_listings')
      .select('id, title, description, price, category, product_type, status, created_at, inventory_count, images, variants', { count: 'exact' })
      .eq('seller_user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status) query = query.eq('status', status)

    const { data, error, count } = await query

    if (error) {
      if (error.code === '42P01') return NextResponse.json({ listings: [], total: 0 })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ listings: data || [], total: count || 0 })
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})

export const POST = withAdminAuth(async (request: NextRequest, { supabase, user }) => {
  try {
    const body = await request.json()
    const validated = createSchema.parse(body)

    const { data, error } = await supabase
      .from('marketplace_listings')
      .insert({ ...validated, seller_user_id: user.id })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ listing: data }, { status: 201 })
  } catch (err: any) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: 'Validation error', details: err.errors }, { status: 400 })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})

export const PATCH = withAdminAuth(async (request: NextRequest, { supabase, user }) => {
  try {
    const body = await request.json()
    const { id, ...updates } = body
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    // Soft delete via status
    if (updates.delete) {
      const { data: existing } = await supabase.from('marketplace_orders').select('id').eq('listing_id', id).limit(1).maybeSingle()
      if (existing) {
        // Has orders — soft delete only
        await supabase.from('marketplace_listings').update({ status: 'archived', updated_at: new Date().toISOString() }).eq('id', id).eq('seller_user_id', user.id)
        return NextResponse.json({ success: true, soft_deleted: true })
      }
      await supabase.from('marketplace_listings').delete().eq('id', id).eq('seller_user_id', user.id)
      return NextResponse.json({ success: true })
    }

    const { data, error } = await supabase
      .from('marketplace_listings')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('seller_user_id', user.id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ listing: data })
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})
