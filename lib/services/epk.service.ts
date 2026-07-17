import { supabase } from '@/lib/supabase'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import {
  invalidEpkAppearanceHexFields,
  normalizeEpkAppearance,
  type EpkAppearance,
} from '@/lib/epk/epk-appearance'
import { normalizeEpkFontId } from '@/lib/epk/epk-preview-utils'

type EpkDb = SupabaseClient<Database>

type EpkSlugUpdateMode = 'preserve' | 'manual'

interface EPKData {
  artistProfileId: string | null
  epkSlug: string
  epkSlugUpdateMode?: EpkSlugUpdateMode
  artistName: string
  bio: string
  genre: string
  location: string
  avatarUrl: string
  coverUrl: string
  theme: string
  template: string
  isPublic: boolean
  stats: {
    followers: number
    monthlyListeners: number
    totalStreams: number
    eventsPlayed: number
  }
  music: {
    id: string
    title: string
    url: string
    releaseDate: string
    streams: number
    coverArt: string
    platform: string
    featured?: boolean
  }[]
  photos: {
    id: string
    url: string
    caption: string
    isHero: boolean
  }[]
  press: {
    id: string
    title: string
    url: string
    date: string
    outlet: string
    excerpt: string
  }[]
  contact: {
    email: string
    phone: string
    website: string
    bookingEmail: string
    managementEmail: string
    address?: string
    businessName?: string
    timezone?: string
    availability?: string
    preferredContact?: 'email' | 'phone'
    verified: {
      email: boolean
      phone: boolean
      website: boolean
    }
  }
  social: {
    id: string
    platform: string
    url: string
    username: string
    verified?: boolean
    followers?: number
  }[]
  upcomingShows: {
    id: string
    date: string
    venue: string
    location: string
    ticketUrl: string
    status: 'upcoming' | 'completed' | 'cancelled'
    capacity?: number
    attendance?: number
    setLength?: number
    notes?: string
    poster?: string
    featured?: boolean
  }[]
  customDomain: string
  seoTitle: string
  seoDescription: string
  layout: {
    preset: 'booker' | 'festival' | 'press'
    sectionOrder: string[]
    sectionVisibility: Record<string, boolean>
  }
  bookingAssets: {
    techRiderUrl: string
    stagePlotUrl: string
    oneLiner: string
  }
  quality: {
    score: number
    missing: string[]
  }
  epkFont: import('@/lib/epk/epk-preview-utils').EpkFontId
  epkAppearance: EpkAppearance
}

interface EPKSettings {
  id?: string
  user_id: string
  artist_profile_id?: string | null
  theme: string
  template: string
  is_public: boolean
  custom_domain?: string
  seo_title?: string
  seo_description?: string
  epk_slug?: string
  settings: Record<string, any>
  created_at?: string
  updated_at?: string
}

type SaveEPKSuccess = {
  success: true
  data: EPKData
  publicUrl: string
  lastSavedAt: string | null
  artistProfileId: string | null
  epkSlug: string
  isPublic: boolean
}

type SaveEPKFailure = {
  success: false
  error: string
  code: string
  status: number
}

type EPKSaveState = {
  hasSavedEpk: boolean
  publicUrl: string | null
  lastSavedAt: string | null
  isPublic: boolean
}

export class EpkSaveError extends Error {
  code: string
  status: number

  constructor(message: string, code = 'epk_save_failed', status = 500) {
    super(message)
    this.name = 'EpkSaveError'
    this.code = code
    this.status = status
  }
}

function isMissingArtistProfileIdColumn(error: unknown): boolean {
  const message =
    error && typeof error === 'object' && 'message' in error
      ? String((error as { message?: unknown }).message || '')
      : String(error || '')

  return message.includes('artist_profile_id') &&
    (message.includes('schema cache') ||
      message.includes('does not exist') ||
      message.includes('column'))
}

function isMissingTableError(error: unknown): boolean {
  const code =
    error && typeof error === 'object' && 'code' in error
      ? String((error as { code?: unknown }).code || '')
      : ''
  const message =
    error && typeof error === 'object' && 'message' in error
      ? String((error as { message?: unknown }).message || '')
      : String(error || '')

  return code === 'PGRST116' ||
    code === 'PGRST205' ||
    message.includes('does not exist') ||
    message.includes('Could not find the table') ||
    message.includes('schema cache')
}

function withoutArtistProfileScope<T extends Record<string, unknown>>(payload: T): Omit<T, 'artist_profile_id'> {
  const { artist_profile_id: _artistProfileId, ...legacyPayload } = payload
  return legacyPayload
}

export async function resolveEpkSlugCandidate({
  userId,
  inputSlug,
  artistName,
  existingSlug,
  slugUpdateMode = 'preserve',
  lookupOwnerBySlug,
}: {
  userId: string
  inputSlug?: string | null
  artistName?: string | null
  existingSlug?: string | null
  slugUpdateMode?: EpkSlugUpdateMode
  lookupOwnerBySlug: (slug: string) => Promise<string | null>
}): Promise<string> {
  const normalizedInput = createEpkSlug(inputSlug || '')
  const artistSlug = createEpkSlug(artistName || '')
  const normalizedExisting = createEpkSlug(existingSlug || '')

  if (normalizedExisting && slugUpdateMode !== 'manual') {
    return normalizedExisting
  }

  const base = normalizedInput || artistSlug

  if (!base) {
    throw new EpkSaveError('Add an artist name or public slug before saving your EPK.', 'invalid_epk_slug', 422)
  }

  const mayAutoSuffix =
    !normalizedInput || normalizedInput === artistSlug || normalizedInput === normalizedExisting

  for (let attempt = 0; attempt < 100; attempt += 1) {
    const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`
    const ownerId = await lookupOwnerBySlug(candidate)

    if (!ownerId || ownerId === userId) return candidate

    if (!mayAutoSuffix) {
      throw new EpkSaveError('That EPK slug is already taken. Choose a different public slug.', 'epk_slug_conflict', 409)
    }
  }

  throw new EpkSaveError('Could not generate a unique EPK slug. Try a more specific artist name.', 'epk_slug_conflict', 409)
}

class EPKService {
  async loadEPKData(
    userId: string,
    profileId?: string | null,
    db: EpkDb = supabase
  ): Promise<EPKData> {
    try {
      const artistProfile = await this.getArtistProfile(userId, profileId, db)
      const contentUserId = artistProfile?.user_id || userId
      const artistProfileId = artistProfile?.id || profileId || null

      const [
        profileSummary,
        epkSettings,
        musicTracks,
        upcomingEvents,
        artistPhotos,
        artistStats
      ] = await Promise.all([
        this.getProfileSummary(contentUserId, db),
        this.getEPKSettings(userId, db, artistProfileId),
        this.getMusicTracks(contentUserId, db),
        this.getUpcomingEvents(contentUserId, db),
        this.getPhotos(contentUserId, db),
        this.getArtistStats(contentUserId, db)
      ])

      // Transform and combine data into EPK format
      return await this.transformToEPKData({
        artistProfileId,
        artistProfile,
        profileSummary,
        epkSettings,
        musicTracks,
        upcomingEvents,
        artistPhotos,
        artistStats,
        db,
      })
    } catch (error) {
      console.error('Error loading EPK data:', error)
      throw new Error('Failed to load EPK data')
    }
  }

  private async getArtistProfile(userId: string, profileId?: string | null, db: EpkDb = supabase) {
    let query = db.from('artist_profiles').select('*')

    if (profileId) {
      query = query.eq('id', profileId)
    } else {
      query = query
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
    }

    const { data: rows, error } = await query

    if (error && error.code !== 'PGRST116') {
      throw error
    }

    const data = Array.isArray(rows) ? rows[0] ?? null : rows
    return data
  }

  private async getEPKSettings(
    userId: string,
    db: EpkDb = supabase,
    artistProfileId?: string | null
  ): Promise<EPKSettings | null> {
    try {
      if (artistProfileId) {
        const { data, error } = await db
          .from('artist_epk_settings')
          .select('*')
          .eq('user_id', userId)
          .eq('artist_profile_id', artistProfileId)
          .maybeSingle()

        if (data) return data

        if (error && error.code !== 'PGRST116') {
          if (!isMissingArtistProfileIdColumn(error)) {
            throw error
          }
        }
      }

      const { data: rows, error } = await db
        .from('artist_epk_settings')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(1)

      if (error && error.code !== 'PGRST116') {
        // If the table doesn't exist, return null instead of throwing
        if (error.message.includes('does not exist')) {
          console.warn('EPK settings table does not exist yet')
          return null
        }
        throw error
      }

      return Array.isArray(rows) ? rows[0] ?? null : rows
    } catch (error) {
      console.warn('Error loading EPK settings:', error)
      return null
    }
  }

  private async getProfileSummary(userId: string, db: EpkDb = supabase) {
    const { data, error } = await db
      .from('profiles')
      .select('avatar_url, cover_image, location, website, social_links')
      .eq('id', userId)
      .maybeSingle()

    if (error) return null
    return data
  }

  private async getMusicTracks(userId: string, db: EpkDb = supabase) {
    try {
      const { data, error } = await db
        .from('artist_music')
        .select('*')
        .eq('user_id', userId)
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(10)

      if (error && error.code !== 'PGRST116') {
        // If the table doesn't exist, return empty array
        if (error.message.includes('does not exist')) {
          console.warn('Artist music table does not exist yet')
          return []
        }
        throw error
      }

      return data || []
    } catch (error) {
      console.warn('Error loading music tracks:', error)
      return []
    }
  }

  private async getUpcomingEvents(userId: string, db: EpkDb = supabase) {
    try {
      const [legacyEventsResult, artistEventsResult, v2EventsResult] = await Promise.all([
        db
          .from('events')
          .select('*')
          .eq('artist_id', userId)
          .eq('status', 'published')
          .gte('event_date', new Date().toISOString().slice(0, 10))
          .order('event_date', { ascending: true })
          .limit(10),
        db
          .from('artist_events')
          .select('*')
          .eq('user_id', userId)
          .gte('event_date', new Date().toISOString())
          .order('event_date', { ascending: true })
          .limit(10),
        db
          .from('events_v2')
          .select('id, title, status, start_at, end_at, capacity, settings')
          .eq('created_by', userId)
          .in('status', ['confirmed', 'advancing', 'onsite'])
          .gte('start_at', new Date().toISOString())
          .order('start_at', { ascending: true })
          .limit(10),
      ])

      if (legacyEventsResult.error && legacyEventsResult.error.code !== 'PGRST116') {
        throw legacyEventsResult.error
      }
      if (artistEventsResult.error && artistEventsResult.error.code !== 'PGRST116') {
        throw artistEventsResult.error
      }
      if (v2EventsResult.error && v2EventsResult.error.code !== 'PGRST116') {
        throw v2EventsResult.error
      }

      const legacyEvents = legacyEventsResult.data || []
      const artistEvents = artistEventsResult.data || []
      const v2Events = (v2EventsResult.data || []).map((event: any) => {
        const settings = event.settings && typeof event.settings === 'object'
          ? event.settings as Record<string, unknown>
          : {}
        return {
          id: event.id,
          event_date: event.start_at ? String(event.start_at).slice(0, 10) : null,
          venue_name: typeof settings.venue_label === 'string' ? settings.venue_label : 'TBA',
          city: typeof settings.venue_city === 'string' ? settings.venue_city : null,
          state: typeof settings.venue_state === 'string' ? settings.venue_state : null,
          ticket_url: typeof settings.ticket_url === 'string' ? settings.ticket_url : '',
          status: event.status,
          capacity: event.capacity,
          expected_attendance: null,
          set_length: null,
          notes: typeof settings.description === 'string' ? settings.description : null,
          name: event.title,
          title: event.title,
        }
      })

      return [...legacyEvents, ...artistEvents, ...v2Events]
        .sort((a: any, b: any) => {
          const firstDate = a.event_date ? new Date(a.event_date).getTime() : Number.MAX_SAFE_INTEGER
          const secondDate = b.event_date ? new Date(b.event_date).getTime() : Number.MAX_SAFE_INTEGER
          return firstDate - secondDate
        })
        .slice(0, 10)
    } catch (error) {
      console.warn('Error loading artist events:', error)
      return []
    }
  }

  private async getPhotos(userId: string, db: EpkDb = supabase) {
    try {
      const { data, error } = await db
        .from('artist_photos')
        .select('*')
        .eq('user_id', userId)
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(20)

      if (error && error.code !== 'PGRST116') {
        if (isMissingTableError(error)) return []
        throw error
      }

      return data || []
    } catch (error) {
      if (isMissingTableError(error)) return []
      console.warn('Error loading photos:', error)
      return []
    }
  }

  private async getArtistStats(userId: string, db: EpkDb = supabase) {
    try {
      // Integrations analytics is the source of truth (not profiles.social_followers)
      const [integrations, artistProfile, tracks, completedLegacyEvents, completedV2Events] = await Promise.all([
        db.from('artist_social_integrations').select('platform, analytics').eq('user_id', userId),
        db
          .from('artist_profiles')
          .select('settings')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        db.from('artist_music').select('stats').eq('user_id', userId),
        db.from('events').select('id', { count: 'exact', head: true }).eq('artist_id', userId).eq('status', 'published'),
        db.from('events_v2').select('id', { count: 'exact', head: true }).eq('created_by', userId).eq('status', 'settled'),
      ])

      let followers = Number((artistProfile.data?.settings as any)?.social_followers_total) || 0
      let youtubeViews = 0
      let monthlyListeners = 0
      let summedFromIntegrations = 0

      try {
        ;(integrations.data || []).forEach((row: any) => {
          const a = row.analytics || {}
          if (a?.status && a.status !== 'synced') return
          const p = String(row.platform)
          if (p === 'youtube') youtubeViews += a?.views || 0
          if (p === 'spotify') monthlyListeners = a?.monthly_listeners || monthlyListeners
          const f = a?.followers || a?.subscribers || 0
          summedFromIntegrations += Number(f) || 0
        })
      } catch {}

      if (!followers) followers = summedFromIntegrations

      const totalTrackStreams = (tracks.data || []).reduce((sum: number, t: any) => sum + (t?.stats?.plays || 0), 0)
      const totalStreams = totalTrackStreams + youtubeViews
      const eventsPlayed = (completedLegacyEvents.count || 0) + (completedV2Events.count || 0)

      return {
        followers,
        monthlyListeners,
        totalStreams,
        eventsPlayed
      }
    } catch {
      return {
        followers: 0,
        monthlyListeners: 0,
        totalStreams: 0,
        eventsPlayed: 0
      }
    }
  }

  private async transformToEPKData({
    artistProfileId,
    artistProfile,
    profileSummary,
    epkSettings,
    musicTracks,
    upcomingEvents,
    artistPhotos,
    artistStats,
    db = supabase,
  }: any): Promise<EPKData> {
    const artistName = artistProfile?.artist_name || ''
    const epkSlug = epkSettings?.epk_slug || createEpkSlug(artistName)

    const socialLinks = artistProfile?.social_links || profileSummary?.social_links || {}
    const professionalSettings = artistProfile?.settings?.professional || {}
    const preferences = artistProfile?.settings?.preferences || {}

    // Build platform follower map from integrations analytics if available
    const followersMap: Record<string, number> = {}
    try {
      const { data: integrations } = await db
        .from('artist_social_integrations')
        .select('platform, analytics')
        .eq('user_id', artistProfile?.user_id)
      integrations?.forEach((row: any) => {
        const a = row.analytics || {}
        const p = String(row.platform).toLowerCase()
        followersMap[p] = a?.followers || a?.subscribers || a?.data?.[0]?.values?.[0]?.value || 0
      })
    } catch {}

    // Transform social links to EPK format and attach follower counts when available
    const social = Object.entries(socialLinks)
      .filter(([platform, url]) => url && typeof url === 'string' && url.trim())
      .map(([platform, url], index) => ({
        id: `${platform}-${index}`,
        platform: platform.charAt(0).toUpperCase() + platform.slice(1),
        url: url as string,
        username: this.extractUsernameFromUrl(url as string, platform),
        verified: false,
        followers: followersMap[platform.toLowerCase()] || undefined
      }))

    // Transform music tracks
    const music = musicTracks.map((track: any) => ({
      id: track.id,
      title: track.title || 'Untitled',
      url: track.file_url || track.spotify_url || track.apple_music_url || track.soundcloud_url || track.youtube_url || '',
      releaseDate: track.release_date || track.created_at,
      streams: track.stats?.plays || 0,
      coverArt: track.cover_art_url || '',
      platform: 'Tourify',
      featured: track.is_featured || false
    }))

    // Transform events from unified events table structure with legacy fallback support
    const upcomingShows = upcomingEvents.map((event: any) => ({
      id: event.id,
      date: event.event_date,
      venue: event.venue_name || event.name || 'TBA',
      location: event.city && event.state
        ? `${event.city}, ${event.state}`
        : event.venue_city && event.venue_state
          ? `${event.venue_city}, ${event.venue_state}`
          : (event.city || event.state || event.venue_city || event.venue_state || 'TBA'),
      ticketUrl: event.ticket_url || '',
      status: event.status === 'upcoming' ? 'upcoming' as const : 
              event.status === 'completed' ? 'completed' as const :
              event.status === 'cancelled' ? 'cancelled' as const : 'upcoming' as const,
      capacity: event.capacity,
      attendance: event.expected_attendance,
      setLength: event.set_length,
      notes: event.notes || event.description,
      poster: event.poster_url,
      featured: event.is_epk_featured || false
    }))

    // Transform photos
    const photos = artistPhotos.map((photo: any) => ({
      id: photo.id,
      url: photo.image_url || photo.file_url || '',
      caption: photo.caption || photo.title || photo.description || '',
      isHero: photo.is_featured || false
    }))

    // Build contact information
    const contact = {
      email: professionalSettings.contact_email || '',
      phone: professionalSettings.phone || '',
      website: socialLinks.website || '',
      bookingEmail: artistProfile?.booking_email || professionalSettings.contact_email || '',
      managementEmail: '',
      address: professionalSettings.location || '',
      businessName: artistProfile?.artist_name || '',
      timezone: 'UTC',
      availability: professionalSettings.availability || '',
      preferredContact: preferences.preferred_contact || 'email' as const,
      verified: {
        email: false,
        phone: false,
        website: false
      }
    }

    const settings = epkSettings?.settings || {}
    const savedMusic = Array.isArray(settings?.musicItems) ? settings.musicItems : null
    const savedPhotos = Array.isArray(settings?.photoItems) ? settings.photoItems : null
    const savedShows = Array.isArray(settings?.upcomingShows) ? settings.upcomingShows : null
    const savedStats =
      settings?.stats && typeof settings.stats === 'object' && !Array.isArray(settings.stats)
        ? settings.stats
        : null
    const sectionOrder = Array.isArray(settings?.layout?.sectionOrder)
      ? settings.layout.sectionOrder
      : ['hero', 'one-liner', 'bio', 'music', 'stats', 'shows', 'press', 'media', 'contact', 'social', 'booking']
    const sectionVisibility = settings?.layout?.sectionVisibility && typeof settings.layout.sectionVisibility === 'object'
      ? settings.layout.sectionVisibility
      : {
        hero: true,
        "one-liner": true,
        bio: true,
        music: true,
        stats: true,
        shows: true,
        press: true,
        media: true,
        contact: true,
        social: true,
        booking: true
      }
    const quality = computeEPKQuality({
      artistName,
      bio: artistProfile?.bio || '',
      musicCount: (savedMusic || music).length,
      photoCount: (savedPhotos || photos).length,
      hasPress: Array.isArray(settings?.pressItems) && settings.pressItems.length > 0,
      hasBookingEmail: Boolean(contact.bookingEmail || contact.email),
      hasOneLiner: Boolean(settings?.bookingAssets?.oneLiner)
    })

    return {
      artistProfileId: artistProfileId || epkSettings?.artist_profile_id || artistProfile?.id || null,
      epkSlug,
      artistName: artistProfile?.artist_name || '',
      bio: artistProfile?.bio || '',
      genre: artistProfile?.genres?.[0] || '',
      location: professionalSettings.location || '',
      avatarUrl: profileSummary?.avatar_url || '',
      coverUrl: profileSummary?.cover_image || photos.find((photo: any) => photo.isHero)?.url || '',
      theme: epkSettings?.theme || 'dark',
      template: epkSettings?.template || 'modern',
      isPublic: epkSettings?.is_public ?? false,
      stats: {
        followers: Number(savedStats?.followers ?? artistStats.followers) || 0,
        monthlyListeners: Number(savedStats?.monthlyListeners ?? artistStats.monthlyListeners) || 0,
        totalStreams: Number(savedStats?.totalStreams ?? artistStats.totalStreams) || 0,
        eventsPlayed: Number(savedStats?.eventsPlayed ?? artistStats.eventsPlayed) || 0,
      },
      music: savedMusic || music,
      photos: savedPhotos || photos,
      press: Array.isArray(settings?.pressItems) ? settings.pressItems : [],
      contact,
      social,
      upcomingShows: savedShows || upcomingShows,
      customDomain: epkSettings?.custom_domain || '',
      seoTitle: epkSettings?.seo_title || `${artistProfile?.artist_name} - Electronic Press Kit`,
      seoDescription: epkSettings?.seo_description || artistProfile?.bio || '',
      layout: {
        preset: settings?.layout?.preset || 'booker',
        sectionOrder,
        sectionVisibility
      },
      bookingAssets: {
        techRiderUrl: settings?.bookingAssets?.techRiderUrl || '',
        stagePlotUrl: settings?.bookingAssets?.stagePlotUrl || '',
        oneLiner: settings?.bookingAssets?.oneLiner || ''
      },
      quality,
      epkFont: normalizeEpkFontId(settings.epkFont),
      epkAppearance: normalizeEpkAppearance(settings.epkAppearance, epkSettings?.template)
    }
  }

  private extractUsernameFromUrl(url: string, platform: string): string {
    try {
      const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`)
      const pathname = urlObj.pathname.replace(/^\//, '').replace(/\/$/, '')
      
      // Handle different platform URL structures
      switch (platform.toLowerCase()) {
        case 'instagram':
        case 'twitter':
        case 'tiktok':
          return pathname.split('/')[0] || ''
        case 'youtube':
          if (pathname.startsWith('c/') || pathname.startsWith('channel/')) {
            return pathname.split('/')[1] || ''
          }
          return pathname.split('/')[0] || ''
        case 'spotify':
          if (pathname.includes('artist/')) {
            return pathname.split('artist/')[1]?.split('/')[0] || ''
          }
          return ''
        default:
          return pathname.split('/')[0] || ''
      }
    } catch {
      return ''
    }
  }

  async saveEPKData(
    userId: string,
    epkData: Partial<EPKData>,
    db: EpkDb = supabase,
    artistProfileId?: string | null
  ): Promise<SaveEPKSuccess | SaveEPKFailure> {
    try {
      const scopedArtistProfileId = artistProfileId || epkData.artistProfileId || null
      const existing = await this.getEPKSettings(userId, db, scopedArtistProfileId)
      const normalizedEpkData = this.normalizeSavePayload(epkData, existing)
      const epkSlug = await this.resolveEpkSlugForSave(userId, normalizedEpkData, existing, db, scopedArtistProfileId)

      if (this.hasBasicInfoChanges(normalizedEpkData)) {
        await this.updateArtistProfile(userId, normalizedEpkData, db, scopedArtistProfileId)
      }

      await this.updateProfileSummary(userId, normalizedEpkData, db)

      if (this.hasEPKSettingsChanges(normalizedEpkData)) {
        await this.saveEPKSettings(
          userId,
          { ...normalizedEpkData, artistProfileId: scopedArtistProfileId, epkSlug },
          existing,
          db
        )
      }

      const data = await this.loadEPKData(userId, scopedArtistProfileId, db)
      const saveState = await this.getEPKSaveState(userId, data.artistProfileId || scopedArtistProfileId, db)

      return {
        success: true,
        data,
        publicUrl: `/epk/${data.epkSlug || epkSlug}`,
        lastSavedAt: saveState.lastSavedAt,
        artistProfileId: data.artistProfileId,
        epkSlug: data.epkSlug || epkSlug,
        isPublic: data.isPublic,
      }
    } catch (error) {
      console.error('Error saving EPK data:', error)
      if (error instanceof EpkSaveError) {
        return {
          success: false,
          error: error.message,
          code: error.code,
          status: error.status,
        }
      }
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to save EPK data',
        code: 'epk_save_failed',
        status: 500,
      }
    }
  }

  async getEPKSaveState(
    userId: string,
    artistProfileId?: string | null,
    db: EpkDb = supabase
  ): Promise<EPKSaveState> {
    const epkSettings = await this.getEPKSettings(userId, db, artistProfileId)

    return {
      hasSavedEpk: Boolean(epkSettings),
      publicUrl: epkSettings?.epk_slug ? `/epk/${epkSettings.epk_slug}` : null,
      lastSavedAt: epkSettings?.updated_at || epkSettings?.created_at || null,
      isPublic: Boolean(epkSettings?.is_public),
    }
  }

  private normalizeSavePayload(
    epkData: Partial<EPKData>,
    existing: EPKSettings | null
  ): Partial<EPKData> {
    const rawAppearance = (epkData as Record<string, unknown>).epkAppearance
    if (rawAppearance === undefined) return epkData

    const invalidFields = invalidEpkAppearanceHexFields(rawAppearance)
    if (invalidFields.length > 0) {
      throw new EpkSaveError(
        `Invalid EPK color value for ${invalidFields.join(', ')}. Use a 6-digit hex color like #6366f1 or clear the field.`,
        'invalid_epk_appearance',
        422
      )
    }

    return {
      ...epkData,
      epkAppearance: normalizeEpkAppearance(
        rawAppearance,
        epkData.template || existing?.template || 'modern'
      ),
    }
  }

  private hasBasicInfoChanges(epkData: Partial<EPKData>): boolean {
    return !!(
      epkData.artistName ||
      epkData.bio ||
      epkData.genre ||
      epkData.location ||
      epkData.contact ||
      epkData.social
    )
  }

  private hasEPKSettingsChanges(epkData: Partial<EPKData>): boolean {
    return !!(
      epkData.theme ||
      epkData.template ||
      epkData.isPublic !== undefined ||
      epkData.customDomain ||
      epkData.seoTitle ||
      epkData.seoDescription ||
      epkData.layout ||
      epkData.bookingAssets ||
      epkData.epkFont ||
      epkData.epkAppearance ||
      epkData.epkSlug ||
      epkData.artistName ||
      epkData.music !== undefined ||
      epkData.photos !== undefined ||
      epkData.upcomingShows !== undefined ||
      epkData.stats !== undefined ||
      epkData.press !== undefined
    )
  }

  private async updateArtistProfile(
    userId: string,
    epkData: Partial<EPKData>,
    db: EpkDb = supabase,
    artistProfileId?: string | null
  ) {
    const updates: any = {}

    if (epkData.artistName) updates.artist_name = epkData.artistName
    if (epkData.bio) updates.bio = epkData.bio
    if (epkData.genre) updates.genres = [epkData.genre]

    // Update social links
    if (epkData.social) {
      const socialLinks: Record<string, string> = {}
      epkData.social.forEach(link => {
        const platform = link.platform.toLowerCase()
        socialLinks[platform] = link.url
      })
      updates.social_links = socialLinks
    }

    // Update professional settings
    if (epkData.contact || epkData.location) {
      let currentProfileQuery = db
        .from('artist_profiles')
        .select('settings')
        .eq('user_id', userId)

      if (artistProfileId) currentProfileQuery = currentProfileQuery.eq('id', artistProfileId)

      const { data: currentProfile } = await currentProfileQuery.maybeSingle()

      const currentSettings = currentProfile?.settings || {}
      const professionalSettings = currentSettings.professional || {}

      if (epkData.contact) {
        professionalSettings.contact_email = epkData.contact.email
        professionalSettings.phone = epkData.contact.phone
        professionalSettings.availability = epkData.contact.availability
      }

      if (epkData.location) {
        professionalSettings.location = epkData.location
      }

      updates.settings = {
        ...currentSettings,
        professional: professionalSettings
      }
    }

    if (Object.keys(updates).length > 0) {
      updates.updated_at = new Date().toISOString()

      let updateQuery = db
        .from('artist_profiles')
        .update(updates)
        .eq('user_id', userId)

      if (artistProfileId) updateQuery = updateQuery.eq('id', artistProfileId)

      const { error } = await updateQuery

      if (error) throw error
    }
  }

  private async updateProfileSummary(userId: string, epkData: Partial<EPKData>, db: EpkDb = supabase) {
    const updates: Record<string, string> = {}
    if (epkData.avatarUrl) updates.avatar_url = epkData.avatarUrl
    if (epkData.coverUrl) updates.cover_image = epkData.coverUrl

    if (Object.keys(updates).length === 0) return

    const { error } = await db
      .from('profiles')
      .update(updates)
      .eq('id', userId)

    if (error) throw error
  }

  private async resolveEpkSlugForSave(
    userId: string,
    epkData: Partial<EPKData>,
    existing: EPKSettings | null,
    db: EpkDb = supabase,
    artistProfileId?: string | null
  ): Promise<string> {
    const ownerKey = artistProfileId || userId

    return resolveEpkSlugCandidate({
      userId: ownerKey,
      inputSlug: epkData.epkSlug,
      artistName: epkData.artistName,
      existingSlug: existing?.epk_slug,
      slugUpdateMode: epkData.epkSlugUpdateMode,
      lookupOwnerBySlug: async (candidate) => {
        const { data, error } = await db
          .from('artist_epk_settings')
          .select('user_id, artist_profile_id')
          .eq('epk_slug', candidate)
          .maybeSingle()

        if (error && isMissingArtistProfileIdColumn(error)) {
          const { data: legacyData, error: legacyError } = await db
            .from('artist_epk_settings')
            .select('user_id')
            .eq('epk_slug', candidate)
            .maybeSingle()

          if (legacyError && !legacyError.message.includes('does not exist')) throw legacyError
          return legacyData?.user_id ? String(legacyData.user_id) : null
        }

        if (error && !error.message.includes('does not exist')) throw error
        return data?.artist_profile_id || data?.user_id
          ? String(data.artist_profile_id || data.user_id)
          : null
      },
    })
  }

  private async saveEPKSettings(
    userId: string,
    epkData: Partial<EPKData>,
    existing: EPKSettings | null,
    db: EpkDb = supabase
  ) {
    const prev =
      existing?.settings && typeof existing.settings === 'object'
        ? (existing.settings as Record<string, unknown>)
        : {}
    const template = epkData.template || existing?.template || 'modern'
    const nextSettings = {
      ...prev,
      pressItems: Array.isArray(epkData.press)
        ? epkData.press
        : Array.isArray(prev.pressItems)
          ? prev.pressItems
          : [],
      layout: epkData.layout ?? prev.layout,
      bookingAssets: epkData.bookingAssets ?? prev.bookingAssets,
      musicItems: Array.isArray(epkData.music)
        ? epkData.music
        : Array.isArray(prev.musicItems)
          ? prev.musicItems
          : [],
      photoItems: Array.isArray(epkData.photos)
        ? epkData.photos
        : Array.isArray(prev.photoItems)
          ? prev.photoItems
          : [],
      upcomingShows: Array.isArray(epkData.upcomingShows)
        ? epkData.upcomingShows
        : Array.isArray(prev.upcomingShows)
          ? prev.upcomingShows
          : [],
      stats:
        epkData.stats && typeof epkData.stats === 'object'
          ? epkData.stats
          : prev.stats,
      epkFont: epkData.epkFont ?? prev.epkFont ?? 'sans',
      epkAppearance:
        epkData.epkAppearance !== undefined
          ? normalizeEpkAppearance(epkData.epkAppearance, template)
          : normalizeEpkAppearance(prev.epkAppearance, template)
    }

    const epkSettings: Partial<EPKSettings> = {
      user_id: userId,
      artist_profile_id: epkData.artistProfileId ?? existing?.artist_profile_id ?? null,
      theme: epkData.theme || existing?.theme || 'dark',
      template,
      is_public: epkData.isPublic ?? existing?.is_public ?? false,
      custom_domain:
        epkData.customDomain !== undefined
          ? epkData.customDomain || undefined
          : existing?.custom_domain || undefined,
      seo_title:
        epkData.seoTitle !== undefined
          ? epkData.seoTitle || undefined
          : existing?.seo_title || undefined,
      seo_description:
        epkData.seoDescription !== undefined
          ? epkData.seoDescription || undefined
          : existing?.seo_description || undefined,
      epk_slug: epkData.epkSlug || createEpkSlug(epkData.artistName || ''),
      settings: nextSettings,
    }

    if (existing?.id) {
      const { error } = await db
        .from('artist_epk_settings')
        .update(epkSettings)
        .eq('id', existing.id)

      if (error && isMissingArtistProfileIdColumn(error)) {
        const { error: legacyError } = await db
          .from('artist_epk_settings')
          .update(withoutArtistProfileScope(epkSettings as Record<string, unknown>))
          .eq('id', existing.id)

        if (legacyError) throw legacyError
        return
      }

      if (error) throw error
      return
    }

    const { error: insertError } = await db
      .from('artist_epk_settings')
      .insert({
        ...epkSettings,
        created_at: new Date().toISOString()
      })

    if (insertError && isMissingArtistProfileIdColumn(insertError)) {
      const { error: legacyInsertError } = await db
        .from('artist_epk_settings')
        .upsert({
          ...withoutArtistProfileScope(epkSettings as Record<string, unknown>),
          created_at: new Date().toISOString()
        }, { onConflict: 'user_id' })

      if (legacyInsertError) throw legacyInsertError
      return
    }

    if (insertError) {
      throw insertError
    }
  }

  async getPublicEPKDataForUser(
    userId: string,
    db: EpkDb = supabase,
    artistProfileId?: string | null
  ): Promise<EPKData | null> {
    const epkSettings = await this.getEPKSettings(userId, db, artistProfileId)
    if (!epkSettings?.is_public) return null
    return await this.loadEPKData(userId, epkSettings.artist_profile_id || artistProfileId || null, db)
  }

  async getPublicEPKData(artistSlug: string, db: EpkDb = supabase): Promise<EPKData | null> {
    try {
      const normalizedSlug = createEpkSlug(artistSlug)
      const { data: publicSettings, error: publicSettingsError } = await db
        .from('artist_epk_settings')
        .select('user_id, artist_profile_id, is_public, epk_slug')
        .eq('epk_slug', normalizedSlug)
        .eq('is_public', true)
        .maybeSingle()

      if (publicSettingsError && isMissingArtistProfileIdColumn(publicSettingsError)) {
        const { data: legacyPublicSettings, error: legacyPublicSettingsError } = await db
          .from('artist_epk_settings')
          .select('user_id, is_public, epk_slug')
          .eq('epk_slug', normalizedSlug)
          .eq('is_public', true)
          .maybeSingle()

        if (legacyPublicSettingsError && !legacyPublicSettingsError.message.includes('does not exist')) return null
        if (legacyPublicSettings?.user_id) {
          return await this.loadEPKData(legacyPublicSettings.user_id, null, db)
        }
      } else if (publicSettingsError && !publicSettingsError.message.includes('does not exist')) {
        return null
      }

      if (publicSettings?.user_id) {
        return await this.loadEPKData(
          publicSettings.user_id,
          publicSettings.artist_profile_id || null,
          db
        )
      }

      // Legacy fallback while old links are still in circulation
      const { data: artistProfile } = await db
        .from('artist_profiles')
        .select('user_id, artist_name')
        .ilike('artist_name', artistSlug.replace(/-/g, ' '))
        .maybeSingle()

      if (!artistProfile?.user_id) return null

      const epkSettings = await this.getEPKSettings(artistProfile.user_id, db)
      if (!epkSettings?.is_public) return null

      return await this.loadEPKData(artistProfile.user_id, epkSettings.artist_profile_id || null, db)
    } catch (error) {
      console.error('Error loading public EPK data:', error)
      return null
    }
  }
}

export const epkService = new EPKService()
export type { EPKData, EPKSettings, EpkAppearance } 

export function createEpkSlug(input: string): string {
  return String(input || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export function computeEPKQuality(input: {
  artistName: string
  bio: string
  musicCount: number
  photoCount: number
  hasPress: boolean
  hasBookingEmail: boolean
  hasOneLiner: boolean
}): { score: number; missing: string[] } {
  const missing: string[] = []
  if (!input.artistName) missing.push('artist name')
  if (!input.bio || input.bio.length < 120) missing.push('full bio')
  if (input.musicCount < 3) missing.push('at least 3 tracks')
  if (input.photoCount < 4) missing.push('at least 4 press photos')
  if (!input.hasPress) missing.push('press highlights')
  if (!input.hasBookingEmail) missing.push('booking contact')
  if (!input.hasOneLiner) missing.push('one-line artist pitch')

  const maxChecks = 7
  const passed = maxChecks - missing.length
  return { score: Math.max(0, Math.round((passed / maxChecks) * 100)), missing }
}
