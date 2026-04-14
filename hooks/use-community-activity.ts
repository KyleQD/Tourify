import { useState, useEffect, useCallback } from 'react'

export interface CommunityActivity {
  id: string
  type: 'new_follower' | 'post_like' | 'post_comment' | 'post_share' | 'message' | 'event'
  userId: string
  userName: string
  userAvatar: string | null
  userRole: string | null
  isVerified: boolean
  message: string
  details: string | null
  timestamp: string
  priority: 'low' | 'medium' | 'high'
}

export function useCommunityActivity(limit = 20) {
  const [activities, setActivities] = useState<CommunityActivity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchActivity = useCallback(async () => {
    try {
      const res = await fetch(`/api/community/activity?limit=${limit}`)
      if (!res.ok) throw new Error(`Activity fetch failed: ${res.status}`)

      const data = await res.json()
      setActivities(data.activities || [])
      setError(null)
    } catch (err) {
      console.error('[useCommunityActivity] Error:', err)
      setError(err instanceof Error ? err.message : 'Failed to load activity')
    } finally {
      setIsLoading(false)
    }
  }, [limit])

  useEffect(() => {
    fetchActivity()

    const interval = setInterval(fetchActivity, 30_000)
    return () => clearInterval(interval)
  }, [fetchActivity])

  return { activities, isLoading, error, refetch: fetchActivity }
}
