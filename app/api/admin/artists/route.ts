import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/auth/api-auth'
import { z } from 'zod'

const createArtistSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  genre: z.string().optional(),
  bio: z.string().optional(),
})

export const GET = withAdminAuth(async (request: NextRequest, { supabase }) => {
  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search') || searchParams.get('q') || ''
  const includeMetrics = searchParams.get('include') === 'metrics'
  const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10), 200)
  const offset = parseInt(searchParams.get('offset') || '0', 10)

  let query = supabase
    .from('artist_profiles')
    .select('id, user_id, artist_name, bio, genres, social_links, created_at')
    .limit(limit)
    .range(offset, offset + limit - 1)

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

  // Fetch metrics (event_count, upcoming_event_count) and follower_count
  let metricsMap: Record<string, { total: number; upcoming: number }> = {}
  let followerMap: Record<string, number> = {}

  if (userIds.length > 0) {
    const [participantRows, followRows] = await Promise.all([
      supabase
        .from('event_participants')
        .select('user_id, events(start_date)')
        .in('user_id', userIds),
      supabase
        .from('follows')
        .select('following_id')
        .in('following_id', userIds),
    ])

    ;(participantRows.data || []).forEach((row: any) => {
      const uid = row.user_id
      if (!metricsMap[uid]) metricsMap[uid] = { total: 0, upcoming: 0 }
      metricsMap[uid].total += 1
      const startDate = row.events?.start_date
      if (startDate && new Date(startDate) > new Date()) metricsMap[uid].upcoming += 1
    })

    ;(followRows.data || []).forEach((row: any) => {
      followerMap[row.following_id] = (followerMap[row.following_id] || 0) + 1
    })
  }

  function deriveTier(eventCount: number): string {
    if (eventCount >= 10) return 'established'
    if (eventCount >= 3) return 'rising'
    return 'emerging'
  }

  const result = artists.map((a: any) => {
    const profile = profileMap[a.user_id] || {}
    const metrics = metricsMap[a.user_id] || { total: 0, upcoming: 0 }
    const followerCount = followerMap[a.user_id] || 0
    return {
      id: a.id,
      user_id: a.user_id,
      name: a.artist_name || profile.full_name || profile.username || 'Unknown',
      email: profile.email || '',
      avatar_url: profile.avatar_url || null,
      bio: a.bio || null,
      genres: a.genres || [],
      social_links: a.social_links || {},
      location: profile.location || null,
      status: profile.account_tier || 'active',
      is_verified: profile.is_verified || false,
      event_count: metrics.total,
      upcoming_event_count: metrics.upcoming,
      follower_count: followerCount,
      tier: deriveTier(metrics.total),
      created_at: a.created_at,
    }
  })

  return NextResponse.json({ artists: result, total: result.length })
})

export const POST = withAdminAuth(async (request: NextRequest, { supabase }) => {
  const body = await request.json()
  const parsed = createArtistSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { name, email, genre, bio } = parsed.data

  // Check if profile with this email already exists
  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .maybeSingle()

  let userId: string

  if (existing) {
    userId = existing.id
  } else {
    // Create auth user via admin API (service role required)
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

  // Upsert artist_profile
  const { data: artistProfile, error: apErr } = await supabase
    .from('artist_profiles')
    .upsert(
      {
        user_id: userId,
        artist_name: name,
        bio: bio || null,
        genres: genre ? [genre] : [],
      },
      { onConflict: 'user_id', ignoreDuplicates: false }
    )
    .select('id, user_id, artist_name, genres, bio, created_at')
    .single()

  if (apErr) return NextResponse.json({ error: apErr.message }, { status: 500 })

  return NextResponse.json({ artist: artistProfile }, { status: 201 })
})
