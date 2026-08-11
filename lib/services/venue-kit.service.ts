/**
 * Venue Kit Service
 * Venue equivalent of lib/services/epk.service.ts
 * Manages loading, saving, and publishing Venue Kit data.
 */
import { supabase } from '@/lib/supabase'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import {
  invalidEpkAppearanceHexFields,
  normalizeEpkAppearance,
  DEFAULT_EPK_APPEARANCE,
  type EpkAppearance,
} from '@/lib/epk/epk-appearance'
import { normalizeEpkFontId, type EpkFontId } from '@/lib/epk/epk-preview-utils'
import { createEpkSlug } from '@/lib/services/epk.service'

type VkDb = SupabaseClient<Database>
type VkSlugUpdateMode = 'preserve' | 'manual'

// ─────────────────────────────────────────────────────────────────────────────
// VKData — the canonical in-memory shape for a Venue Kit
// ─────────────────────────────────────────────────────────────────────────────
export interface VKData {
  // Meta / publishing
  venueProfileId: string | null
  vkSlug: string
  vkSlugUpdateMode?: VkSlugUpdateMode
  isPublic: boolean
  customDomain: string
  seoTitle: string
  seoDescription: string

  // Identity
  venueName: string
  tagline: string
  bio: string
  venueTypes: string[]
  location: {
    address: string
    city: string
    state: string
    country: string
    postalCode: string
    neighborhood: string
  }
  website: string
  avatarUrl: string
  coverUrl: string

  // Technical specs
  specs: {
    capacityTotal: number
    capacitySeated: number
    capacityStanding: number
    stageDimensions: string
    soundSystem: string
    lightingRig: string
    loadingDock: boolean
    greenRooms: number
    parkingSpots: number
    curfew: string
    ageRestrictions: string
  }

  // Amenities (string array matching venue_profiles.amenities)
  amenities: string[]

  // Media
  photos: {
    id: string
    url: string
    caption: string
    isHero: boolean
  }[]

  // Upcoming shows
  upcomingShows: {
    id: string
    date: string
    artistName: string
    title: string
    ticketUrl: string
    status: 'upcoming' | 'completed' | 'cancelled'
  }[]

  // Press
  press: {
    id: string
    title: string
    outlet: string
    url: string
    date: string
    excerpt: string
  }[]

  // Contact & booking assets
  contact: {
    email: string
    phone: string
    bookingEmail: string
    website: string
    techRiderUrl: string
    stagePlotUrl: string
  }

  // Social links
  social: {
    id: string
    platform: string
    url: string
    username: string
  }[]

  // Appearance — reuses EPK appearance system directly
  theme: string
  template: string
  vkFont: EpkFontId
  vkAppearance: EpkAppearance
  useVkStyleOnProfile: boolean

  // Layout (controls section order on the single-page document)
  layout: {
    sectionOrder: string[]
    sectionVisibility: Record<string, boolean>
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal DB row shape for venue_kit_settings
// ─────────────────────────────────────────────────────────────────────────────
interface VKSettings {
  id?: string
  user_id: string
  venue_profile_id?: string | null
  theme: string
  template: string
  is_public: boolean
  vk_slug?: string
  custom_domain?: string
  seo_title?: string
  seo_description?: string
  use_vk_style_on_profile: boolean
  settings: Record<string, unknown>
  created_at?: string
  updated_at?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Return types
// ─────────────────────────────────────────────────────────────────────────────
export type SaveVKSuccess = {
  success: true
  data: VKData
  publicUrl: string
  lastSavedAt: string | null
  venueProfileId: string | null
  vkSlug: string
  isPublic: boolean
}

export type SaveVKFailure = {
  success: false
  error: string
  code: string
  status: number
}

export type VKSaveState = {
  hasSavedVk: boolean
  publicUrl: string | null
  lastSavedAt: string | null
  isPublic: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// Error class
// ─────────────────────────────────────────────────────────────────────────────
export class VkSaveError extends Error {
  code: string
  status: number

  constructor(message: string, code = 'vk_save_failed', status = 500) {
    super(message)
    this.name = 'VkSaveError'
    this.code = code
    this.status = status
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Default section order for Venue Kit document
// ─────────────────────────────────────────────────────────────────────────────
export const VK_DEFAULT_SECTION_ORDER = [
  'hero',
  'bio',
  'specs',
  'amenities',
  'shows',
  'gallery',
  'press',
  'contact',
  'social',
] as const

export type VkSectionKey = (typeof VK_DEFAULT_SECTION_ORDER)[number]

function defaultSectionVisibility(): Record<string, boolean> {
  return Object.fromEntries(VK_DEFAULT_SECTION_ORDER.map((k) => [k, true]))
}

// ─────────────────────────────────────────────────────────────────────────────
// Slug utilities (re-uses EPK slug logic, different table)
// ─────────────────────────────────────────────────────────────────────────────
export function createVkSlug(input: string): string {
  return createEpkSlug(input)
}

export async function resolveVkSlugCandidate({
  userId,
  inputSlug,
  venueName,
  existingSlug,
  slugUpdateMode = 'preserve',
  lookupOwnerBySlug,
}: {
  userId: string
  inputSlug?: string | null
  venueName?: string | null
  existingSlug?: string | null
  slugUpdateMode?: VkSlugUpdateMode
  lookupOwnerBySlug: (slug: string) => Promise<string | null>
}): Promise<string> {
  const normalizedInput = createVkSlug(inputSlug || '')
  const venueSlug = createVkSlug(venueName || '')
  const normalizedExisting = createVkSlug(existingSlug || '')

  if (normalizedExisting && slugUpdateMode !== 'manual') {
    return normalizedExisting
  }

  const base = normalizedInput || venueSlug

  if (!base) {
    throw new VkSaveError(
      'Add a venue name or public slug before saving your Venue Kit.',
      'invalid_vk_slug',
      422
    )
  }

  const mayAutoSuffix =
    !normalizedInput ||
    normalizedInput === venueSlug ||
    normalizedInput === normalizedExisting

  for (let attempt = 0; attempt < 100; attempt += 1) {
    const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`
    const ownerId = await lookupOwnerBySlug(candidate)
    if (!ownerId || ownerId === userId) return candidate
    if (!mayAutoSuffix) {
      throw new VkSaveError(
        'That Venue Kit slug is already taken. Choose a different public slug.',
        'vk_slug_conflict',
        409
      )
    }
  }

  throw new VkSaveError(
    'Could not generate a unique Venue Kit slug. Try a more specific venue name.',
    'vk_slug_conflict',
    409
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// VenueKitService
// ─────────────────────────────────────────────────────────────────────────────
class VenueKitService {
  // ── Private helpers ────────────────────────────────────────────────────────

  private async getVenueProfile(
    venueProfileId?: string | null,
    userId?: string,
    db: VkDb = supabase
  ) {
    let query = db.from('venue_profiles').select('*')

    if (venueProfileId) {
      query = (query as any).eq('id', venueProfileId)
    } else if (userId) {
      query = (query as any)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
    } else {
      return null
    }

    const { data: rows, error } = await (query as any)
    if (error && error.code !== 'PGRST116') throw error
    return Array.isArray(rows) ? (rows[0] ?? null) : rows
  }

  private async getVKSettings(
    userId: string,
    db: VkDb = supabase,
    venueProfileId?: string | null
  ): Promise<VKSettings | null> {
    try {
      if (venueProfileId) {
        const { data, error } = await db
          .from('venue_kit_settings' as any)
          .select('*')
          .eq('user_id', userId)
          .eq('venue_profile_id', venueProfileId)
          .maybeSingle()

        if (data) return data as VKSettings
        if (error && error.code !== 'PGRST116') throw error
      }

      const { data: rows, error } = await db
        .from('venue_kit_settings' as any)
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(1)

      if (error && error.code !== 'PGRST116') {
        if (error.message?.includes('does not exist')) {
          console.warn('venue_kit_settings table does not exist yet')
          return null
        }
        throw error
      }

      return Array.isArray(rows) ? (rows[0] ?? null) : (rows as VKSettings | null)
    } catch (err) {
      console.warn('Error loading VK settings:', err)
      return null
    }
  }

  private buildVKDataFromRows(
    venueProfile: Record<string, any> | null,
    vkSettings: VKSettings | null
  ): VKData {
    const s = vkSettings?.settings ?? {}
    const sectionOrder = Array.isArray(s?.layout?.sectionOrder)
      ? (s.layout.sectionOrder as string[])
      : [...VK_DEFAULT_SECTION_ORDER]
    const sectionVisibility =
      s?.layout?.sectionVisibility &&
      typeof s.layout.sectionVisibility === 'object' &&
      !Array.isArray(s.layout.sectionVisibility)
        ? (s.layout.sectionVisibility as Record<string, boolean>)
        : defaultSectionVisibility()

    const contactInfo =
      venueProfile?.contact_info && typeof venueProfile.contact_info === 'object'
        ? (venueProfile.contact_info as Record<string, string>)
        : {}
    const socialLinks =
      venueProfile?.social_links && typeof venueProfile.social_links === 'object'
        ? (venueProfile.social_links as Record<string, string>)
        : {}

    const social = Object.entries(socialLinks)
      .filter(([, url]) => typeof url === 'string' && url.trim())
      .map(([platform, url], i) => ({
        id: `${platform}-${i}`,
        platform: platform.charAt(0).toUpperCase() + platform.slice(1),
        url: url as string,
        username: extractUsernameFromUrl(url as string, platform),
      }))

    // Overlay saved social from settings if present
    const savedSocial = Array.isArray(s?.social) ? (s.social as VKData['social']) : null

    const venueName = venueProfile?.venue_name ?? ''
    const vkSlug = vkSettings?.vk_slug ?? createVkSlug(venueName)

    return {
      venueProfileId: venueProfile?.id ?? vkSettings?.venue_profile_id ?? null,
      vkSlug,
      isPublic: vkSettings?.is_public ?? false,
      customDomain: vkSettings?.custom_domain ?? '',
      seoTitle: vkSettings?.seo_title ?? `${venueName} — Venue Kit`,
      seoDescription: vkSettings?.seo_description ?? venueProfile?.description ?? '',

      venueName,
      tagline: venueProfile?.tagline ?? '',
      bio: venueProfile?.description ?? '',
      venueTypes: Array.isArray(venueProfile?.venue_types) ? venueProfile.venue_types : [],
      location: {
        address: venueProfile?.address ?? '',
        city: venueProfile?.city ?? '',
        state: venueProfile?.state ?? '',
        country: venueProfile?.country ?? '',
        postalCode: venueProfile?.postal_code ?? '',
        neighborhood: venueProfile?.neighborhood ?? '',
      },
      website: contactInfo?.website ?? socialLinks?.website ?? '',
      avatarUrl: venueProfile?.avatar_url ?? '',
      coverUrl: venueProfile?.cover_image_url ?? '',

      specs: {
        capacityTotal: venueProfile?.capacity_total ?? venueProfile?.capacity ?? 0,
        capacitySeated: venueProfile?.capacity_seated ?? 0,
        capacityStanding: venueProfile?.capacity_standing ?? 0,
        stageDimensions: venueProfile?.stage_dimensions ?? '',
        soundSystem: venueProfile?.sound_system ?? '',
        lightingRig: venueProfile?.lighting_rig ?? '',
        loadingDock: venueProfile?.loading_dock ?? false,
        greenRooms: venueProfile?.green_rooms ?? 0,
        parkingSpots: venueProfile?.parking_spots ?? 0,
        curfew: venueProfile?.curfew ?? '',
        ageRestrictions: venueProfile?.age_restrictions ?? '',
      },

      amenities: Array.isArray(venueProfile?.amenities) ? venueProfile.amenities : [],

      photos: Array.isArray(s?.photos) ? (s.photos as VKData['photos']) : [],

      upcomingShows: Array.isArray(s?.upcomingShows)
        ? (s.upcomingShows as VKData['upcomingShows'])
        : [],

      press: Array.isArray(s?.press) ? (s.press as VKData['press']) : [],

      contact: {
        email: contactInfo?.email ?? '',
        phone: contactInfo?.phone ?? '',
        bookingEmail: contactInfo?.booking_email ?? contactInfo?.email ?? '',
        website: contactInfo?.website ?? socialLinks?.website ?? '',
        techRiderUrl: venueProfile?.tech_rider_url ?? '',
        stagePlotUrl: venueProfile?.stage_plot_url ?? '',
      },

      social: savedSocial ?? social,

      theme: vkSettings?.theme ?? 'dark',
      template: vkSettings?.template ?? 'modern',
      vkFont: normalizeEpkFontId(s?.vkFont),
      vkAppearance: normalizeEpkAppearance(s?.vkAppearance, vkSettings?.template),
      useVkStyleOnProfile: vkSettings?.use_vk_style_on_profile ?? false,

      layout: { sectionOrder, sectionVisibility },
    }
  }

  private async resolveVkSlugForSave(
    userId: string,
    vkData: Partial<VKData>,
    existing: VKSettings | null,
    db: VkDb = supabase,
    venueProfileId?: string | null
  ): Promise<string> {
    const ownerKey = venueProfileId || userId

    return resolveVkSlugCandidate({
      userId: ownerKey,
      inputSlug: vkData.vkSlug,
      venueName: vkData.venueName,
      existingSlug: existing?.vk_slug,
      slugUpdateMode: vkData.vkSlugUpdateMode,
      lookupOwnerBySlug: async (candidate) => {
        const { data, error } = await db
          .from('venue_kit_settings' as any)
          .select('user_id, venue_profile_id')
          .eq('vk_slug', candidate)
          .maybeSingle()

        if (error && !error.message?.includes('does not exist')) throw error
        const row = data as { user_id?: string; venue_profile_id?: string | null } | null
        return row?.venue_profile_id ?? row?.user_id ?? null
      },
    })
  }

  private async saveVKSettings(
    userId: string,
    vkData: Partial<VKData>,
    existing: VKSettings | null,
    vkSlug: string,
    db: VkDb = supabase
  ): Promise<void> {
    const prev = existing?.settings ?? {}
    const template = vkData.template ?? existing?.template ?? 'modern'

    const nextSettings: Record<string, unknown> = {
      ...prev,
      photos: Array.isArray(vkData.photos) ? vkData.photos : (prev.photos ?? []),
      upcomingShows: Array.isArray(vkData.upcomingShows)
        ? vkData.upcomingShows
        : (prev.upcomingShows ?? []),
      press: Array.isArray(vkData.press) ? vkData.press : (prev.press ?? []),
      social: Array.isArray(vkData.social) ? vkData.social : (prev.social ?? []),
      layout:
        vkData.layout !== undefined
          ? vkData.layout
          : (prev.layout ?? {
              sectionOrder: [...VK_DEFAULT_SECTION_ORDER],
              sectionVisibility: defaultSectionVisibility(),
            }),
      vkFont: vkData.vkFont ?? prev.vkFont ?? 'sans',
      vkAppearance:
        vkData.vkAppearance !== undefined
          ? normalizeEpkAppearance(vkData.vkAppearance, template)
          : normalizeEpkAppearance(prev.vkAppearance, template),
    }

    const payload: Omit<VKSettings, 'id'> = {
      user_id: userId,
      venue_profile_id: vkData.venueProfileId ?? existing?.venue_profile_id ?? null,
      theme: vkData.theme ?? existing?.theme ?? 'dark',
      template,
      is_public: vkData.isPublic ?? existing?.is_public ?? false,
      vk_slug: vkSlug,
      custom_domain: vkData.customDomain !== undefined
        ? vkData.customDomain || undefined
        : existing?.custom_domain || undefined,
      seo_title: vkData.seoTitle !== undefined
        ? vkData.seoTitle || undefined
        : existing?.seo_title || undefined,
      seo_description: vkData.seoDescription !== undefined
        ? vkData.seoDescription || undefined
        : existing?.seo_description || undefined,
      use_vk_style_on_profile:
        vkData.useVkStyleOnProfile !== undefined
          ? vkData.useVkStyleOnProfile
          : (existing?.use_vk_style_on_profile ?? false),
      settings: nextSettings,
    }

    if (existing?.id) {
      const { error } = await db
        .from('venue_kit_settings' as any)
        .update(payload)
        .eq('id', existing.id)
      if (error) throw error
      return
    }

    const { error: insertError } = await db
      .from('venue_kit_settings' as any)
      .insert({ ...payload, created_at: new Date().toISOString() })

    if (insertError) throw insertError
  }

  private async updateVenueProfile(
    userId: string,
    vkData: Partial<VKData>,
    db: VkDb = supabase,
    venueProfileId?: string | null
  ): Promise<void> {
    const updates: Record<string, unknown> = {}

    if (vkData.venueName !== undefined) updates.venue_name = vkData.venueName
    if (vkData.tagline !== undefined) updates.tagline = vkData.tagline
    if (vkData.bio !== undefined) updates.description = vkData.bio
    if (vkData.venueTypes !== undefined) updates.venue_types = vkData.venueTypes
    if (vkData.avatarUrl !== undefined) updates.avatar_url = vkData.avatarUrl
    if (vkData.coverUrl !== undefined) updates.cover_image_url = vkData.coverUrl

    if (vkData.location) {
      if (vkData.location.address !== undefined) updates.address = vkData.location.address
      if (vkData.location.city !== undefined) updates.city = vkData.location.city
      if (vkData.location.state !== undefined) updates.state = vkData.location.state
      if (vkData.location.country !== undefined) updates.country = vkData.location.country
      if (vkData.location.postalCode !== undefined) updates.postal_code = vkData.location.postalCode
      if (vkData.location.neighborhood !== undefined) updates.neighborhood = vkData.location.neighborhood
    }

    if (vkData.specs) {
      const sp = vkData.specs
      if (sp.capacityTotal !== undefined) updates.capacity_total = sp.capacityTotal
      if (sp.capacitySeated !== undefined) updates.capacity_seated = sp.capacitySeated
      if (sp.capacityStanding !== undefined) updates.capacity_standing = sp.capacityStanding
      if (sp.stageDimensions !== undefined) updates.stage_dimensions = sp.stageDimensions
      if (sp.soundSystem !== undefined) updates.sound_system = sp.soundSystem
      if (sp.lightingRig !== undefined) updates.lighting_rig = sp.lightingRig
      if (sp.loadingDock !== undefined) updates.loading_dock = sp.loadingDock
      if (sp.greenRooms !== undefined) updates.green_rooms = sp.greenRooms
      if (sp.parkingSpots !== undefined) updates.parking_spots = sp.parkingSpots
      if (sp.curfew !== undefined) updates.curfew = sp.curfew
      if (sp.ageRestrictions !== undefined) updates.age_restrictions = sp.ageRestrictions
    }

    if (vkData.amenities !== undefined) updates.amenities = vkData.amenities
    if (vkData.contact?.techRiderUrl !== undefined) updates.tech_rider_url = vkData.contact.techRiderUrl
    if (vkData.contact?.stagePlotUrl !== undefined) updates.stage_plot_url = vkData.contact.stagePlotUrl

    // Persist contact_info and social_links as JSONB
    if (vkData.contact) {
      const { data: current } = await db
        .from('venue_profiles' as any)
        .select('contact_info')
        .eq('user_id', userId)
        .maybeSingle()
      const prev = (current as any)?.contact_info ?? {}
      updates.contact_info = {
        ...prev,
        email: vkData.contact.email ?? prev.email,
        phone: vkData.contact.phone ?? prev.phone,
        booking_email: vkData.contact.bookingEmail ?? prev.booking_email,
        website: vkData.contact.website ?? prev.website,
      }
    }

    if (vkData.social) {
      const socialLinks: Record<string, string> = {}
      for (const link of vkData.social) {
        if (link.url) socialLinks[link.platform.toLowerCase()] = link.url
      }
      updates.social_links = socialLinks
    }

    if (Object.keys(updates).length === 0) return

    updates.updated_at = new Date().toISOString()

    let q = db.from('venue_profiles' as any).update(updates).eq('user_id', userId)
    if (venueProfileId) q = (q as any).eq('id', venueProfileId)
    const { error } = await (q as any)
    if (error) throw error
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  async loadVKData(
    venueProfileId: string | null | undefined,
    db: VkDb = supabase,
    userId?: string
  ): Promise<VKData> {
    const venueProfile = await this.getVenueProfile(venueProfileId, userId, db)
    const resolvedUserId = venueProfile?.user_id ?? userId ?? ''
    const resolvedProfileId = venueProfile?.id ?? venueProfileId ?? null
    const vkSettings = await this.getVKSettings(resolvedUserId, db, resolvedProfileId)
    return this.buildVKDataFromRows(venueProfile, vkSettings)
  }

  async saveVKData(
    userId: string,
    vkData: Partial<VKData>,
    db: VkDb = supabase
  ): Promise<SaveVKSuccess | SaveVKFailure> {
    try {
      const scopedProfileId = vkData.venueProfileId ?? null

      // Validate appearance hex fields before proceeding
      if (vkData.vkAppearance !== undefined) {
        const invalid = invalidEpkAppearanceHexFields(vkData.vkAppearance)
        if (invalid.length > 0) {
          throw new VkSaveError(
            `Invalid color value for ${invalid.join(', ')}. Use a 6-digit hex like #6366f1 or clear the field.`,
            'invalid_vk_appearance',
            422
          )
        }
      }

      const existing = await this.getVKSettings(userId, db, scopedProfileId)
      const vkSlug = await this.resolveVkSlugForSave(userId, vkData, existing, db, scopedProfileId)

      await this.updateVenueProfile(userId, vkData, db, scopedProfileId)
      await this.saveVKSettings(userId, vkData, existing, vkSlug, db)

      const data = await this.loadVKData(scopedProfileId, db, userId)
      const saveState = await this.getVKSaveState(userId, data.venueProfileId ?? scopedProfileId, db)

      return {
        success: true,
        data,
        publicUrl: `/vk/${data.vkSlug || vkSlug}`,
        lastSavedAt: saveState.lastSavedAt,
        venueProfileId: data.venueProfileId,
        vkSlug: data.vkSlug || vkSlug,
        isPublic: data.isPublic,
      }
    } catch (err) {
      console.error('Error saving VK data:', err)
      if (err instanceof VkSaveError) {
        return { success: false, error: err.message, code: err.code, status: err.status }
      }
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to save Venue Kit',
        code: 'vk_save_failed',
        status: 500,
      }
    }
  }

  async getVKSaveState(
    userId: string,
    venueProfileId?: string | null,
    db: VkDb = supabase
  ): Promise<VKSaveState> {
    const settings = await this.getVKSettings(userId, db, venueProfileId)
    return {
      hasSavedVk: Boolean(settings),
      publicUrl: settings?.vk_slug ? `/vk/${settings.vk_slug}` : null,
      lastSavedAt: settings?.updated_at ?? settings?.created_at ?? null,
      isPublic: Boolean(settings?.is_public),
    }
  }

  async getPublicVKData(slug: string, db: VkDb = supabase): Promise<VKData | null> {
    try {
      const normalizedSlug = createVkSlug(slug)

      const { data: settings, error } = await db
        .from('venue_kit_settings' as any)
        .select('user_id, venue_profile_id, is_public, vk_slug')
        .eq('vk_slug', normalizedSlug)
        .eq('is_public', true)
        .maybeSingle()

      if (error && !error.message?.includes('does not exist')) return null
      const row = settings as { user_id?: string; venue_profile_id?: string | null } | null
      if (!row?.user_id) return null

      return await this.loadVKData(row.venue_profile_id ?? null, db, row.user_id)
    } catch (err) {
      console.error('Error loading public VK data:', err)
      return null
    }
  }
}

export const venueKitService = new VenueKitService()

// ─────────────────────────────────────────────────────────────────────────────
// Default VKData factory (used by hook on first load)
// ─────────────────────────────────────────────────────────────────────────────
export function buildDefaultVKData(venueName = ''): VKData {
  return {
    venueProfileId: null,
    vkSlug: createVkSlug(venueName),
    isPublic: false,
    customDomain: '',
    seoTitle: venueName ? `${venueName} — Venue Kit` : '',
    seoDescription: '',

    venueName,
    tagline: '',
    bio: '',
    venueTypes: [],
    location: { address: '', city: '', state: '', country: '', postalCode: '', neighborhood: '' },
    website: '',
    avatarUrl: '',
    coverUrl: '',

    specs: {
      capacityTotal: 0,
      capacitySeated: 0,
      capacityStanding: 0,
      stageDimensions: '',
      soundSystem: '',
      lightingRig: '',
      loadingDock: false,
      greenRooms: 0,
      parkingSpots: 0,
      curfew: '',
      ageRestrictions: '',
    },
    amenities: [],
    photos: [],
    upcomingShows: [],
    press: [],
    contact: { email: '', phone: '', bookingEmail: '', website: '', techRiderUrl: '', stagePlotUrl: '' },
    social: [],

    theme: 'dark',
    template: 'modern',
    vkFont: 'sans',
    vkAppearance: { ...DEFAULT_EPK_APPEARANCE },
    useVkStyleOnProfile: false,

    layout: {
      sectionOrder: [...VK_DEFAULT_SECTION_ORDER],
      sectionVisibility: defaultSectionVisibility(),
    },
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function extractUsernameFromUrl(url: string, platform: string): string {
  try {
    const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`)
    const pathname = urlObj.pathname.replace(/^\//, '').replace(/\/$/, '')
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
      default:
        return pathname.split('/')[0] || ''
    }
  } catch {
    return ''
  }
}
