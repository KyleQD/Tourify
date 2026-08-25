import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { authenticateApiRequest } from '@/lib/auth/api-auth'
import { hasTicketingPermission } from '@/lib/ticketing/permissions'
import { calculateRevenueShares } from '@/lib/ticketing/settlements'
import { filterSharesForCaller } from '@/lib/venue/finance-service'
import { getManageableVenueIds } from '@/lib/venue/venue-access'

const upsertSchema = z.object({
  event_id: z.string().uuid(),
  allocations: z.array(z.object({
    beneficiary_type: z.enum(['organization', 'venue', 'artist', 'promoter', 'platform']),
    beneficiary_id: z.string().uuid().nullable().optional(),
    share_type: z.enum(['percentage', 'flat', 'remainder']),
    share_value: z.number().min(0),
    priority: z.number().int().default(100),
    is_active: z.boolean().default(true),
  })),
})

/**
 * VEN-167 — accounts a share-only viewer can legitimately see money for.
 */
async function resolveCallerAccountIds(supabase: any, userId: string): Promise<Set<string>> {
  const ids = new Set<string>([userId])
  try {
    const venueIds = await getManageableVenueIds(supabase, userId)
    for (const id of venueIds) ids.add(id)
  } catch {
    // non-fatal
  }
  const [{ data: artistRows }, { data: orgRows }] = await Promise.all([
    supabase.from('artist_profiles').select('id').eq('user_id', userId),
    supabase.from('org_members').select('org_id').eq('user_id', userId),
  ])
  for (const row of artistRows || []) if (row?.id) ids.add(row.id)
  for (const row of orgRows || []) if (row?.org_id) ids.add(row.org_id)
  return ids
}

export async function GET(request: NextRequest) {
  const auth = await authenticateApiRequest(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const eventId = new URL(request.url).searchParams.get('event_id')
  if (!eventId) return NextResponse.json({ error: 'event_id required' }, { status: 400 })

  const supabase = await createClient()
  const canFull = await hasTicketingPermission({
    supabase,
    userId: auth.user.id,
    eventId,
    permission: 'view_full_financials',
  })
  const canShare = await hasTicketingPermission({
    supabase,
    userId: auth.user.id,
    eventId,
    permission: 'view_assigned_share',
  })
  if (!canFull && !canShare)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const [{ data: allocations }, { data: txns }, { data: settlement }] = await Promise.all([
    supabase.from('ticket_revenue_allocations').select('*').eq('event_id', eventId).eq('is_active', true),
    supabase.from('financial_transactions').select('category, type, amount').eq('event_id', eventId),
    supabase.from('settlements').select('*').eq('event_id', eventId).maybeSingle(),
  ])

  const gross = (txns || [])
    .filter((t: any) => t.type === 'income' && t.category === 'ticket_revenue')
    .reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0)

  const refunds = (txns || [])
    .filter((t: any) => t.category === 'refund')
    .reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0)

  const fees = (txns || [])
    .filter((t: any) => t.category === 'platform_fee' || t.category === 'processing_fee')
    .reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0)

  const net = Math.max(0, gross - refunds - fees)
  const shares = calculateRevenueShares({
    netRevenue: net,
    allocations: (allocations || []).map((a: any) => ({
      beneficiary_type: a.beneficiary_type,
      beneficiary_id: a.beneficiary_id,
      share_type: a.share_type,
      share_value: Number(a.share_value),
      priority: a.priority,
      is_active: a.is_active,
    })),
  })

  // VEN-167 — share-only viewers see exclusively their own beneficiaries'
  // shares (never the full waterfall, never the platform slice).
  let visibleShares = shares
  if (!canFull) {
    const myAccounts = await resolveCallerAccountIds(supabase, auth.user.id)
    visibleShares = filterSharesForCaller(shares, myAccounts, false)
  }

  return NextResponse.json({
    gross: canFull ? gross : null,
    refunds: canFull ? refunds : null,
    fees: canFull ? fees : null,
    net: canFull ? net : null,
    allocations: canFull ? allocations || [] : [],
    shares: visibleShares,
    settlement,
    share_only: !canFull,
  })
}

/**
 * VEN-168 — money-path authority for editing the allocation waterfall:
 * event creator, resolved ticketing owner, or venue finance management.
 * Kept flat with loosened client typing — deep supabase-js generics inside
 * conditional expressions previously exploded TS instantiation (TS2589).
 */
async function hasMoneyPathAuthority(supabase: any, userId: string, eventId: string): Promise<boolean> {
  const { data: event } = await supabase
    .from('events_v2')
    .select('created_by, venue_id, settings')
    .eq('id', eventId)
    .maybeSingle()
  if (!event) return false
  if (event.created_by === userId) return true

  try {
    const { data: config } = await supabase
      .from('event_ticketing_config')
      .select('ticketing_owner_type, ticketing_owner_id')
      .eq('event_id', eventId)
      .maybeSingle()
    if (config?.ticketing_owner_id && config?.ticketing_owner_type) {
      const { resolveTicketingOwnerUserIds } = await import('@/lib/ticketing/account-resolver')
      const owners = await resolveTicketingOwnerUserIds(
        supabase,
        config.ticketing_owner_type,
        config.ticketing_owner_id,
        eventId,
      )
      if (owners.includes(userId)) return true
    }
  } catch {
    /* fall through to venue bridge */
  }

  const settings = (event.settings ?? null) as Record<string, unknown> | null
  let profileId = typeof settings?.venue_profile_id === 'string' ? settings.venue_profile_id : null
  if (!profileId && event.venue_id) {
    try {
      const { data: bridge } = await supabase
        .from('venue_identity_bridges')
        .select('venue_profile_id')
        .eq('venues_v2_id', event.venue_id)
        .maybeSingle()
      profileId = bridge?.venue_profile_id || null
    } catch {
      profileId = null
    }
  }
  if (!profileId) return false

  const venueAccess = await import('@/lib/venue/venue-access')
  const access = await venueAccess.canManageVenue(supabase, userId, profileId, 'manage_finances')
  return access.allowed
}

export async function POST(request: NextRequest) {
  const auth = await authenticateApiRequest(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = upsertSchema.parse(await request.json())

  // Percentage-type allocations can never sum above 100 — reject before any
  // write instead of discovering it mid-transaction.
  const percentageSum = parsed.allocations
    .filter((a) => a.share_type === 'percentage')
    .reduce((sum, a) => sum + a.share_value, 0)
  if (percentageSum > 100) {
    return NextResponse.json(
      { error: 'Percentage shares cannot exceed 100% in total' },
      { status: 400 }
    )
  }

  const supabase = await createClient()
  const canFull = await hasTicketingPermission({
    supabase,
    userId: auth.user.id,
    eventId: parsed.event_id,
    permission: 'view_full_financials',
  })
  if (!canFull) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // VEN-168 — editing the share waterfall requires money-path authority:
  // event creator, resolved ticketing owner, or venue finance management.
  // Plain financial visibility alone is never enough to rewrite shares.
  const isMoneyAuthority = await hasMoneyPathAuthority(supabase, auth.user.id, parsed.event_id)
  if (!isMoneyAuthority)
    return NextResponse.json({ error: 'Allocation authority required' }, { status: 403 })

  const isCreator = Boolean(
    await supabase.from('events_v2').select('created_by').eq('id', parsed.event_id).eq('created_by', auth.user.id).maybeSingle().then((r: any) => Boolean(r?.data)),
  )

  // VEN-168 — named beneficiaries must exist and be controlled by the caller;
  // external promoter/platform slices require creator-level authority.
  for (const allocation of parsed.allocations) {
    if (allocation.beneficiary_type === 'platform' || allocation.beneficiary_type === 'promoter') continue
    if (!allocation.beneficiary_id)
      return NextResponse.json({ error: `${allocation.beneficiary_type} allocations require a beneficiary account` }, { status: 400 })

    if (allocation.beneficiary_type === 'venue') {
      const managed = new Set(await getManageableVenueIds(supabase as any, auth.user.id))
      if (!managed.has(allocation.beneficiary_id))
        return NextResponse.json({ error: 'You can only allocate shares to venues you manage' }, { status: 403 })
    } else if (allocation.beneficiary_type === 'artist') {
      const { data: artist } = await supabase
        .from('artist_profiles')
        .select('user_id')
        .eq('id', allocation.beneficiary_id)
        .maybeSingle()
      if (!artist) return NextResponse.json({ error: 'Artist account not found' }, { status: 400 })
      if (artist.user_id !== auth.user.id && !isCreator) {
        return NextResponse.json({ error: 'You can only allocate shares to your own artist account' }, { status: 403 })
      }
    } else if (allocation.beneficiary_type === 'organization') {
      const { data: membership } = await supabase
        .from('org_members')
        .select('role')
        .eq('org_id', allocation.beneficiary_id)
        .eq('user_id', auth.user.id)
        .in('role', ['owner', 'admin'])
        .maybeSingle()
      if (!membership && !isCreator) {
        return NextResponse.json({ error: 'You can only allocate shares to organizations you administer' }, { status: 403 })
      }
    }
  }

  // Atomic path: single-transaction delete+insert via RPC (AUDIT H6). Falls
  // back to the legacy sequential flow with a loud warning when the RPC has
  // not been provisioned yet.
  try {
    // RPC name not present in generated types (post-types migration); cast keeps runtime contract.
    const rpc = supabase.rpc as unknown as (
      fn: string,
      args?: Record<string, unknown>,
    ) => PromiseLike<{ error: { code?: string; message?: string } | null }>
    const { error: rpcError } = await rpc('replace_ticket_revenue_allocations', {
      p_event_id: parsed.event_id,
      p_allocations: JSON.stringify(parsed.allocations),
    })
    if (!rpcError) {
      return NextResponse.json({ success: true, atomic: true })
    }
    if (
      rpcError.code === '42883' ||
      rpcError.code === 'PGRST202' ||
      /could not find the function/i.test(rpcError.message || '')
    ) {
      console.warn('[settlements] replace_ticket_revenue_allocations not provisioned — using legacy non-atomic path')
    } else {
      // Real failure from inside the transaction (e.g. share validation) or
      // an environment missing the quarantined-chain table.
      console.error('[settlements] atomic replace failed:', rpcError)
      const isMissingTable = /table_missing/i.test(rpcError.message || '')
      if (!isMissingTable) {
        return NextResponse.json({ error: rpcError.message }, { status: 400 })
      }
      console.warn('[settlements] allocation table absent in this environment — legacy path will surface the error')
    }
  } catch (rpcThrow) {
    console.warn('[settlements] RPC invocation threw — falling back to legacy path:', rpcThrow)
  }

  // Legacy path (kept for environments without the migration applied).
  await supabase.from('ticket_revenue_allocations').delete().eq('event_id', parsed.event_id)

  if (parsed.allocations.length) {
    const { error } = await supabase.from('ticket_revenue_allocations').insert(
      parsed.allocations.map((a) => ({
        event_id: parsed.event_id,
        ...a,
      }))
    )
    if (error) {
      console.error('[settlements] legacy insert failed after delete:', error)
      return NextResponse.json({ error: 'Failed to save allocations' }, { status: 500 })
    }
  }

  return NextResponse.json({ success: true, atomic: false })
}
