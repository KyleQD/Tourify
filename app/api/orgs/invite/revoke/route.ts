import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createRateLimiter, clientKeyFromRequest } from '@/lib/utils/rate-limit'

const revokeSchema = z.object({ inviteId: z.string().uuid() })

export async function POST(request: NextRequest) {
  const parsed = revokeSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'invalid_request' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 })

  const limiter = createRateLimiter({ namespace: 'org-invite-revoke', limit: 20, windowSec: 60 })
  if (!(await limiter.check(`${user.id}:${clientKeyFromRequest(request)}`)).success) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 })
  }

  const { data: revoked, error } = await supabase.rpc('revoke_org_invite', {
    p_invite_id: parsed.data.inviteId,
  })
  if (error) {
    const status = error.message.includes('not_authorized') ? 403 : 400
    return NextResponse.json({ error: status === 403 ? 'not_authorized' : 'revoke_failed' }, { status })
  }
  if (!revoked) return NextResponse.json({ error: 'invite_not_active' }, { status: 409 })
  return NextResponse.json({ ok: true })
}
