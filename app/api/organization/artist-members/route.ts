import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { resolveActingContext } from '@/lib/auth/acting-context'
import { isOrganizationType } from '@/lib/accounts/account-types'

const inviteSchema = z.object({
  organizerAccountId: z.string().uuid(),
  artistProfileId: z.string().uuid(),
  role: z.string().min(1).max(40).default('member'),
})

const respondSchema = z.object({
  membershipId: z.string().uuid(),
  status: z.enum(['accepted', 'declined', 'removed']),
})

async function canManageOrganizer(supabase: any, userId: string, organizerAccountId: string) {
  const { data: owned } = await supabase
    .from('organizer_accounts')
    .select('id, ops_org_id, user_id')
    .eq('id', organizerAccountId)
    .maybeSingle()

  if (!owned) return { ok: false as const, organizer: null }
  if (owned.user_id === userId) return { ok: true as const, organizer: owned }

  if (owned.ops_org_id) {
    const { data: member } = await supabase
      .from('org_members')
      .select('role')
      .eq('org_id', owned.ops_org_id)
      .eq('user_id', userId)
      .maybeSingle()
    if (member && ['owner', 'admin', 'tour_manager'].includes(String(member.role)))
      return { ok: true as const, organizer: owned }
  }

  const { data: rel } = await supabase
    .from('account_relationships')
    .select('id')
    .eq('owned_profile_id', organizerAccountId)
    .eq('owner_user_id', userId)
    .maybeSingle()

  return { ok: Boolean(rel?.id), organizer: owned }
}

export async function GET(request: NextRequest) {
  const organizerAccountId = request.nextUrl.searchParams.get('organizerAccountId')
  const mine = request.nextUrl.searchParams.get('mine') === '1'

  const ctx = await resolveActingContext(request)
  if (ctx instanceof NextResponse) return ctx

  if (mine) {
    const { data: artistRows } = await ctx.supabase
      .from('artist_profiles')
      .select('id')
      .eq('user_id', ctx.userId)
    const artistIds = (artistRows || []).map((row: { id: string }) => row.id)
    if (!artistIds.length) return NextResponse.json({ members: [] })

    const { data, error } = await ctx.supabase
      .from('organization_artist_members')
      .select(
        'id, role, status, artist_profile_id, invited_by, created_at, organizer_account_id, organizer_accounts(id, organization_name, url_slug, subtype)'
      )
      .in('artist_profile_id', artistIds)
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ members: data || [] })
  }

  if (!organizerAccountId)
    return NextResponse.json({ error: 'organizerAccountId required' }, { status: 400 })

  const gate = await canManageOrganizer(ctx.supabase, ctx.userId, organizerAccountId)
  const { data: ownedArtists } = await ctx.supabase
    .from('artist_profiles')
    .select('id')
    .eq('user_id', ctx.userId)
  const artistIds = new Set((ownedArtists || []).map((row: { id: string }) => row.id))

  if (!gate.ok && artistIds.size === 0)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let query = ctx.supabase
    .from('organization_artist_members')
    .select(
      'id, role, status, artist_profile_id, invited_by, created_at, artist_profiles(id, artist_name, url_slug)'
    )
    .eq('organizer_account_id', organizerAccountId)
    .order('created_at', { ascending: true })

  if (!gate.ok)
    query = query.in('artist_profile_id', Array.from(artistIds))

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ members: data || [] })
}

export async function POST(request: NextRequest) {
  const ctx = await resolveActingContext(request)
  if (ctx instanceof NextResponse) return ctx

  const body = await request.json().catch(() => null)
  const parsed = inviteSchema.safeParse(body)
  if (!parsed.success)
    return NextResponse.json({ error: 'Invalid invite payload' }, { status: 400 })

  const { organizerAccountId, artistProfileId, role } = parsed.data
  if (!isOrganizationType(ctx.accountType) && ctx.accountType !== 'general')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const gate = await canManageOrganizer(ctx.supabase, ctx.userId, organizerAccountId)
  if (!gate.ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data: artist } = await ctx.supabase
    .from('artist_profiles')
    .select('id')
    .eq('id', artistProfileId)
    .maybeSingle()
  if (!artist) return NextResponse.json({ error: 'Artist not found' }, { status: 404 })

  const { data, error } = await ctx.supabase
    .from('organization_artist_members')
    .upsert(
      {
        organizer_account_id: organizerAccountId,
        artist_profile_id: artistProfileId,
        role,
        status: 'pending',
        invited_by: ctx.userId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'organizer_account_id,artist_profile_id' }
    )
    .select('id, status, role')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ membership: data })
}

export async function PATCH(request: NextRequest) {
  const ctx = await resolveActingContext(request)
  if (ctx instanceof NextResponse) return ctx

  const body = await request.json().catch(() => null)
  const parsed = respondSchema.safeParse(body)
  if (!parsed.success)
    return NextResponse.json({ error: 'Invalid response payload' }, { status: 400 })

  const { membershipId, status } = parsed.data
  const { data: membership } = await ctx.supabase
    .from('organization_artist_members')
    .select('id, organizer_account_id, artist_profile_id, status')
    .eq('id', membershipId)
    .maybeSingle()

  if (!membership) return NextResponse.json({ error: 'Membership not found' }, { status: 404 })

  const { data: artist } = await ctx.supabase
    .from('artist_profiles')
    .select('id, user_id')
    .eq('id', membership.artist_profile_id)
    .maybeSingle()

  const isArtistOwner = artist?.user_id === ctx.userId
  const manageGate = await canManageOrganizer(
    ctx.supabase,
    ctx.userId,
    membership.organizer_account_id
  )

  if (status === 'removed') {
    if (!manageGate.ok && !isArtistOwner)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  } else if (!isArtistOwner) {
    return NextResponse.json({ error: 'Only the invited artist can accept or decline' }, { status: 403 })
  }

  const { data, error } = await ctx.supabase
    .from('organization_artist_members')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', membershipId)
    .select('id, status, role')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ membership: data })
}
