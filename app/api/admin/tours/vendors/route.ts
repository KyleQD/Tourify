import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/auth/api-auth'

export const GET = withAdminAuth(async (req: NextRequest, { supabase }) => {
  const tourId = new URL(req.url).searchParams.get('tour_id')
  if (!tourId) return NextResponse.json({ error: 'tour_id required' }, { status: 400 })

  const { data, error } = await supabase
    .from('tour_vendors')
    .select('*')
    .eq('tour_id', tourId)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ data: data ?? [] })
})

export const POST = withAdminAuth(async (req: NextRequest, { supabase }) => {
  const body = await req.json()
  const { tour_id, vendor_account_id, vendor_name, service_type, contact } = body
  if (!tour_id || (!vendor_account_id && !vendor_name))
    return NextResponse.json({ error: 'tour_id and (vendor_account_id or vendor_name) required' }, { status: 400 })

  const { data, error } = await supabase
    .from('tour_vendors')
    .insert({ tour_id, vendor_account_id: vendor_account_id ?? null, vendor_name: vendor_name ?? null, service_type: service_type ?? null, contact: contact ?? null })
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ data })
})

export const DELETE = withAdminAuth(async (req: NextRequest, { supabase }) => {
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { error } = await supabase.from('tour_vendors').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
})
