import { useState, useEffect, useCallback } from 'react'
import { useArtist } from '@/contexts/artist-context'
import { useActingContext } from '@/hooks/use-acting-context'
import type { EPKData } from '@/lib/services/epk.service'
import { getDefaultEpkAppearance } from '@/lib/epk/epk-appearance'
import { useToast } from '@/components/ui/use-toast'

interface ArtistProfileLike {
  id?: string
  artist_name?: string | null
  bio?: string | null
  genres?: string[] | null
  social_links?: Record<string, string> | null
  settings?: Record<string, any> | null
}

interface UseEPKSyncReturn {
  epkData: EPKData | null
  savedEpkData: EPKData | null
  publicUrl: string | null
  lastSavedAt: string | null
  hasSavedEpk: boolean
  isLoading: boolean
  isSaving: boolean
  isDirty: boolean
  isPublished: boolean
  needsAuth: boolean
  loadError: string | null
  saveError: string | null
  updateEPKData: (updates: Partial<EPKData>) => void
  saveEPKData: (overrides?: Partial<EPKData>, options?: SaveEPKOptions) => Promise<EPKData | null>
  publishEPK: () => Promise<EPKData | null>
  unpublishEPK: () => Promise<EPKData | null>
  reloadEPKData: () => Promise<void>
  syncWithProfile: () => Promise<void>
}

interface SaveEPKOptions {
  showToast?: boolean
  successTitle?: string
  successDescription?: string
}

function buildDefaultEPKData(profile: ArtistProfileLike | null): EPKData {
  const artistName = profile?.artist_name || ''
  const epkSlug = artistName
    ? artistName.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-')
    : ''

  return {
    artistProfileId: profile?.id || null,
    epkSlug,
    artistName,
    bio: profile?.bio || '',
    genre: profile?.genres?.[0] || '',
    location: profile?.settings?.professional?.location || '',
    avatarUrl: '',
    coverUrl: '',
    theme: 'dark',
    template: 'modern',
    isPublic: false,
    stats: {
      followers: 0,
      monthlyListeners: 0,
      totalStreams: 0,
      eventsPlayed: 0,
    },
    music: [],
    photos: [],
    press: [],
    contact: {
      email: profile?.settings?.professional?.contact_email || '',
      phone: profile?.settings?.professional?.phone || '',
      website: profile?.social_links?.website || '',
      bookingEmail: profile?.settings?.professional?.contact_email || '',
      managementEmail: '',
      verified: {
        email: false,
        phone: false,
        website: false,
      },
    },
    social: [],
    upcomingShows: [],
    customDomain: '',
    seoTitle: '',
    seoDescription: '',
    layout: {
      preset: 'booker',
      sectionOrder: ['hero', 'one-liner', 'bio', 'music', 'stats', 'shows', 'press', 'media', 'contact', 'social', 'booking'],
      sectionVisibility: {
        hero: true,
        'one-liner': true,
        bio: true,
        music: true,
        stats: true,
        shows: true,
        press: true,
        media: true,
        contact: true,
        social: true,
        booking: true,
      },
    },
    bookingAssets: {
      techRiderUrl: '',
      stagePlotUrl: '',
      oneLiner: '',
    },
    quality: {
      score: 0,
      missing: [],
    },
    epkFont: 'sans',
    epkAppearance: getDefaultEpkAppearance('modern'),
  }
}

export function useEPKSync(): UseEPKSyncReturn {
  const { user, profile, isLoading: isArtistLoading, updateProfile } = useArtist()
  const { actingHeaders } = useActingContext()
  const { toast } = useToast()

  const [epkData, setEpkData] = useState<EPKData | null>(null)
  const [savedEpkData, setSavedEpkData] = useState<EPKData | null>(null)
  const [publicUrl, setPublicUrl] = useState<string | null>(null)
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)
  const [hasSavedEpk, setHasSavedEpk] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [needsAuth, setNeedsAuth] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [pendingChanges, setPendingChanges] = useState<Partial<EPKData> | null>(null)

  const loadEPKData = useCallback(async () => {
    if (isArtistLoading) return

    if (!user?.id) {
      setEpkData(null)
      setSavedEpkData(null)
      setPublicUrl(null)
      setLastSavedAt(null)
      setHasSavedEpk(false)
      setNeedsAuth(true)
      setLoadError(null)
      setIsLoading(false)
      return
    }

    setNeedsAuth(false)
    setIsLoading(true)
    setLoadError(null)

    try {
      const params = new URLSearchParams()
      if (profile?.id) params.set('profileId', profile.id)
      const query = params.toString()
      const response = await fetch(`/api/artist/epk${query ? `?${query}` : ''}`, {
        credentials: 'include',
        cache: 'no-store',
        headers: actingHeaders,
      })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(body?.error?.message || body?.error || 'Failed to load EPK data')
      }
      const data = body.data
      setEpkData(data)
      setSavedEpkData(body.hasSavedEpk ? data : null)
      setPublicUrl(body.hasSavedEpk ? body.publicUrl || null : null)
      setLastSavedAt(body.hasSavedEpk ? body.lastSavedAt || null : null)
      setHasSavedEpk(Boolean(body.hasSavedEpk))
      setSaveError(null)
      setPendingChanges(null)
    } catch (error) {
      console.error('Error loading EPK data:', error)
      setEpkData(buildDefaultEPKData(profile))
      setSavedEpkData(null)
      setPublicUrl(null)
      setLastSavedAt(null)
      setHasSavedEpk(false)
      setLoadError(
        error instanceof Error ? error.message : 'Failed to load EPK data. Using default template.'
      )
    } finally {
      setIsLoading(false)
    }
  }, [user?.id, profile, isArtistLoading, actingHeaders])

  useEffect(() => {
    void loadEPKData()
  }, [loadEPKData])

  const updateEPKData = useCallback((updates: Partial<EPKData>) => {
    setEpkData(prev => {
      if (!prev) return prev
      const updated = { ...prev, ...updates }

      setPendingChanges(prevChanges => ({
        ...prevChanges,
        ...updates,
      }))

      return updated
    })
  }, [])

  const syncProfileFromEPK = useCallback(async (currentEpkData: EPKData) => {
    if (!user?.id || !profile) return

    try {
      const profileUpdates: any = {}
      let hasUpdates = false

      if (currentEpkData.artistName !== profile.artist_name) {
        profileUpdates.artist_name = currentEpkData.artistName
        hasUpdates = true
      }

      if (currentEpkData.bio !== profile.bio) {
        profileUpdates.bio = currentEpkData.bio
        hasUpdates = true
      }

      if (currentEpkData.genre && currentEpkData.genre !== profile.genres?.[0]) {
        profileUpdates.genres = [currentEpkData.genre]
        hasUpdates = true
      }

      if (currentEpkData.social && currentEpkData.social.length > 0) {
        const socialLinks: Record<string, string> = {}
        currentEpkData.social.forEach(link => {
          const platform = link.platform.toLowerCase()
          socialLinks[platform] = link.url
        })

        if (currentEpkData.contact.website) {
          socialLinks.website = currentEpkData.contact.website
        }

        const currentSocialLinks = profile.social_links || {}
        const socialLinksChanged = JSON.stringify(socialLinks) !== JSON.stringify(currentSocialLinks)

        if (socialLinksChanged) {
          profileUpdates.social_links = socialLinks
          hasUpdates = true
        }
      }

      const currentSettings = profile.settings || {}
      const professionalSettings = currentSettings.professional || {}
      let settingsChanged = false

      if (currentEpkData.contact.email !== professionalSettings.contact_email) {
        professionalSettings.contact_email = currentEpkData.contact.email
        settingsChanged = true
      }

      if (currentEpkData.contact.phone !== professionalSettings.phone) {
        professionalSettings.phone = currentEpkData.contact.phone
        settingsChanged = true
      }

      if (currentEpkData.location !== professionalSettings.location) {
        professionalSettings.location = currentEpkData.location
        settingsChanged = true
      }

      if (currentEpkData.contact.availability !== professionalSettings.availability) {
        professionalSettings.availability = currentEpkData.contact.availability
        settingsChanged = true
      }

      if (settingsChanged) {
        profileUpdates.settings = {
          ...currentSettings,
          professional: professionalSettings,
        }
        hasUpdates = true
      }

      if (hasUpdates) {
        const success = await updateProfile(profileUpdates)
        if (!success) {
          console.warn('Failed to sync profile from EPK changes')
        }
      }
    } catch (error) {
      console.error('Error syncing profile from EPK:', error)
    }
  }, [user?.id, profile, updateProfile])

  const saveEPKData = useCallback(async (
    overrides: Partial<EPKData> = {},
    options: SaveEPKOptions = {}
  ) => {
    if (!user?.id || !epkData) {
      toast({
        title: 'Cannot save EPK',
        description: "Please ensure you're logged in and EPK data is loaded.",
        variant: 'destructive',
      })
      return null
    }

    try {
      setIsSaving(true)
      setSaveError(null)

      const payload = {
        ...epkData,
        ...overrides,
        artistProfileId: overrides.artistProfileId || epkData.artistProfileId || profile?.id || null,
      }

      const response = await fetch('/api/artist/epk', {
        method: 'PUT',
        credentials: 'include',
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          ...actingHeaders,
        },
        body: JSON.stringify(payload),
      })

      const result = await response.json().catch(() => ({}))

      if (response.ok) {
        const savedData = result.data || payload
        const nextPublicUrl =
          result.publicUrl || (savedData.epkSlug ? `/epk/${savedData.epkSlug}` : null)
        const savedAt = result.lastSavedAt || new Date().toISOString()

        setEpkData(savedData)
        setSavedEpkData(savedData)
        setPublicUrl(nextPublicUrl)
        setLastSavedAt(savedAt)
        setHasSavedEpk(true)
        await syncProfileFromEPK(savedData)
        setPendingChanges(null)
        setSaveError(null)

        if (options.showToast !== false) {
          toast({
            title: options.successTitle || 'EPK saved successfully',
            description: options.successDescription ||
              (nextPublicUrl
                ? `Your EPK has been updated at ${nextPublicUrl}.`
                : 'Your EPK has been updated and changes synced to your profile.'),
          })
        }

        return savedData
      } else {
        throw new Error(
          result?.error?.message ||
          result?.error ||
          `Failed to save EPK (${response.status})`
        )
      }
    } catch (error) {
      console.error('Error saving EPK:', error)
      const message =
        error instanceof Error
          ? error.message
          : 'There was an error saving your EPK. Please try again.'
      setSaveError(message)
      toast({
        title: 'Error saving EPK',
        description: message,
        variant: 'destructive',
      })
      return null
    } finally {
      setIsSaving(false)
    }
  }, [user?.id, epkData, profile?.id, actingHeaders, syncProfileFromEPK, toast])

  const publishEPK = useCallback(async () => {
    return saveEPKData(
      { isPublic: true },
      {
        successTitle: 'EPK published',
        successDescription: 'Your live EPK is now available from your public artist profile.',
      }
    )
  }, [saveEPKData])

  const unpublishEPK = useCallback(async () => {
    return saveEPKData(
      { isPublic: false },
      {
        successTitle: 'EPK unpublished',
        successDescription: 'Your saved draft is still available here, but it is no longer public.',
      }
    )
  }, [saveEPKData])

  const syncWithProfile = useCallback(async () => {
    if (!profile || !epkData) return

    try {
      const updates: Partial<EPKData> = {}
      let hasUpdates = false

      if (profile.artist_name && profile.artist_name !== epkData.artistName) {
        updates.artistName = profile.artist_name
        hasUpdates = true
      }

      if (profile.bio && profile.bio !== epkData.bio) {
        updates.bio = profile.bio
        hasUpdates = true
      }

      if (profile.genres?.[0] && profile.genres[0] !== epkData.genre) {
        updates.genre = profile.genres[0]
        hasUpdates = true
      }

      if (profile.social_links) {
        const socialFromProfile = Object.entries(profile.social_links)
          .filter(([platform, url]) => url && typeof url === 'string' && url.trim())
          .map(([platform, url], index) => ({
            id: `${platform}-${index}`,
            platform: platform.charAt(0).toUpperCase() + platform.slice(1),
            url: url as string,
            username: extractUsernameFromUrl(url as string, platform),
            verified: false,
          }))

        if (JSON.stringify(socialFromProfile) !== JSON.stringify(epkData.social)) {
          updates.social = socialFromProfile
          hasUpdates = true
        }
      }

      const professionalSettings = profile.settings?.professional || {}
      const contactUpdates: Partial<EPKData['contact']> = {}
      let contactChanged = false

      if (professionalSettings.contact_email && professionalSettings.contact_email !== epkData.contact.email) {
        contactUpdates.email = professionalSettings.contact_email
        contactUpdates.bookingEmail = professionalSettings.contact_email
        contactChanged = true
      }

      if (professionalSettings.phone && professionalSettings.phone !== epkData.contact.phone) {
        contactUpdates.phone = professionalSettings.phone
        contactChanged = true
      }

      if (professionalSettings.location && professionalSettings.location !== epkData.location) {
        updates.location = professionalSettings.location
        contactUpdates.address = professionalSettings.location
        contactChanged = true
        hasUpdates = true
      }

      if (profile.social_links?.website && profile.social_links.website !== epkData.contact.website) {
        contactUpdates.website = profile.social_links.website
        contactChanged = true
      }

      if (contactChanged) {
        updates.contact = { ...epkData.contact, ...contactUpdates }
        hasUpdates = true
      }

      if (hasUpdates) {
        updateEPKData(updates)
      }
    } catch (error) {
      console.error('Error syncing EPK with profile:', error)
    }
  }, [profile, epkData, updateEPKData])

  const reloadEPKData = useCallback(async () => {
    await loadEPKData()
  }, [loadEPKData])

  return {
    epkData,
    savedEpkData,
    publicUrl,
    lastSavedAt,
    hasSavedEpk,
    isLoading: isLoading || isArtistLoading,
    isSaving,
    isDirty: Boolean(pendingChanges),
    isPublished: Boolean(savedEpkData?.isPublic),
    needsAuth,
    loadError,
    saveError,
    updateEPKData,
    saveEPKData,
    publishEPK,
    unpublishEPK,
    reloadEPKData,
    syncWithProfile,
  }
}

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
