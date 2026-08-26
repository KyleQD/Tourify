import { NextRequest, NextResponse } from 'next/server'
import { authenticateApiRequest } from '@/lib/auth/api-auth'
import { resolveActingAdminContext } from '@/lib/auth/admin-context'
import { hasAdminCapability } from '@/lib/auth/admin-capabilities'
import { resolveOrgArtistRosterScope } from '@/lib/admin/artist-roster-access'
import { z } from 'zod'

const createArtistSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  genre: z.string().optional(),
  bio: z.string().optional(),
})

/**
 * ADM-M-007 — org-scoped artist roster API.
 * GET lists only artists linked to the acting org's roster.
 * POST links (never clobbers): an existing profile by email is linked into
 * the roster; a brand-new email creates the auth user + profile, then links.
 */

export async function GET(request: NextRequest) {
  const auth = await authenticateApiRequest(request)
  if (!auth) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })
  const admin = await resolveActingAdminContext(request, auth)
  if (admin instanceof NextResponse) return admin
  if (!hasAdminCapability(admin.capabilities, 'workforce.view')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search') || searchParams.get('q') || ''
  const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10), 200)
  const offset = parseInt(searchParams.get('offset') || '0', 10)

  const supabase = auth.supabase
  const scope = await resolveOrgArtistRosterScope(supabase, admin)

  if (scope.artistProfileIds.length === 0) {
    return NextResponse.json({ artists: [], total: 0 })
  }

  const from = Math.min(offset, Math.max(scope.artistProfileIds.length - 1, 0))
  const pageIds = scope.artistProfileIds.slice(from, from + limit)

  let query = supabase
    .from('artist_profiles')
    .select('id, user_id, artist_name, bio, genres, social_links, created_at')
    .in('id', pageIds)

  if (search) query = query.ilike('artist_name', `%${search}%`)

  const { data: artistRows, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const artists = artistRows || []
  const userIds = artists.map((a: any) => a.user_id).filter(Boolean)

  // Fetch linked profiles for email, avatar, status
  let profileMap: Record<string, any> = {}
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, email, avatar_url, username, location, account_tier, is_verified, created_at')
      .in('id', userIds)
    ;(profiles || []).forEach((p: any) => { profileMap[p.id] = p })
  }

  // Roster link status per artist for UI badges
  const { data: linkRows } = await supabase
    .from('organization_artist_members')
    .select('artist_profile_id, status, role')
    .in('organizer_account_id', scope.organizerAccountIds)
    .in('artist_profile_id', artists.map((a: any) => a.id))
  const linkStatusMap: Record<string, any> = {}
  ;(linkRows || []).forEach((row: any) => { linkStatusMap[row.artist_profile_id] = row })

  // Metrics scoped to the org's own events only (was global across all orgs)
  const metricsMap: Record<string, { total: number; upcoming: number }> = {}
  let followerMap: Record<string, number> = {}

  if (userIds.length > 0) {
    const [participantRows, followRows] = await Promise.all([
      supabase
        .from('event_participants')
        .select('user_id, events!inner(org_id, start_date)')
        .eq('events.org_id', admin.orgId)
        .in('user_id', userIds),
      supabase
        .from('follows')
        .select('following_id')
        .in('following_id', userIds),
    ])

    ;(participantRows.data || []).forEach((row: any) => {
      const uid = row.user_id
      if (!metricsMap[uid]) metricsMap[uid] = { total: 0, upcoming: 0 }
      metricsMap[uid].total++
      const start = row.events?.start_date ? new Date(row.events.start_date) : null
      if (start && start > new Date()) metricsMap[uid].upcoming++
    })
    ;(followRows.data || []).forEach((row: any) => {
      followerMap[row.following_id] = (followerMap[row.following_id] || 0) + 1
    })
  }

  const deriveTier = (total: number) =>
    total >= 50 ? 'platinum' : total >= 20 ? 'gold' : total >= 5 ? 'silver' : 'bronze'

  const result = artists.map((a: any) => {
    const profile = profileMap[a.user_id] || {}
    const metrics = metricsMap[a.user_id] || { total: 0, upcoming: 0 }
    return {
      id: a.id,
      user_id: a.user_id,
      name: a.artist_name || profile.full_name || 'Unknown',
      email: profile.email || '',
      avatar_url: profile.avatar_url || null,
      bio: a.bio,
      genres: a.genres || [],
      location: profile.location || null,
      is_verified: profile.is_verified || false,
      tier: deriveTier(metrics.total),
      roster_status: linkStatusMap[a.id]?.status || null,
      event_count: metrics.total,
      upcoming_event_count: metrics.upcoming,
      follower_count: followerMap[a.user_id] || 0,
      created_at: a.created_at,
    }
  })

  return NextResponse.json({ artists: result, total: result.length })
}

export async function POST(request: NextRequest) {
  const auth = await authenticateApiRequest(request)
  if (!auth) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })
  const admin = await resolveActingAdminContext(request, auth)
  if (admin instanceof NextResponse) return admin
  if (!hasAdminCapability(admin.capabilities, 'workforce.manage')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const parsed = createArtistSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { name, email, genre, bio } = parsed.data
  const supabase = auth.supabase

  // Resolve organizer account for the acting org (roster anchor)
  const scope = await resolveOrgArtistRosterScope(supabase, admin)
  let organizerAccountId = scope.organizerAccountIds[0] ?? null
  if (!organizerAccountId) {
    const { data: createdAccount } = await supabase
      .from('organizer_accounts')
      .insert({
        user_id: admin.userId,
        ops_org_id: admin.orgId,
        is_active: true,
      })
      .select('id')
      .single()
    if (!createdAccount?.id) {
      return NextResponse.json({ error: 'Unable to resolve organizer roster for org' }, { status: 500 })
    }
    organizerAccountId = createdAccount.id
  }

  // Find an EXISTING profile for this email — never clobber it.
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .maybeSingle()

  let userId: string
  if (existingProfile?.id) {
    userId = existingProfile.id
  } else {
    const { createServiceRoleClient } = await import('@/lib/supabase/service-role')
    const serviceClient = createServiceRoleClient()
    const { data: authUser, error: authErr } = await serviceClient.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { full_name: name, account_type: 'artist' },
    })
    if (authErr || !authUser.user) {
      return NextResponse.json({ error: authErr?.message || 'Failed to create user' }, { status: 500 })
    }
    userId = authUser.user.id
  }

  // Create-or-fetch the artist profile row (plain insert when missing;
  // no destructive upsert against existing rows).
  const { data: existingArtist } = await supabase
    .from('artist_profiles')
    .select('id, user_id, artist_name, genres, bio, created_at')
    .eq('user_id', userId)
    .maybeSingle()

  let artistProfile = existingArtist
  if (!artistProfile) {
    const { data: inserted, error: apErr } = await supabase
      .from('artist_profiles')
      .insert({
        user_id: userId,
        artist_name: name,
        bio: bio || null,
        genres: genre ? [genre] : [],
      })
      .select('id, user_id, artist_name, genres, bio, created_at')
      .single()
    if (apErr) return NextResponse.json({ error: apErr.message }, { status: 500 })
    artistProfile = inserted
  }

  // Idempotent roster link (no-op when already linked)
  const { data: linkRow } = await supabase
    .from('organization_artist_members')
    .upsert(
      {
        organizer_account_id: organizerAccountId,
        artist_profile_id: artistProfile.id,
        invited_by: admin.userId,
        status: 'pending',
      },
      { onConflict: 'organizer_account_id,artist_profile_id', ignoreDuplicates: true },
    )
    .select('id, status')
    .maybeSingle()

  return NextResponse.json(
    { artist: { ...artistProfile, roster_status: linkRow?.status ?? 'linked' }, linked_existing_profile: Boolean(existingProfile) },
    { status: 201 },
  )
}
