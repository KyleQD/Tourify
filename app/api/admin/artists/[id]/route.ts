import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/auth/api-auth'
import { z } from 'zod'

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

export const GET = withAdminAuth(async (request: NextRequest, { supabase }) => {
  const id = extractArtistId(request.url)
  if (!id) return NextResponse.json({ error: 'Missing artist id' }, { status: 400 })

  const { data: artist, error } = await supabase
    .from('artist_profiles')
    .select('id, user_id, artist_name, bio, genres, social_links, created_at')
    .eq('id', id)
    .maybeSingle()

  if (error || !artist) return NextResponse.json({ error: 'Artist not found' }, { status: 404 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email, avatar_url, username, location, is_verified, account_tier')
    .eq('id', artist.user_id)
    .maybeSingle()

  // Fetch events for this artist
  const { data: participations } = await supabase
    .from('event_participants')
    .select('id, role, status, events(id, name, start_date, venue_name, status)')
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

export const PATCH = withAdminAuth(async (request: NextRequest, { supabase }) => {
  const id = extractArtistId(request.url)
  if (!id) return NextResponse.json({ error: 'Missing artist id' }, { status: 400 })
  const body = await request.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { data, error } = await supabase
    .from('artist_profiles')
    .update(parsed.data)
    .eq('id', id)
    .select('id, artist_name, bio, genres, social_links')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ artist: data })
})

export const DELETE = withAdminAuth(async (request: NextRequest, { supabase }) => {
  const id = extractArtistId(request.url)
  if (!id) return NextResponse.json({ error: 'Missing artist id' }, { status: 400 })
  const { error } = await supabase.from('artist_profiles').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
})
