import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withAdminCapability } from '@/lib/auth/api-auth'
import type { ActingAdminContext } from '@/lib/auth/admin-context'
import { resolveOrgArtistRosterScope } from '@/lib/admin/artist-roster-access'

const patchSchema = z.object({
  artist_name: z.string().min(1).optional(),
  bio: z.string().optional(),
  genres: z.array(z.string()).optional(),
  social_links: z.record(z.string()).optional(),
})

function extractArtistId(url: string): string | null {
  const segments = new URL(url).pathname.split('/')
  const idx = segments.indexOf('artists')
  return idx >= 0 ? segments[idx + 1] || null : null
}

/**
 * ADM-M-007 — artist detail routes are roster-scoped: the target artist must
 * be linked to the acting org via organization_artist_members, otherwise 404
 * (existence not leaked across tenants).
 */
async function requireScopedArtist(
  supabase: any,
  admin: Pick<ActingAdminContext, 'orgId'>,
  artistId: string | null,
) {
  if (!artistId) return { error: NextResponse.json({ error: 'Missing artist id' }, { status: 400 }) }

  const scope = await resolveOrgArtistRosterScope(supabase, admin)
  if (!scope.artistProfileIds.includes(artistId)) {
    return { error: NextResponse.json({ error: 'Artist not found' }, { status: 404 }) }
  }

  return { admin, scope }
}

const artistCapability = (request: NextRequest) =>
  request.method === 'GET' ? 'workforce.view' as const : 'workforce.manage' as const

export const GET = withAdminCapability(artistCapability, async (request, { supabase, admin }) => {
  const id = extractArtistId(request.url)
  const ctx = await requireScopedArtist(supabase, admin, id)
  if (ctx.error) return ctx.error

  const { data: artist, error } = await supabase
    .from('artist_profiles')
    .select('id, user_id, artist_name, bio, genres, social_links, created_at')
    .eq('id', id!)
    .maybeSingle()

  if (error || !artist) return NextResponse.json({ error: 'Artist not found' }, { status: 404 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email, avatar_url, username, location, is_verified, account_tier')
    .eq('id', artist.user_id)
    .maybeSingle()

  // Events scoped to the acting org's events only
  const { data: participations } = await supabase
    .from('event_participants')
    .select('id, role, status, events!inner(id, name, start_date, venue_name, status, org_id)')
    .eq('events.org_id', ctx.admin!.orgId)
    .eq('user_id', artist.user_id)
    .order('created_at', { ascending: false })
    .limit(50)

  return NextResponse.json({
    artist: {
      id: artist.id,
      user_id: artist.user_id,
      name: artist.artist_name || profile?.full_name || 'Unknown',
      email: profile?.email || '',
      avatar_url: profile?.avatar_url || null,
      bio: artist.bio || null,
      genres: artist.genres || [],
      social_links: artist.social_links || {},
      location: profile?.location || null,
      is_verified: profile?.is_verified || false,
      status: profile?.account_tier || 'active',
      created_at: artist.created_at,
    },
    events: (participations || []).map((p: any) => ({
      id: p.events?.id,
      name: p.events?.name,
      start_date: p.events?.start_date,
      venue_name: p.events?.venue_name,
      event_status: p.events?.status,
      participant_role: p.role,
      participant_status: p.status,
    })).filter((e: any) => e.id),
  })
})

export const PATCH = withAdminCapability(artistCapability, async (request, { supabase, admin }) => {
  const id = extractArtistId(request.url)
  const ctx = await requireScopedArtist(supabase, admin, id)
  if (ctx.error) return ctx.error

  const body = await request.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { data, error } = await supabase
    .from('artist_profiles')
    .update(parsed.data)
    .eq('id', id!)
    .select('id, artist_name, bio, genres, social_links')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ artist: data })
})

/**
 * ADM-M-007 — DELETE now removes the org ROSTER LINK, not the platform-wide
 * artist profile. Requires workforce.manage; hard profile deletion is a
 * platform-admin operation outside this API.
 */
export const DELETE = withAdminCapability(artistCapability, async (request, { supabase, admin }) => {
  const id = extractArtistId(request.url)
  if (!id) return NextResponse.json({ error: 'Missing artist id' }, { status: 400 })

  const scope = await resolveOrgArtistRosterScope(supabase, admin)

  const { data: removedLinks, error } = await supabase
    .from('organization_artist_members')
    .update({ status: 'removed', updated_at: new Date().toISOString() })
    .in('organizer_account_id', scope.organizerAccountIds.length > 0 ? scope.organizerAccountIds : ['00000000-0000-0000-0000-000000000000'])
    .eq('artist_profile_id', id)
    .select('id')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!removedLinks || removedLinks.length === 0) {
    return NextResponse.json({ error: 'Artist not found in organization roster' }, { status: 404 })
  }

  return NextResponse.json({
    success: true,
    action: 'roster_removed',
    note: 'The artist remains available platform-side; the link to this organization was removed.',
  })
})
