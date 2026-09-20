import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createHash } from 'crypto'
import { createRateLimiter, clientKeyFromRequest } from '@/lib/utils/rate-limit'

export async function POST(req: NextRequest) {
  const { token } = await req.json()
  if (!token) return NextResponse.json({ error: 'missing_token' }, { status: 400 })
  const supabase = await createClient()
  const { data: user } = await supabase.auth.getUser()
  if (!user?.user) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 })

  const limiter = createRateLimiter({ namespace: 'org-invite-accept', limit: 10, windowSec: 60 })
  if (!(await limiter.check(`${user.user.id}:${clientKeyFromRequest(req)}`)).success)
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 })

  const tokenHash = createHash('sha256').update(token).digest('hex')
  const { data: result, error } = await supabase.rpc('accept_org_invite', { p_token_hash: tokenHash })
  if (error) {
    const code = error.message.includes('email_mismatch') ? 'email_mismatch' : 'invalid_token'
    return NextResponse.json({ error: code }, { status: code === 'email_mismatch' ? 403 : 400 })
  }

  const accepted = result as { organizer_account_id?: string | null } | null

  return NextResponse.json({
    ok: true,
    redirectTo: '/admin/dashboard',
    organizerAccountId: accepted?.organizer_account_id || null,
  })
}
