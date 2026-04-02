import { useState, useEffect } from 'react'
import type { AdminDashboardStats } from '@/types/admin'

const FALLBACK_STATS: AdminDashboardStats = {
  totalTours: 0,
  activeTours: 0,
  totalEvents: 0,
  upcomingEvents: 0,
  totalArtists: 0,
  totalVenues: 0,
  totalRevenue: 0,
  monthlyRevenue: 0,
  ticketsSold: 0,
  totalCapacity: 0,
  staffMembers: 0,
  completedTasks: 0,
  pendingTasks: 0,
  averageRating: 0,
  totalTravelGroups: 0,
  totalTravelers: 0,
  confirmedTravelers: 0,
  coordinationCompletionRate: 0,
  fullyCoordinatedGroups: 0,
  activeTransportation: 0,
  completedTransportation: 0,
  logisticsCompletionRate: 0,
}

export function useAdminStats(venueId?: string) {
  const [stats, setStats] = useState<AdminDashboardStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchStats() {
      try {
        setIsLoading(true)
        setError(null)
        
        const params = venueId ? `?venue_id=${venueId}` : ''
        
        const response = await fetch(`/api/admin/dashboard/stats${params}`, {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        })

        if (!response.ok) throw new Error(`Failed to fetch stats: ${response.status}`)

        const data = await response.json()
        
        if (data.success) {
          setStats(data.stats)
        } else {
          throw new Error(data.error || 'Failed to fetch stats')
        }
      } catch (err) {
        console.error('Error fetching admin stats:', err)
        setError(err instanceof Error ? err.message : 'Unknown error')
        setStats(FALLBACK_STATS)
      } finally {
        setIsLoading(false)
      }
    }

    fetchStats()
  }, [venueId])

  return { stats, isLoading, error }
}
