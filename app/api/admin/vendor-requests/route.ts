import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withAdminAuth } from '@/lib/auth/api-auth'

const createSchema = z.object({
  event_id: z.string().uuid('Invalid event_id'),
  job_posting_template_id: z.string().uuid('Invalid job_posting_template_id'),
  vendor_org_id: z.string().uuid('Invalid vendor_org_id').optional(),
  message: z.string().max(2000).optional()
})

export const POST = withAdminAuth(async (request: NextRequest, { user, supabase }) => {
  try {
    const body = await request.json()
    const validated = createSchema.parse(body)

    const { data, error } = await supabase
      .from('event_vendor_requests')
      .insert({
        event_id: validated.event_id,
        job_posting_template_id: validated.job_posting_template_id,
        vendor_org_id: validated.vendor_org_id ?? null,
        created_by: user.id,
        status: 'pending',
        message: validated.message ?? null
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ success: true, request: data })
  } catch (err: any) {
    const msg = err?.message || 'Invalid request'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
})


