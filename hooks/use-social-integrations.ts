'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { socialIntegrationsService } from '@/lib/services/social-integrations.service'
import type { ArtistSocialIntegration, ConnectRequest } from '@/types/social-integrations.type'

export function useSocialIntegrations() {
  const { user } = useAuth()
  const [integrations, setIntegrations] = useState<ArtistSocialIntegration[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!user) {
      setIntegrations([])
      return
    }
    try {
      setLoading(true)
      setError(null)
      const rows = await socialIntegrationsService.list()
      setIntegrations(rows)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load integrations')
    } finally {
      setLoading(false)
    }
  }, [user])

  const connect = useCallback(async (req: ConnectRequest) => {
    setError(null)
    if (!user) {
      setError('Please sign in to connect accounts')
      if (typeof window !== 'undefined') {
        const redirect = encodeURIComponent(window.location.pathname)
        window.location.href = `/login?redirectTo=${redirect}&tab=signup`
      }
      throw new Error('not_authenticated')
    }
    const id = await socialIntegrationsService.connect(req)
    await load()
    return id
  }, [load, user])

  const disconnect = useCallback(async (platform: ArtistSocialIntegration['platform']) => {
    setError(null)
    if (!user) {
      setError('Please sign in to manage connections')
      return
    }
    await socialIntegrationsService.disconnect(platform)
    await load()
  }, [load, user])

  const refreshAnalytics = useCallback(async () => {
    setError(null)
    if (!user) {
      setError('Please sign in to refresh analytics')
      return
    }
    await socialIntegrationsService.refreshAnalytics()
    await load()
  }, [load, user])

  useEffect(() => { load() }, [load])

  return { integrations, loading, error, connect, disconnect, refreshAnalytics, reload: load }
}


