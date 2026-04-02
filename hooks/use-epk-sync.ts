import { useState, useEffect, useCallback } from 'react'
import { useArtist } from '@/contexts/artist-context'
import { epkService, type EPKData } from '@/lib/services/epk.service'
import { getDefaultEpkAppearance } from '@/lib/epk/epk-appearance'
import { useToast } from '@/components/ui/use-toast'

interface UseEPKSyncReturn {
  epkData: EPKData | null
  isLoading: boolean
  isSaving: boolean
  updateEPKData: (updates: Partial<EPKData>) => void
  saveEPKData: () => Promise<void>
  reloadEPKData: () => Promise<void>
  syncWithProfile: () => Promise<void>
}

export function useEPKSync(): UseEPKSyncReturn {
  const { user, profile, updateProfile } = useArtist()
  const { toast } = useToast()
  
  const [epkData, setEpkData] = useState<EPKData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [pendingChanges, setPendingChanges] = useState<Partial<EPKData> | null>(null)

  // Load EPK data from service
  const loadEPKData = useCallback(async () => {
    if (!user?.id) return
    
    try {
      setIsLoading(true)
      const data = await epkService.loadEPKData(user.id)
      setEpkData(data)
      setPendingChanges(null)
    } catch (error) {
      console.error('Error loading EPK data:', error)
      
      // Create default EPK data if loading fails
      if (profile) {
        const defaultEPKData: EPKData = {
          epkSlug: profile.artist_name
            ? profile.artist_name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-')
            : '',
          artistName: profile.artist_name || "",
          bio: profile.bio || "",
          genre: profile.genres?.[0] || "",
          location: profile.settings?.professional?.location || "",
          avatarUrl: "",
          coverUrl: "",
          theme: "dark",
          template: "modern",
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
            email: profile.settings?.professional?.contact_email || "",
            phone: profile.settings?.professional?.phone || "",
            website: profile.social_links?.website || "",
            bookingEmail: profile.settings?.professional?.contact_email || "",
            managementEmail: "",
            verified: {
              email: false,
              phone: false,
              website: false,
            },
          },
          social: [],
          upcomingShows: [],
          customDomain: "",
          seoTitle: "",
          seoDescription: "",
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
              booking: true
            }
          },
          bookingAssets: {
            techRiderUrl: "",
            stagePlotUrl: "",
            oneLiner: ""
          },
          quality: {
            score: 0,
            missing: []
          },
          epkFont: "sans",
          epkAppearance: getDefaultEpkAppearance("modern"),
        }
        setEpkData(defaultEPKData)
      }
    } finally {
      setIsLoading(false)
    }
  }, [user?.id, profile])

  // Load data when user or profile changes
  useEffect(() => {
    loadEPKData()
  }, [loadEPKData])

  // Update EPK data locally and track changes
  const updateEPKData = useCallback((updates: Partial<EPKData>) => {
    setEpkData(prev => {
      if (!prev) return prev
      const updated = { ...prev, ...updates }
      
      // Track pending changes for sync
      setPendingChanges(prevChanges => ({
        ...prevChanges,
        ...updates,
      }))
      
      return updated
    })
  }, [])

  // Save EPK data and sync with profile
  const saveEPKData = useCallback(async () => {
    if (!user?.id || !epkData) {
      toast({
        title: "Cannot save EPK",
        description: "Please ensure you're logged in and EPK data is loaded.",
        variant: "destructive",
      })
      return
    }

    try {
      setIsSaving(true)
      
      // Save to EPK service
      const result = await epkService.saveEPKData(user.id, epkData)
      
      if (result.success) {
        // Sync changes back to artist profile if needed
        await syncProfileFromEPK(epkData)
        
        setPendingChanges(null)
        
        toast({
          title: "EPK saved successfully",
          description: "Your EPK has been updated and changes synced to your profile.",
        })
      } else {
        throw new Error(result.error || 'Failed to save EPK')
      }
    } catch (error) {
      console.error('Error saving EPK:', error)
      toast({
        title: "Error saving EPK",
        description: error instanceof Error ? error.message : "There was an error saving your EPK. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }, [user?.id, epkData, toast])

  // Sync profile data from EPK changes
  const syncProfileFromEPK = useCallback(async (currentEpkData: EPKData) => {
    if (!user?.id || !profile) return
    
    try {
      const profileUpdates: any = {}
      let hasUpdates = false

      // Sync basic info
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

      // Sync social links
      if (currentEpkData.social && currentEpkData.social.length > 0) {
        const socialLinks: Record<string, string> = {}
        currentEpkData.social.forEach(link => {
          const platform = link.platform.toLowerCase()
          socialLinks[platform] = link.url
        })
        
        // Add website from contact if available
        if (currentEpkData.contact.website) {
          socialLinks.website = currentEpkData.contact.website
        }

        // Check if social links have changed
        const currentSocialLinks = profile.social_links || {}
        const socialLinksChanged = JSON.stringify(socialLinks) !== JSON.stringify(currentSocialLinks)
        
        if (socialLinksChanged) {
          profileUpdates.social_links = socialLinks
          hasUpdates = true
        }
      }

      // Sync professional settings
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
          professional: professionalSettings
        }
        hasUpdates = true
      }

      // Update profile if there are changes
      if (hasUpdates) {
        const success = await updateProfile(profileUpdates)
        if (success) {
          console.log('Profile synced successfully from EPK changes')
        } else {
          console.warn('Failed to sync profile from EPK changes')
        }
      }
    } catch (error) {
      console.error('Error syncing profile from EPK:', error)
    }
  }, [user?.id, profile, updateProfile])

  // Sync EPK from profile changes
  const syncWithProfile = useCallback(async () => {
    if (!profile || !epkData) return

    try {
      const updates: Partial<EPKData> = {}
      let hasUpdates = false

      // Sync basic info from profile
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

      // Sync social links from profile
      if (profile.social_links) {
        const socialFromProfile = Object.entries(profile.social_links)
          .filter(([platform, url]) => url && typeof url === 'string' && url.trim())
          .map(([platform, url], index) => ({
            id: `${platform}-${index}`,
            platform: platform.charAt(0).toUpperCase() + platform.slice(1),
            url: url as string,
            username: extractUsernameFromUrl(url as string, platform),
            verified: false
          }))

        if (JSON.stringify(socialFromProfile) !== JSON.stringify(epkData.social)) {
          updates.social = socialFromProfile
          hasUpdates = true
        }
      }

      // Sync contact info from professional settings
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

      // Apply updates if any
      if (hasUpdates) {
        updateEPKData(updates)
        console.log('EPK synced with profile changes')
      }
    } catch (error) {
      console.error('Error syncing EPK with profile:', error)
    }
  }, [profile, epkData, updateEPKData])

  // Reload EPK data
  const reloadEPKData = useCallback(async () => {
    await loadEPKData()
  }, [loadEPKData])

  return {
    epkData,
    isLoading,
    isSaving,
    updateEPKData,
    saveEPKData,
    reloadEPKData,
    syncWithProfile,
  }
}

// Helper function to extract username from URL
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