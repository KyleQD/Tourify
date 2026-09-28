import { NextRequest, NextResponse } from 'next/server'
import { withAdminCapability } from '@/lib/auth/api-auth'
import { z } from 'zod'

const createSchema = z.object({
  name: z.string().min(1),
  vendor_type: z.string().optional(),
  contact_name: z.string().optional(),
  contact_email: z.string().email().optional(),
  contact_phone: z.string().optional(),
  website: z.string().url().optional().nullable(),
  notes: z.string().optional(),
})

export const GET = withAdminCapability('logistics.view', async (request: NextRequest, { supabase }) => {
  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search') || ''
  const vendorType = searchParams.get('vendor_type')
  const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10), 200)

  try {
    let query = supabase
      .from('logistics_vendors')
      .select('*')
      .order('name', { ascending: true })
      .limit(limit)

    if (vendorType) query = query.eq('vendor_type', vendorType)
    if (search) query = query.ilike('name', `%${search}%`)

    const { data, error } = await query

    if (error) {
      // Table may not exist yet — return empty
      if (error.code === '42P01') return NextResponse.json({ vendors: [] })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ vendors: data || [] })
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})

export const POST = withAdminCapability('logistics.manage', async (request: NextRequest, { supabase, user }) => {
  try {
    const body = await request.json()
    const validated = createSchema.parse(body)

    const { data, error } = await supabase
      .from('logistics_vendors')
      .insert({ ...validated, created_by: user.id })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ vendor: data }, { status: 201 })
  } catch (err: any) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: 'Validation error', details: err.errors }, { status: 400 })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})
