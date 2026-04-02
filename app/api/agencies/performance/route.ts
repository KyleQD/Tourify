import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/auth/api-auth'

export const dynamic = 'force-dynamic'

export const GET = withAdminAuth(async (_request: NextRequest, { supabase }) => {
  try {
    const { data, error } = await supabase
      .from('performance_agencies')
      .select('*')
      .order('name', { ascending: true })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ agencies: data ?? [] })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to load agencies' }, { status: 500 })
  }
})

export const POST = withAdminAuth(async (request: NextRequest, { supabase }) => {
  try {
    const body = await request.json()
    const { name, description } = body || {}
    if (!name) return NextResponse.json({ error: 'Missing name' }, { status: 400 })
    const { data, error } = await supabase
      .from('performance_agencies')
      .insert({ name, description: description ?? null })
      .select('*')
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ agency: data })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to create agency' }, { status: 500 })
  }
})


