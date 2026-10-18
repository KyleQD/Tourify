import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

export const dynamic = 'force-dynamic'

const requestSchema = z.object({
  accountId: z.string().uuid(),
  subscriptionId: z.string().regex(/^sub_[A-Za-z0-9]+$/),
  decision: z.enum(['grant', 'revoke']),
  reason: z.string().trim().min(10).max(2000),
}).strict()

const accountTables: Record<string, string> = {
  artist: 'artist_profiles',
  venue: 'venue_profiles',
  organization: 'organizer_accounts',
}

function reply(body: Record<string, unknown>, status: number) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } })
}

/**
 * Assigns (or revokes) ONE paid hiring entitlement to ONE professional account.
 * Disabled by default. Requires admin-only protected app_metadata, not client
 * account flags. Needs the work_hiring_entitlement_events audit + DB trigger
 * from the reviewed schema proposal; not a substitute for Stripe webhooks.
 *
 * The DB trigger rechecks ownership, subscription period, price eligibility,
 * and UNIQUE single-employer assignment in a transaction.
 */
export async function POST(request: NextRequest) {
  if (process.env.WORK_HIRING_BILLING_V1_ENABLED !== 'true')
    return reply({ success: false, error: 'Not found' }, 404)

  const origin = request.headers.get('origin')
  if (!origin || origin !== request.nextUrl.origin)
    return reply({ success: false, error: 'Forbidden origin' }, 403)

  try {
    const auth = await createClient()
    const { data: { user }, error } = await auth.auth.getUser()
    if (error || !user)
      return reply({ success: false, error: 'Unauthorized' }, 401)

    const db = createServiceRoleClient()
    const reviewer = await db.auth.admin.getUserById(user.id)
    if (reviewer.error || reviewer.data?.user?.app_metadata?.work_hiring_billing_admin !== true)
      return reply({ success: false, error: 'Billing administrator required' }, 403)

    const body = requestSchema.safeParse(await request.json().catch(() => null))
    if (!body.success)
      return reply({ success: false, error: 'Invalid entitlement decision request' }, 400)

    const { accountId, subscriptionId, decision, reason } = body.data
    const { data: account, error: accountError } = await db
      .from('accounts')
      .select('id, owner_user_id, account_type, profile_table, is_active')
      .eq('id', accountId)
      .maybeSingle()
    if (accountError)
      return reply({ success: false, error: 'Employer lookup unavailable' }, 503)
    if (!account || account.is_active !== true ||
        accountTables[account.account_type] !== account.profile_table)
      return reply({ success: false, error: 'Eligible professional account not found' }, 404)

    if (decision === 'grant') {
      const { data: subscription, error: subscriptionError } = await db
        .from('subscriptions')
        .select('user_id, status, stripe_price_id, current_period_end')
        .eq('stripe_subscription_id', subscriptionId)
        .maybeSingle()

      if (subscriptionError)
        return reply({ success: false, error: 'Subscription lookup unavailable' }, 503)
      if (!subscription || subscription.user_id !== account.owner_user_id ||
          subscription.status !== 'active' ||
          !subscription.current_period_end ||
          new Date(subscription.current_period_end).getTime() <= Date.now())
        return reply({ success: false, error: 'Subscription is not eligible for this account' }, 409)

      const { data: plan, error: planError } = await db
        .from('work_hiring_plans')
        .select('stripe_price_id, allowed_account_types, active_listing_limit')
        .eq('stripe_price_id', subscription.stripe_price_id)
        .eq('enabled', true)
        .maybeSingle()
      if (planError)
        return reply({ success: false, error: 'Hiring plan lookup unavailable' }, 503)
      if (!plan || !Array.isArray(plan.allowed_account_types) ||
          !plan.allowed_account_types.includes(account.account_type) ||
          !Number.isSafeInteger(plan.active_listing_limit) || plan.active_listing_limit <= 0)
        return reply({ success: false, error: 'Subscription plan does not include hiring' }, 409)
    }

    // Transactional database trigger checks all critical grants again.
    // A conflicting active assignment will fail without writing an audit event.
    const { data: audit, error: insertError } = await db
      .from('work_hiring_entitlement_events')
      .insert({
        account_id: accountId,
        stripe_subscription_id: subscriptionId,
        billing_admin_user_id: user.id,
        decision,
        reason,
      })
      .select('id')
      .single()
    if (insertError || !audit?.id) {
      console.error('[WorkHiringBilling] Transaction rejected', insertError)
      return reply({ success: false, error: 'Entitlement decision could not be recorded' }, 409)
    }

    return reply({
      success: true,
      accountId,
      subscriptionId,
      decision,
      auditEventId: audit.id,
    }, 200)
  } catch (error) {
    console.error('[WorkHiringBilling] Unexpected failure', error)
    return reply({ success: false, error: 'Billing review unavailable' }, 503)
  }
}
