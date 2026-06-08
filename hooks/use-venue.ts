import { useState, useEffect, useCallback } from 'react'
import { VenueProfile, VenueUpdateData } from '@/app/venue/types/venue-profile'
import { venueService } from '@/lib/services/venue.service'

export interface UseVenueOptions {
  autoFetch?: boolean
}

export interface UseVenueReturn {
  venue: VenueProfile | null
  loading: boolean
  error: string | null
  refreshVenue: () => Promise<void>
  updateVenue: (updates: VenueUpdateData) => Promise<void>
  updateStats: (stats: Partial<VenueProfile['stats']>) => Promise<void>
}

export function useVenue(venueId?: string, options: UseVenueOptions = {}): UseVenueReturn {
  const { autoFetch = true } = options
  
  const [venue, setVenue] = useState<VenueProfile | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchVenue = useCallback(async (id?: string) => {
    const fetchId = id || venueId
    if (!fetchId) return

    setLoading(true)
    setError(null)

    try {
      const venueData = await venueService.getVenueProfile(fetchId)
      if (venueData) {
        setVenue(venueData as unknown as VenueProfile)
        venueService.setCurrentVenueId(fetchId)
      } else {
        setError('Venue not found')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch venue')
    } finally {
      setLoading(false)
    }
  }, [venueId])

  const refreshVenue = useCallback(async () => {
    if (venue?.id) {
      venueService.clearCache()
      await fetchVenue(venue.id)
    }
  }, [venue?.id, fetchVenue])

  const updateVenue = useCallback(async (updates: VenueUpdateData) => {
    if (!venue?.id) return

    setLoading(true)
    setError(null)

    try {
      const updatedVenue = await venueService.updateVenueProfile(venue.id, updates)
      if (updatedVenue) {
        setVenue(updatedVenue as unknown as VenueProfile)
      } else {
        setError('Failed to update venue')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update venue')
    } finally {
      setLoading(false)
    }
  }, [venue?.id])

  const updateStats = useCallback(async (stats: Partial<VenueProfile['stats']>) => {
    if (!venue?.id) return

    try {
      // TODO: Implement updateVenueStats method in VenueService
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update venue stats')
    }
  }, [venue?.id])

  useEffect(() => {
    if (autoFetch && venueId) {
      fetchVenue(venueId)
    }
  }, [venueId, autoFetch, fetchVenue])

  return {
    venue,
    loading,
    error,
    refreshVenue,
    updateVenue,
    updateStats,
  }
}

// Hook for getting current user's venue (for dashboard)
export function useCurrentVenue(): UseVenueReturn {
  const [venue, setVenue] = useState<VenueProfile | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchCurrentVenue = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const venueData = await venueService.getCurrentUserVenue()
      if (venueData) {
        setVenue(venueData as unknown as VenueProfile)
        venueService.setCurrentVenueId(venueData.id)
      } else {
        setError('No venue found for current user')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch current venue')
    } finally {
      setLoading(false)
    }
  }, [])

  const refreshVenue = useCallback(async () => {
    if (venue?.id) {
      venueService.clearCache()
    }
    await fetchCurrentVenue()
  }, [venue?.id, fetchCurrentVenue])

  const updateVenue = useCallback(async (updates: VenueUpdateData) => {
    if (!venue?.id) return

    setLoading(true)
    setError(null)

    try {
      const updatedVenue = await venueService.updateVenueProfile(venue.id, updates)
      if (updatedVenue) {
        setVenue(updatedVenue as unknown as VenueProfile)
      } else {
        setError('Failed to update venue')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update venue')
    } finally {
      setLoading(false)
    }
  }, [venue?.id])

  const updateStats = useCallback(async (stats: Partial<VenueProfile['stats']>) => {
    if (!venue?.id) return

    try {
      // TODO: Implement updateVenueStats method in VenueService
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update venue stats')
    }
  }, [venue?.id])

  useEffect(() => {
    fetchCurrentVenue()
  }, [fetchCurrentVenue])

  return {
    venue,
    loading,
    error,
    refreshVenue,
    updateVenue,
    updateStats,
  }
} 