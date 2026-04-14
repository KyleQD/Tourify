import { useState, useEffect, useCallback } from 'react'

interface QuickStats {
  totalConnections: number
  connectionsChange: string
  activeConversations: number
  conversationsChange: string
  communityEvents: number
  eventsChange: string
}

interface FeatureStat {
  total: number
  recent: number
}

interface FeatureStats {
  fanEngagement: FeatureStat
  network: FeatureStat
  jobs: FeatureStat
  messages: FeatureStat
  events: FeatureStat
  collaborations: FeatureStat
  projectWorkspaces: FeatureStat
}

interface CommunityStatsResponse {
  quickStats: QuickStats
  featureStats: FeatureStats
}

const defaultQuickStats: QuickStats = {
  totalConnections: 0,
  connectionsChange: '0',
  activeConversations: 0,
  conversationsChange: '0',
  communityEvents: 0,
  eventsChange: '0',
}

const defaultFeatureStats: FeatureStats = {
  fanEngagement: { total: 0, recent: 0 },
  network: { total: 0, recent: 0 },
  jobs: { total: 0, recent: 0 },
  messages: { total: 0, recent: 0 },
  events: { total: 0, recent: 0 },
  collaborations: { total: 0, recent: 0 },
  projectWorkspaces: { total: 0, recent: 0 },
}

export function useCommunityStats() {
  const [quickStats, setQuickStats] = useState<QuickStats>(defaultQuickStats)
  const [featureStats, setFeatureStats] = useState<FeatureStats>(defaultFeatureStats)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/community/stats')
      if (!res.ok) throw new Error(`Stats fetch failed: ${res.status}`)

      const data: { success: boolean } & CommunityStatsResponse = await res.json()
      setQuickStats(data.quickStats)
      setFeatureStats(data.featureStats)
      setError(null)
    } catch (err) {
      console.error('[useCommunityStats] Error:', err)
      setError(err instanceof Error ? err.message : 'Failed to load stats')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()

    const interval = setInterval(fetchStats, 60_000)
    return () => clearInterval(interval)
  }, [fetchStats])

  return { quickStats, featureStats, isLoading, error, refetch: fetchStats }
}
