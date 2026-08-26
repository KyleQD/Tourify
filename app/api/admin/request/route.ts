import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { authenticateApiRequest } from '@/lib/auth/api-auth'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

/**
 * P3-07 / ADM-M-010 — /admin/request backend.
 * The legacy page previously inserted into admin_requests directly from the
 * browser via the anon client against a table that did not exist in the
 * active chain. Writes now flow through this authenticated endpoint; the
 * table itself was promoted in 20260825131000 with owner-only RLS.
 */

const requestSchema = z.object({
  reason: z.string().trim().min(1).max(2000),
  experience: z.string().trim().max(4000).optional().nullable(),
  references: z.string().trim().max(4000).optional().nullable(),
  organization: z.string().trim().max(200).optional().nullable(),
  role: z.string().trim().max(120).optional().nullable(),
})

export async function POST(request: NextRequest) {
  const auth = await authenticateApiRequest(request)
  if (!auth) return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })

  const parsed = requestSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'A reason is required' }, { status: 400 })
  }

  const svc = createServiceRoleClient()
  const { error } = await svc.from('admin_requests').insert({
    user_id: auth.user.id,
    reason: parsed.data.reason,
    experience: parsed.data.experience ?? null,
    references: parsed.data.references ?? null,
    organization: parsed.data.organization ?? null,
    role: parsed.data.role ?? null,
    status: 'pending',
  })

  if (error) {
    console.error('[Admin Request API] insert failed:', error.message)
    return NextResponse.json({ success: false, error: 'Unable to submit request' }, { status: 503 })
  }

  return NextResponse.json({ success: true })
}
