import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

export const dynamic = 'force-dynamic'

const requestSchema = z.object({
  accountId: z.string().uuid(),
  decision: z.enum(['approved', 'rejected', 'revoked']),
  reason: z.string().trim().min(10).max(2000),
  expiresAt: z.string().datetime({ offset: true }).nullable().optional(),
}).strict()

const allowedProfessionalAccounts: Record<string, string> = {
  artist: 'artist_profiles',
  venue: 'venue_profiles',
  organization: 'organizer_accounts',
}

function response(body: Record<string, unknown>, status: number) {
  return NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'private, no-store' },
  })
}

/**
 * Feature-flagged administrative employer review.
 *
 * Works only after the approved protected-table DDL and immutable review
 * trigger exist. NOT a public user verification request or self-service flow.
 * Caller is authenticated from cookies; reviewer privilege is checked from
 * protected auth.users.app_metadata with a service-role client.
 *
 * A signed-in user cannot elevate approval by manipulating profiles,
 * accounts.is_verified, verification_requests, or request-body role values.
 */
export async function POST(request: NextRequest) {
  if (process.env.WORK_EMPLOYER_REVIEW_V1_ENABLED !== 'true')
    return response({ success: false, error: 'Not found' }, 404)

  // Fail closed for cross-origin browser requests, even with valid cookies.
  const origin = request.headers.get('origin')
  if (!origin || origin !== request.nextUrl.origin)
    return response({ success: false, error: 'Forbidden origin' }, 403)

  try {
    const auth = await createClient()
    const { data: { user }, error: authError } = await auth.auth.getUser()
    if (authError || !user) return response({ success: false, error: 'Unauthorized' }, 401)

    const db = createServiceRoleClient()
    const reviewer = await db.auth.admin.getUserById(user.id)
    if (reviewer.error || !reviewer.data?.user ||
        reviewer.data.user.app_metadata?.work_employer_reviewer !== true)
      return response({ success: false, error: 'Reviewer access required' }, 403)

    const parsed = requestSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success)
      return response({ success: false, error: 'Invalid employer review request' }, 400)

    const { accountId, decision, reason, expiresAt } = parsed.data
    if (decision === 'approved' && expiresAt && new Date(expiresAt).getTime() <= Date.now())
      return response({ success: false, error: 'Approval expiration must be in the future' }, 400)
    if (decision !== 'approved' && expiresAt)
      return response({ success: false, error: 'Expiration is only valid for approval' }, 400)

    const { data: account, error: accountError } = await db
      .from('accounts')
      .select('id, account_type, profile_table, is_active')
      .eq('id', accountId)
      .maybeSingle()

    if (accountError) {
      console.error('[WorkEmployerReview] Account lookup failed', accountError)
      return response({ success: false, error: 'Review unavailable' }, 503)
    }
    if (!account || account.is_active !== true ||
        allowedProfessionalAccounts[account.account_type] !== account.profile_table)
      return response({ success: false, error: 'Eligible professional account not found' }, 404)

    // Only this immutable event is written. The AFTER INSERT database trigger
    // applies the account approval in the SAME DB transaction; on error both
    // operations roll back. No separate non-atomic upsert is performed here.
    const { data: reviewEvent, error: insertError } = await db
      .from('work_employer_review_events')
      .insert({
        account_id: accountId,
        reviewer_user_id: user.id,
        decision,
        reason,
        expires_at: decision === 'approved' ? (expiresAt ?? null) : null,
      })
      .select('id')
      .single()

    if (insertError || !reviewEvent?.id) {
      console.error('[WorkEmployerReview] Review event insert failed', insertError)
      return response({ success: false, error: 'Review could not be recorded' }, 503)
    }

    return response({
      success: true,
      accountId,
      decision,
      reviewEventId: reviewEvent.id,
    }, 200)
  } catch (error) {
    console.error('[WorkEmployerReview] Unexpected failure', error)
    return response({ success: false, error: 'Review unavailable' }, 503)
  }
}
