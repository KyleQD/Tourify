import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withAdminAuth } from '@/lib/auth/api-auth'

const updateSchema = z.object({
  status: z.enum(['approved', 'rejected'])
})

export const PATCH = withAdminAuth(async (request: NextRequest, { supabase }) => {
  try {
    const { pathname } = new URL(request.url)
    const id = pathname.split('/').slice(-1)[0]
    const body = await request.json()
    const { status } = updateSchema.parse(body)

    const { data, error } = await supabase
      .from('event_vendor_requests')
      .update({ status })
      .eq('id', id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ success: true, request: data })
  } catch (err: any) {
    const msg = err?.message || 'Invalid request'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
})


