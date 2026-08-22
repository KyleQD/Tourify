'use client'

import { useState, useEffect, useRef } from 'react'
import { venueService } from '@/lib/services/venue.service'
import { useMultiAccount } from '@/hooks/use-multi-account'
import { normalizeAccountType } from '@/lib/accounts/account-types'
import type { VenueProfile, VenueDashboardStats } from '@/types/database.types'

// Adapter to convert database venue to component-expected format
function adaptVenueProfile(dbVenue: VenueProfile) {
  return {
    ...dbVenue,
    name: dbVenue.venue_name,
    username: dbVenue.venue_name.toLowerCase().replace(/\s+/g, ''),
    type: dbVenue.venue_types?.[0] || 'Venue',
    location: `${dbVenue.city || ''}, ${dbVenue.state || ''}`.replace(/^,\s*|,\s*$/g, '') || dbVenue.address || 'Location not set',
    website: dbVenue.social_links?.website || '',
    avatar: dbVenue.avatar_url || '',
    coverImage: dbVenue.cover_image_url || '',
    url_slug: (dbVenue as { url_slug?: string | null }).url_slug || null,
    amenities: [], // Will be populated from equipment table later
    specs: {}, // Will be populated from equipment table later
    bookingContact: {
      name: dbVenue.contact_info?.manager_name || 'Venue Manager',
      email: dbVenue.contact_info?.booking_email || dbVenue.contact_info?.email || '',
      phone: dbVenue.contact_info?.phone || '',
    },
    upcomingEvents: [], // Will be populated from service
    bookingRequests: [], // Will be populated from service
    team: [], // Will be populated from service
    documents: [], // Will be populated from service
    isOwner: true, // Assume owner since it's their venue
  }
}

// Reverse adapter to convert component fields back to database fields for updates
function adaptVenueForUpdate(componentVenue: any): Partial<VenueProfile> {
  const dbUpdate: Partial<VenueProfile> = {}

  // Map component fields to database fields
  if (componentVenue.name !== undefined) {
    dbUpdate.venue_name = componentVenue.name
  }
  if (componentVenue.description !== undefined) {
    dbUpdate.description = componentVenue.description
  }
  if (componentVenue.address !== undefined) {
    dbUpdate.address = componentVenue.address
  }
  if (componentVenue.city !== undefined) {
    dbUpdate.city = componentVenue.city
  }
  if (componentVenue.state !== undefined) {
    dbUpdate.state = componentVenue.state
  }
  if (componentVenue.country !== undefined) {
    dbUpdate.country = componentVenue.country
  }
  if (componentVenue.postal_code !== undefined) {
    dbUpdate.postal_code = componentVenue.postal_code
  }
  if (componentVenue.capacity !== undefined) {
    dbUpdate.capacity = componentVenue.capacity
  }
  if (componentVenue.type !== undefined) {
    dbUpdate.venue_types = [componentVenue.type]
  }

  // Handle location parsing (if it's a combined city, state format)
  if (componentVenue.location !== undefined && typeof componentVenue.location === 'string') {
    const locationParts = componentVenue.location.split(',').map((part: string) => part.trim())
    if (locationParts.length >= 1) {
      dbUpdate.city = locationParts[0]
    }
    if (locationParts.length >= 2) {
      dbUpdate.state = locationParts[1]
    }
  }

  // Handle contact info mapping
  const currentContactInfo = componentVenue.contact_info || {}
  let contactInfoUpdated = false

  if (componentVenue.contactEmail !== undefined) {
    currentContactInfo.email = componentVenue.contactEmail
    currentContactInfo.booking_email = componentVenue.contactEmail
    contactInfoUpdated = true
  }

  if (componentVenue.phone !== undefined) {
    currentContactInfo.phone = componentVenue.phone
    contactInfoUpdated = true
  }

  if (componentVenue.bookingContact !== undefined) {
    currentContactInfo.manager_name = componentVenue.bookingContact.name
    currentContactInfo.email = componentVenue.bookingContact.email
    currentContactInfo.booking_email = componentVenue.bookingContact.email
    currentContactInfo.phone = componentVenue.bookingContact.phone
    contactInfoUpdated = true
  }

  if (contactInfoUpdated) {
    dbUpdate.contact_info = currentContactInfo
  }

  // Handle social links mapping
  const currentSocialLinks = componentVenue.social_links || {}
  let socialLinksUpdated = false

  if (componentVenue.website !== undefined) {
    currentSocialLinks.website = componentVenue.website
    socialLinksUpdated = true
  }

  if (socialLinksUpdated) {
    dbUpdate.social_links = currentSocialLinks
  }

  // Handle image URL fields
  if (componentVenue.avatarUrl !== undefined) {
    dbUpdate.avatar_url = componentVenue.avatarUrl
  }
  if (componentVenue.coverImageUrl !== undefined) {
    dbUpdate.cover_image_url = componentVenue.coverImageUrl
  }
  if (componentVenue.settings !== undefined) {
    dbUpdate.settings = componentVenue.settings
  }

  // Only include database fields
  const allowedDbFields = [
    'venue_name', 'description', 'address', 'city', 'state', 'country', 
    'postal_code', 'capacity', 'venue_types', 'contact_info', 'social_links',
    'avatar_url', 'cover_image_url', 'settings'
  ]

  // Filter to only include allowed database fields
  const filteredUpdate: Partial<VenueProfile> = {}
  for (const [key, value] of Object.entries(dbUpdate)) {
    if (allowedDbFields.includes(key) && value !== undefined) {
      (filteredUpdate as any)[key] = value
    }
  }

  return filteredUpdate
}

interface UseCurrentVenueReturn {
  venue: any | null // Using any for compatibility with existing components
  stats: VenueDashboardStats | null
  isLoading: boolean
  error: string | null
  refreshVenue: () => Promise<void>
  updateVenue: (updates: any) => Promise<boolean>
}

export function useCurrentVenue(): UseCurrentVenueReturn {
  const [venue, setVenue] = useState<any | null>(null)
  const [stats, setStats] = useState<VenueDashboardStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // VEN-004: the client hint (sessionStorage) is never authoritative. It is only
  // honored when it matches an active Venue account in the server-seeded list.
  const { accounts, isAccountsReady } = useMultiAccount()
  const accountsKey = accounts.map((a) => `${a.profile_id}:${a.is_active}`).join('|')
  const lastAccountsKeyRef = useRef<string | null>(null)

  const fetchVenueData = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Validate the active-venue hint against the server-seeded account list.
      let activeVenueId: string | null = null
      if (isAccountsReady) {
        const hint = venueService.getActiveVenueId()
        if (hint) {
          const belongsToUser = accounts.some(
            (account) =>
              account.profile_id === hint &&
              normalizeAccountType(account.account_type) === 'venue' &&
              account.is_active,
          )
          if (belongsToUser) {
            activeVenueId = hint
          } else {
            venueService.clearActiveVenueId()
          }
        }
      }

      let venueData: any = null

      if (activeVenueId) {
        // Fetch specific venue by validated ID
        venueData = await venueService.getVenueProfile(activeVenueId)
      } else {
        // Fetch current user's venue (server-validated via RLS; first if multiple)
        venueData = await venueService.getCurrentUserVenue()
      }

      if (venueData) {
        // Adapt the venue data to expected format
        const adaptedVenue = adaptVenueProfile(venueData)
        setVenue(adaptedVenue)

        // Fetch dashboard stats
        const statsData = await venueService.getVenueDashboardStats(venueData.id)
        setStats(statsData)
      } else {
        setVenue(null)
        setStats(null)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch venue data'
      setError(errorMessage)
      console.error('Error fetching venue data:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const refreshVenue = async () => {
    await fetchVenueData()
  }

  const updateVenue = async (updates: any): Promise<boolean> => {
    if (!venue) return false

    try {
      setError(null)

      // Convert component fields to database fields
      const dbUpdates = adaptVenueForUpdate(updates)

      const updatedVenue = await venueService.updateVenueProfile(venue.id, dbUpdates)

      if (updatedVenue) {
        const adaptedVenue = adaptVenueProfile(updatedVenue)
        setVenue(adaptedVenue)
        return true
      }
      return false
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update venue'
      setError(errorMessage)
      console.error('Error updating venue:', err)
      return false
    }
  }

  useEffect(() => {
    void fetchVenueData()
  }, [])

  // Re-fetch once the server-seeded account list arrives or changes composition
  // (covers stale pre-hydration loads and account switches).
  useEffect(() => {
    if (!isAccountsReady || lastAccountsKeyRef.current === accountsKey) return
    lastAccountsKeyRef.current = accountsKey
    void fetchVenueData()
  }, [isAccountsReady, accountsKey])

  useEffect(() => {
    function handleActiveVenueChanged() {
      void fetchVenueData()
    }

    window.addEventListener('tourify:active-venue-changed', handleActiveVenueChanged)
    return () => {
      window.removeEventListener('tourify:active-venue-changed', handleActiveVenueChanged)
    }
  }, [])

  return {
    venue,
    stats,
    isLoading,
    error,
    refreshVenue,
    updateVenue
  }
} 