import { createClient } from '@/lib/supabase/server'
import { isLikelyUuidPathSegment } from '@/lib/routing/public-share-routes'
import { normalizeVenueSlug } from '@/lib/venue/routing'

function asRecord(value: unknown): Record<string, any> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, any>)
    : {}
}

function firstString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim()
  }

  return null
}

function createEpkSlug(input: string) {
  return String(input || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export async function getPublicProfilePreview(username: string) {
  const supabase = await createClient()
  const profileSelect = `
    id,
    username,
    custom_url,
    full_name,
    bio,
    avatar_url,
    cover_image,
    location,
    website,
    profile_data,
    social_links,
    is_verified
  `

  let { data: profile } = await supabase
    .from('profiles')
    .select(profileSelect)
    .eq('username', username)
    .maybeSingle()

  if (!profile) {
    const fallback = await supabase
      .from('profiles')
      .select(profileSelect)
      .eq('custom_url', username)
      .maybeSingle()
    profile = fallback.data
  }

  if (!profile) return null

  const profileData = asRecord(profile.profile_data)
  let accountType = 'general'
  let displayName = firstString(
    profileData.name,
    profileData.artist_name,
    profileData.venue_name,
    profile.full_name,
    profile.username
  ) || 'Tourify profile'
  let bio = firstString(profile.bio, profileData.bio)
  let imageUrl = firstString(profile.cover_image, profile.avatar_url)
  let location = firstString(profile.location, profileData.location)

  try {
    const { data: artist } = await supabase
      .from('artist_profiles')
      .select('artist_name, bio, genres')
      .eq('user_id', profile.id)
      .limit(1)
      .maybeSingle()

    if (artist) {
      accountType = 'artist'
      displayName = firstString(artist.artist_name, displayName) || displayName
      bio = firstString(artist.bio, bio)
    }
  } catch {
    // Specialized profile tables may not exist in all environments.
  }

  if (accountType === 'general') {
    try {
      const { data: venue } = await supabase
        .from('venue_profiles')
        .select('venue_name, description, city, state, cover_image_url, avatar_url')
        .eq('user_id', profile.id)
        .limit(1)
        .maybeSingle()

      if (venue) {
        accountType = 'venue'
        displayName = firstString(venue.venue_name, displayName) || displayName
        bio = firstString(venue.description, bio)
        location = firstString([venue.city, venue.state].filter(Boolean).join(', '), location)
        imageUrl = firstString(venue.cover_image_url, venue.avatar_url, imageUrl)
      }
    } catch {
      // Keep the base profile preview if venue tables are unavailable.
    }
  }

  return {
    displayName,
    accountType,
    bio,
    location,
    imageUrl,
    canonicalUsername: String(profile.username || username),
  }
}

export async function getPublicVenuePreview(slug: string) {
  const supabase = await createClient()
  const venueSelect = `
    id,
    venue_name,
    description,
    city,
    state,
    country,
    avatar_url,
    cover_image_url,
    url_slug
  `

  let venueId: string | null = null

  if (isLikelyUuidPathSegment(slug)) {
    venueId = slug
  } else {
    const normalizedSlug = normalizeVenueSlug(slug)
    const { data: slugVenue } = await supabase
      .from('venue_profiles')
      .select('id')
      .or(`url_slug.eq.${slug},url_slug.eq.${normalizedSlug}`)
      .limit(1)
      .maybeSingle()

    venueId = slugVenue?.id || null
  }

  let query = supabase.from('venue_profiles').select(venueSelect)

  if (venueId) {
    query = query.eq('id', venueId)
  } else {
    query = query.eq('venue_name', slug.replace(/-/g, ' '))
  }

  const { data: venue } = await query.maybeSingle()
  if (!venue) return null

  return {
    venueName: String(venue.venue_name || 'Venue'),
    description: firstString(venue.description),
    city: firstString(venue.city),
    state: firstString(venue.state),
    country: firstString(venue.country),
    imageUrl: firstString(venue.cover_image_url, venue.avatar_url),
    canonicalSlug: firstString(venue.url_slug, venue.id, slug) || slug,
  }
}

export async function getPublicEpkPreview(slug: string) {
  const supabase = await createClient()
  const normalizedSlug = createEpkSlug(slug)

  let userId: string | null = null
  let artistProfileId: string | null = null
  let canonicalSlug = normalizedSlug || slug

  try {
    const { data: publicSettings, error: publicSettingsError } = await supabase
      .from('artist_epk_settings')
      .select('user_id, artist_profile_id, epk_slug')
      .eq('epk_slug', normalizedSlug)
      .eq('is_public', true)
      .maybeSingle()

    if (publicSettings?.user_id) {
      userId = String(publicSettings.user_id)
      artistProfileId = publicSettings.artist_profile_id ? String(publicSettings.artist_profile_id) : null
      canonicalSlug = String(publicSettings.epk_slug || canonicalSlug)
    } else if (publicSettingsError && String(publicSettingsError.message || '').includes('artist_profile_id')) {
      const { data: legacyPublicSettings } = await supabase
        .from('artist_epk_settings')
        .select('user_id, epk_slug')
        .eq('epk_slug', normalizedSlug)
        .eq('is_public', true)
        .maybeSingle()

      if (legacyPublicSettings?.user_id) {
        userId = String(legacyPublicSettings.user_id)
        canonicalSlug = String(legacyPublicSettings.epk_slug || canonicalSlug)
      }
    }
  } catch {
    return null
  }

  if (!userId) {
    const { data: artistProfile } = await supabase
      .from('artist_profiles')
      .select('id, user_id, artist_name')
      .ilike('artist_name', slug.replace(/-/g, ' '))
      .maybeSingle()

    if (!artistProfile?.user_id) return null

    const { data: settings } = await supabase
      .from('artist_epk_settings')
      .select('is_public, epk_slug, artist_profile_id')
      .eq('artist_profile_id', artistProfile.id)
      .maybeSingle()

    let resolvedSettings = settings
    if (!resolvedSettings) {
      const { data: legacySettings } = await supabase
        .from('artist_epk_settings')
        .select('is_public, epk_slug, artist_profile_id')
        .eq('user_id', artistProfile.user_id)
        .maybeSingle()

      resolvedSettings = legacySettings
    }
    if (!resolvedSettings?.is_public) return null
    userId = String(artistProfile.user_id)
    artistProfileId = resolvedSettings.artist_profile_id
      ? String(resolvedSettings.artist_profile_id)
      : String(artistProfile.id)
    canonicalSlug = String(resolvedSettings.epk_slug || canonicalSlug)
  }

  if (!userId) return null

  const artistQuery = supabase
    .from('artist_profiles')
    .select('artist_name, bio, genres')
    .limit(1)

  const [{ data: profile }, { data: artist }] = await Promise.all([
    supabase
      .from('profiles')
      .select('full_name, username, bio, location, avatar_url, cover_image')
      .eq('id', userId)
      .maybeSingle(),
    (artistProfileId
      ? artistQuery.eq('id', artistProfileId)
      : artistQuery.eq('user_id', userId)
    ).maybeSingle(),
  ])

  if (!profile && !artist) return null

  const genres = Array.isArray(artist?.genres) ? artist.genres.map(String) : []

  return {
    artistName:
      firstString(artist?.artist_name, profile?.full_name, profile?.username) || 'Artist',
    bio: firstString(artist?.bio, profile?.bio),
    genre: genres[0] || null,
    location: firstString(profile?.location),
    imageUrl: firstString(profile?.cover_image, profile?.avatar_url),
    canonicalSlug,
  }
}

export async function getPublicJobPreview(id: string) {
  const supabase = await createClient()

  const { data: venueJob } = await supabase
    .from('job_posting_templates')
    .select('id, title, description, location, status, department, position')
    .eq('id', id)
    .eq('status', 'published')
    .maybeSingle()

  if (venueJob) {
    return {
      title: String(venueJob.title || venueJob.position || 'Open role'),
      employerName: firstString(venueJob.department),
      description: firstString(venueJob.description),
      location: firstString(venueJob.location),
    }
  }

  const { data: artistJob } = await supabase
    .from('artist_jobs')
    .select('id, title, description, location, city, state, country, status, posted_by')
    .eq('id', id)
    .eq('status', 'open')
    .maybeSingle()

  if (!artistJob) return null

  let employerName: string | null = null
  if (artistJob.posted_by) {
    const { data: poster } = await supabase
      .from('profiles')
      .select('full_name, username')
      .eq('id', artistJob.posted_by)
      .maybeSingle()
    employerName = firstString(poster?.full_name, poster?.username)
  }

  return {
    title: String(artistJob.title || 'Open role'),
    employerName,
    description: firstString(artistJob.description),
    location:
      firstString(
        artistJob.location,
        [artistJob.city, artistJob.state, artistJob.country].filter(Boolean).join(', ')
      ),
  }
}
