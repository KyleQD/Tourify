import { createClient } from '@/lib/supabase/server'
import {
  hasArtistRoster,
  hasPublicEventsModule,
  hasServicesJobsModule,
  normalizeOrganizationSubtype,
  organizationSubtypeLabel,
} from '@/lib/organizations/org-subtypes'
import type {
  PublicOrganizationEvent,
  PublicOrganizationJob,
  PublicOrganizationPageDTO,
  PublicOrganizationRosterMember,
} from './public-organization-types'

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value))
    return value as Record<string, unknown>
  return {}
}

async function resolveViewerCanManage(params: {
  supabase: any
  userId: string | null
  organizer: { id: string; user_id: string; ops_org_id?: string | null }
}): Promise<boolean> {
  const { supabase, userId, organizer } = params
  if (!userId) return false
  if (organizer.user_id === userId) return true

  if (organizer.ops_org_id) {
    const { data: member } = await supabase
      .from('org_members')
      .select('role')
      .eq('org_id', organizer.ops_org_id)
      .eq('user_id', userId)
      .maybeSingle()
    if (member && ['owner', 'admin', 'tour_manager'].includes(String(member.role)))
      return true
  }

  const { data: rel } = await supabase
    .from('account_relationships')
    .select('id')
    .eq('owned_profile_id', organizer.id)
    .eq('owner_user_id', userId)
    .maybeSingle()

  return Boolean(rel?.id)
}

async function loadRoster(
  supabase: any,
  organizerAccountId: string
): Promise<PublicOrganizationRosterMember[]> {
  const { data: rows } = await supabase
    .from('organization_artist_members')
    .select('id, role, artist_profile_id, artist_profiles(id, artist_name, url_slug, genres, user_id)')
    .eq('organizer_account_id', organizerAccountId)
    .eq('status', 'accepted')
    .order('created_at', { ascending: true })

  if (!rows?.length) return []

  const ownerIds = Array.from(
    new Set(
      rows
        .map((row: any) => row.artist_profiles?.user_id)
        .filter(Boolean)
        .map(String)
    )
  )

  const { data: profiles } = ownerIds.length
    ? await supabase.from('profiles').select('id, avatar_url').in('id', ownerIds)
    : { data: [] as any[] }

  const avatarByUser = ((profiles || []) as Array<{ id: string; avatar_url: string | null }>).reduce(
    (acc: Record<string, string | null>, row) => {
    acc[String(row.id)] = row.avatar_url || null
    return acc
    },
    {}
  )

  return rows
    .map((row: any): PublicOrganizationRosterMember | null => {
      const artist = row.artist_profiles
      if (!artist?.id) return null
      return {
        membershipId: String(row.id),
        role: String(row.role || 'member'),
        artistProfileId: String(artist.id),
        artistName: String(artist.artist_name || 'Artist'),
        artistSlug: artist.url_slug ? String(artist.url_slug) : null,
        avatarUrl: avatarByUser[String(artist.user_id)] || null,
        genres: Array.isArray(artist.genres) ? artist.genres.map(String) : [],
      }
    })
    .filter(Boolean) as PublicOrganizationRosterMember[]
}

async function loadEvents(
  supabase: any,
  organizerAccountId: string,
  ownerUserId: string,
  opsOrgId: string | null
): Promise<{ upcoming: PublicOrganizationEvent[]; past: PublicOrganizationEvent[] }> {
  const today = new Date().toISOString().slice(0, 10)
  const mapped: PublicOrganizationEvent[] = []

  if (opsOrgId) {
    const { data: v2Rows } = await supabase
      .from('events_v2')
      .select('id, title, slug, start_at, status, settings')
      .eq('org_id', opsOrgId)
      .order('start_at', { ascending: true })
      .limit(40)

    for (const row of v2Rows || []) {
      const settings = row.settings && typeof row.settings === 'object' ? row.settings : {}
      mapped.push({
        id: String(row.id),
        title: String(row.title || 'Event'),
        slug: row.slug ? String(row.slug) : null,
        eventDate: row.start_at ? String(row.start_at).slice(0, 10) : null,
        venueName: settings.venue_name ? String(settings.venue_name) : null,
        city: settings.city ? String(settings.city) : null,
        status: row.status ? String(row.status) : null,
      })
    }
  }

  if (!mapped.length) {
    const { data: rows } = await supabase
      .from('events')
      .select('id, title, slug, event_date, venue_name, status, created_by')
      .eq('created_by', ownerUserId)
      .order('event_date', { ascending: true })
      .limit(40)

    for (const row of rows || []) {
      mapped.push({
        id: String(row.id),
        title: String(row.title || 'Event'),
        slug: row.slug ? String(row.slug) : null,
        eventDate: row.event_date ? String(row.event_date) : null,
        venueName: row.venue_name ? String(row.venue_name) : null,
        city: null,
        status: row.status ? String(row.status) : null,
      })
    }
  }

  return {
    upcoming: mapped.filter((event) => !event.eventDate || event.eventDate >= today).slice(0, 12),
    past: mapped
      .filter((event) => event.eventDate && event.eventDate < today)
      .reverse()
      .slice(0, 12),
  }
}

async function loadTours(supabase: any, opsOrgId: string | null) {
  if (!opsOrgId) return []
  const { data: rows } = await supabase
    .from('tours')
    .select('id, name, status, start_date, end_date')
    .eq('org_id', opsOrgId)
    .order('start_date', { ascending: true })
    .limit(12)

  return (rows || []).map((row: any) => ({
    id: String(row.id),
    name: String(row.name || 'Tour'),
    status: row.status ? String(row.status) : null,
    startDate: row.start_date ? String(row.start_date) : null,
    endDate: row.end_date ? String(row.end_date) : null,
  }))
}

async function loadPosts(supabase: any, organizerAccountId: string) {
  const { data: rows } = await supabase
    .from('posts')
    .select('id, content, created_at, likes_count, comments_count')
    .eq('posted_as_profile_id', organizerAccountId)
    .eq('visibility', 'public')
    .order('created_at', { ascending: false })
    .limit(12)

  return (rows || []).map((row: any) => ({
    id: String(row.id),
    content: String(row.content || ''),
    createdAt: row.created_at ? String(row.created_at) : null,
    likesCount: Number(row.likes_count || 0),
    commentsCount: Number(row.comments_count || 0),
  }))
}

async function loadOpenJobs(
  supabase: any,
  organizerAccountId: string
): Promise<PublicOrganizationJob[]> {
  const { data: rows } = await supabase
    .from('artist_jobs')
    .select('id, title, location, status, created_at, posted_by_profile_id, posted_by_type')
    .eq('posted_by_profile_id', organizerAccountId)
    .eq('posted_by_type', 'organizer')
    .in('status', ['open', 'active', 'published'])
    .order('created_at', { ascending: false })
    .limit(12)

  return (rows || []).map((row: any): PublicOrganizationJob => ({
    id: String(row.id),
    title: String(row.title || 'Open role'),
    location: row.location ? String(row.location) : null,
    status: row.status ? String(row.status) : null,
    createdAt: row.created_at ? String(row.created_at) : null,
  }))
}

export async function getPublicOrganizationProfileDTO(params: {
  slug: string
}): Promise<PublicOrganizationPageDTO | null> {
  const slug = params.slug?.trim()
  if (!slug) return null

  const supabase = await createClient()
  const { data: authData } = await supabase.auth.getUser()
  const userId = authData?.user?.id ?? null

  let organizer: any | null = null

  const { data: bySlug } = await supabase
    .from('organizer_accounts')
    .select(
      'id, user_id, organization_name, organization_type, subtype, url_slug, description, contact_info, social_links, specialties, avatar_url, banner_url, ops_org_id, is_public, is_active, created_at'
    )
    .eq('url_slug', slug)
    .eq('is_active', true)
    .maybeSingle()

  organizer = bySlug

  // Legacy fallback: owner username used as org URL
  if (!organizer) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', slug)
      .maybeSingle()

    if (profile?.id) {
      const { data: byOwner } = await supabase
        .from('organizer_accounts')
        .select(
          'id, user_id, organization_name, organization_type, subtype, url_slug, description, contact_info, social_links, specialties, avatar_url, banner_url, ops_org_id, is_public, is_active, created_at'
        )
        .eq('user_id', profile.id)
        .eq('is_active', true)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()
      organizer = byOwner
    }
  }

  if (!organizer || organizer.is_public === false) return null

  const subtype = normalizeOrganizationSubtype(organizer.subtype || organizer.organization_type)
  const canManage = await resolveViewerCanManage({ supabase, userId, organizer })

  const { data: accountRow } = await supabase
    .from('accounts')
    .select('id, follower_count, avatar_url, is_verified')
    .eq('profile_id', organizer.id)
    .in('account_type', ['organization', 'organizer', 'business', 'admin'])
    .maybeSingle()

  const { data: ownerProfile } = await supabase
    .from('profiles')
    .select('avatar_url, cover_image')
    .eq('id', organizer.user_id)
    .maybeSingle()

  const roster = hasArtistRoster(subtype) ? await loadRoster(supabase, organizer.id) : []
  const events = hasPublicEventsModule(subtype)
    ? await loadEvents(supabase, organizer.id, organizer.user_id, organizer.ops_org_id)
    : { upcoming: [], past: [] }
  const tours = hasPublicEventsModule(subtype) ? await loadTours(supabase, organizer.ops_org_id) : []
  const posts = await loadPosts(supabase, organizer.id)
  const openJobs = hasServicesJobsModule(subtype) ? await loadOpenJobs(supabase, organizer.id) : []

  return {
    id: String(organizer.id),
    slug: String(organizer.url_slug || slug),
    name: String(organizer.organization_name || 'Organization'),
    subtype,
    subtypeLabel: organizationSubtypeLabel(subtype),
    description: organizer.description ? String(organizer.description) : null,
    avatarUrl:
      organizer.avatar_url ||
      accountRow?.avatar_url ||
      ownerProfile?.avatar_url ||
      null,
    bannerUrl: organizer.banner_url || ownerProfile?.cover_image || null,
    specialties: Array.isArray(organizer.specialties) ? organizer.specialties.map(String) : [],
    contactInfo: asRecord(organizer.contact_info),
    socialLinks: asRecord(organizer.social_links),
    ownerUserId: String(organizer.user_id),
    accountId: accountRow?.id ? String(accountRow.id) : null,
    opsOrgId: organizer.ops_org_id ? String(organizer.ops_org_id) : null,
    isVerified: Boolean(accountRow?.is_verified),
    followerCount: Number(accountRow?.follower_count || 0),
    isOwnOrganization: userId === organizer.user_id,
    canManage,
    roster,
    upcomingEvents: events.upcoming,
    pastEvents: events.past,
    tours,
    posts,
    openJobs,
    createdAt: String(organizer.created_at || new Date().toISOString()),
  }
}
