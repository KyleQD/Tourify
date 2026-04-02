import { supabase } from '@/lib/supabase/client'
import { normalizeEpkAppearance, type EpkAppearance } from '@/lib/epk/epk-appearance'

interface EPKData {
  epkSlug: string
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
  epkFont: 'sans' | 'serif' | 'display' | 'geometric' | 'mono'
  epkAppearance: EpkAppearance
}

interface EPKSettings {
  id?: string
  user_id: string
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

class EPKService {
  async loadEPKData(userId: string): Promise<EPKData> {
    try {
      // Load all data in parallel for better performance
      const [
        artistProfile,
        profileSummary,
        epkSettings,
        musicTracks,
        upcomingEvents,
        artistPhotos,
        artistStats
      ] = await Promise.all([
        this.getArtistProfile(userId),
        this.getProfileSummary(userId),
        this.getEPKSettings(userId),
        this.getMusicTracks(userId),
        this.getUpcomingEvents(userId),
        this.getPhotos(userId),
        this.getArtistStats(userId)
      ])

      // Transform and combine data into EPK format
      return await this.transformToEPKData({
        artistProfile,
        profileSummary,
        epkSettings,
        musicTracks,
        upcomingEvents,
        artistPhotos,
        artistStats
      })
    } catch (error) {
      console.error('Error loading EPK data:', error)
      throw new Error('Failed to load EPK data')
    }
  }

  private async getArtistProfile(userId: string) {
    const { data, error } = await supabase
      .from('artist_profiles')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') {
      throw error
    }

    return data
  }

  private async getEPKSettings(userId: string): Promise<EPKSettings | null> {
    try {
      const { data, error } = await supabase
        .from('artist_epk_settings')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error && error.code !== 'PGRST116') {
        // If the table doesn't exist, return null instead of throwing
        if (error.message.includes('does not exist')) {
          console.warn('EPK settings table does not exist yet')
          return null
        }
        throw error
      }

      return data
    } catch (error) {
      console.warn('Error loading EPK settings:', error)
      return null
    }
  }

  private async getProfileSummary(userId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('avatar_url, cover_image, location, website, social_links')
      .eq('id', userId)
      .maybeSingle()

    if (error) return null
    return data
  }

  private async getMusicTracks(userId: string) {
    try {
      const { data, error } = await supabase
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

  private async getUpcomingEvents(userId: string) {
    try {
      const [legacyEventsResult, artistEventsResult, v2EventsResult] = await Promise.all([
        supabase
          .from('events')
          .select('*')
          .eq('artist_id', userId)
          .eq('status', 'published')
          .gte('event_date', new Date().toISOString().slice(0, 10))
          .order('event_date', { ascending: true })
          .limit(10),
        supabase
          .from('artist_events')
          .select('*')
          .eq('user_id', userId)
          .gte('event_date', new Date().toISOString())
          .order('event_date', { ascending: true })
          .limit(10),
        supabase
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

  private async getPhotos(userId: string) {
    try {
      const { data, error } = await supabase
        .from('artist_photos')
        .select('*')
        .eq('user_id', userId)
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(20)

      if (error && error.code !== 'PGRST116') {
        // If the table doesn't exist, return empty array
        if (error.message.includes('does not exist')) {
          console.warn('Artist photos table does not exist yet')
          return []
        }
        throw error
      }

      return data || []
    } catch (error) {
      console.warn('Error loading photos:', error)
      return []
    }
  }

  private async getArtistStats(userId: string) {
    try {
      // Fetch integrations analytics and profile aggregate
      const [integrations, profileAgg, tracks, completedLegacyEvents, completedV2Events] = await Promise.all([
        supabase.from('artist_social_integrations').select('platform, analytics').eq('user_id', userId),
        supabase.from('profiles').select('social_followers').eq('id', userId).single(),
        supabase.from('artist_music').select('stats').eq('user_id', userId),
        supabase.from('events').select('id', { count: 'exact', head: true }).eq('artist_id', userId).eq('status', 'published'),
        supabase.from('events_v2').select('id', { count: 'exact', head: true }).eq('created_by', userId).eq('status', 'settled'),
      ])

      // Followers from profile aggregate with fallback to integrations
      let followers = profileAgg.data?.social_followers || 0
      let youtubeViews = 0
      let instagramLikes = 0
      let facebookEngaged = 0
      let monthlyListeners = 0

      try {
        (integrations.data || []).forEach((row: any) => {
          const a = row.analytics || {}
          const p = String(row.platform)
          // Heuristics per platform
          if (p === 'youtube') youtubeViews += a?.views || a?.data?.[0]?.values?.[0]?.value || 0
          if (p === 'instagram') instagramLikes += a?.total_likes || a?.data?.[0]?.values?.[0]?.value || 0
          if (p === 'facebook') facebookEngaged += a?.data?.[0]?.values?.[0]?.value || 0
          if (p === 'spotify') monthlyListeners = a?.monthly_listeners || monthlyListeners
          // If no profile aggregate followers, approximate by summing platform follower-like metrics
          if (!profileAgg.data?.social_followers) {
            const f = a?.followers || a?.subscribers || a?.data?.[0]?.values?.[0]?.value || 0
            followers += f
          }
        })
      } catch {}

      // Sum track streams if available
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
    artistProfile,
    profileSummary,
    epkSettings,
    musicTracks,
    upcomingEvents,
    artistPhotos,
    artistStats
  }: any): Promise<EPKData> {
    const artistName = artistProfile?.artist_name || ''
    const epkSlug = epkSettings?.epk_slug || createEpkSlug(artistName)

    const socialLinks = artistProfile?.social_links || profileSummary?.social_links || {}
    const professionalSettings = artistProfile?.settings?.professional || {}
    const preferences = artistProfile?.settings?.preferences || {}

    // Build platform follower map from integrations analytics if available
    const followersMap: Record<string, number> = {}
    try {
      const { data: integrations } = await supabase
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
      musicCount: music.length,
      photoCount: photos.length,
      hasPress: Array.isArray(settings?.pressItems) && settings.pressItems.length > 0,
      hasBookingEmail: Boolean(contact.bookingEmail || contact.email),
      hasOneLiner: Boolean(settings?.bookingAssets?.oneLiner)
    })

    return {
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
      stats: artistStats,
      music,
      photos,
      press: Array.isArray(settings?.pressItems) ? settings.pressItems : [],
      contact,
      social,
      upcomingShows,
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
      epkFont: (settings.epkFont as EPKData['epkFont']) || 'sans',
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

  async saveEPKData(userId: string, epkData: Partial<EPKData>): Promise<{ success: boolean; error?: string }> {
    try {
      // Start transaction-like operations
      const updates = []

      // Update artist profile if basic info has changed
      if (this.hasBasicInfoChanges(epkData)) {
        updates.push(this.updateArtistProfile(userId, epkData))
      }

      // Update/create EPK settings
      if (this.hasEPKSettingsChanges(epkData)) {
        updates.push(this.saveEPKSettings(userId, epkData))
      }

      // Wait for all updates to complete
      await Promise.all(updates)

      return { success: true }
    } catch (error) {
      console.error('Error saving EPK data:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to save EPK data'
      }
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
      epkData.press !== undefined
    )
  }

  private async updateArtistProfile(userId: string, epkData: Partial<EPKData>) {
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
      const { data: currentProfile } = await supabase
        .from('artist_profiles')
        .select('settings')
        .eq('user_id', userId)
        .single()

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

      const { error } = await supabase
        .from('artist_profiles')
        .update(updates)
        .eq('user_id', userId)

      if (error) throw error
    }
  }

    private async saveEPKSettings(userId: string, epkData: Partial<EPKData>) {
    try {
      const existing = await this.getEPKSettings(userId)
      const prev =
        existing?.settings && typeof existing.settings === 'object'
          ? (existing.settings as Record<string, unknown>)
          : {}
      const nextSettings = {
        ...prev,
        pressItems: Array.isArray(epkData.press)
          ? epkData.press
          : Array.isArray(prev.pressItems)
            ? prev.pressItems
            : [],
        layout: epkData.layout ?? prev.layout,
        bookingAssets: epkData.bookingAssets ?? prev.bookingAssets,
        epkFont: epkData.epkFont ?? prev.epkFont ?? 'sans',
        epkAppearance:
          epkData.epkAppearance !== undefined
            ? epkData.epkAppearance
            : (prev.epkAppearance as EpkAppearance | undefined) ??
              normalizeEpkAppearance(undefined, epkData.template || 'modern')
      }

      const epkSettings: Partial<EPKSettings> = {
        user_id: userId,
        theme: epkData.theme || 'dark',
        template: epkData.template || 'modern',
        is_public: epkData.isPublic ?? false,
        custom_domain: epkData.customDomain || undefined,
        seo_title: epkData.seoTitle || undefined,
        seo_description: epkData.seoDescription || undefined,
        epk_slug: epkData.epkSlug || createEpkSlug(epkData.artistName || ''),
        settings: nextSettings,
        updated_at: new Date().toISOString()
      }

      const { error: upsertError } = await supabase
        .from('artist_epk_settings')
        .upsert({
          ...epkSettings,
          created_at: new Date().toISOString()
        }, { onConflict: 'user_id' })

      if (upsertError) {
        if (upsertError.message.includes('does not exist')) {
          console.warn('EPK settings table does not exist yet, skipping settings save')
          return
        }
        throw upsertError
      }
    } catch (error) {
      console.warn('Error saving EPK settings:', error)
      // Don't throw error, just continue without saving settings
    }
  }

  async getPublicEPKData(artistSlug: string): Promise<EPKData | null> {
    try {
      const normalizedSlug = createEpkSlug(artistSlug)
      const { data: publicSettings, error: publicSettingsError } = await supabase
        .from('artist_epk_settings')
        .select('user_id, is_public, epk_slug')
        .eq('epk_slug', normalizedSlug)
        .eq('is_public', true)
        .maybeSingle()

      if (publicSettingsError && !publicSettingsError.message.includes('does not exist')) return null
      if (publicSettings?.user_id) return await this.loadEPKData(publicSettings.user_id)

      // Legacy fallback while old links are still in circulation
      const { data: artistProfile } = await supabase
        .from('artist_profiles')
        .select('user_id, artist_name')
        .ilike('artist_name', artistSlug.replace(/-/g, ' '))
        .maybeSingle()

      if (!artistProfile?.user_id) return null

      const epkSettings = await this.getEPKSettings(artistProfile.user_id)
      if (!epkSettings?.is_public) return null

      return await this.loadEPKData(artistProfile.user_id)
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