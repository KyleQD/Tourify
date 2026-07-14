import { useState, useEffect, useCallback } from 'react'
import { SiteMap, SiteMapZone, GlampingTent, SiteMapElement } from '@/types/site-map'

interface UseSiteMapsOptions {
  eventId?: string
  tourId?: string
  autoRefresh?: boolean
  refreshInterval?: number
  /** When false, skips nested zones/tents/elements for faster list loads. Default false. */
  includeData?: boolean
}

interface UseSiteMapsReturn {
  siteMaps: SiteMap[]
  selectedSiteMap: SiteMap | null
  loading: boolean
  error: string | null
  createSiteMap: (data: Partial<SiteMap>) => Promise<SiteMap | null>
  updateSiteMap: (id: string, data: Partial<SiteMap>) => Promise<SiteMap | null>
  deleteSiteMap: (id: string) => Promise<boolean>
  selectSiteMap: (id: string) => void
  refreshSiteMaps: () => Promise<void>
  exportSiteMap: (id: string) => Promise<boolean>
  importSiteMap: (file: File, eventId?: string, tourId?: string) => Promise<SiteMap | null>
  shareSiteMap: (id: string, options: any) => Promise<any>
  getCollaborators: (id: string) => Promise<any[]>
  removeCollaborator: (siteMapId: string, userId: string) => Promise<boolean>
  getSiteMapById: (id: string) => Promise<SiteMap | null>
  upsertSiteMap: (map: SiteMap) => void
}

export function useSiteMaps(options: UseSiteMapsOptions = {}): UseSiteMapsReturn {
  const [siteMaps, setSiteMaps] = useState<SiteMap[]>([])
  const [selectedSiteMap, setSelectedSiteMap] = useState<SiteMap | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { eventId, tourId, autoRefresh = false, refreshInterval = 30000, includeData = false } = options

  const fetchSiteMaps = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (eventId) params.append('eventId', eventId)
      if (tourId) params.append('tourId', tourId)
      params.append('includeData', includeData ? 'true' : 'false')

      const response = await fetch(`/api/admin/logistics/site-maps?${params}`, { credentials: 'include' })
      const data = await response.json()

      if (data.success) {
        setSiteMaps(data.data || [])
      } else {
        throw new Error(data.error || 'Failed to fetch site maps')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch site maps'
      setError(errorMessage)
      console.error('Error fetching site maps:', err)
    } finally {
      setLoading(false)
    }
  }, [eventId, tourId, includeData])

  const getSiteMapById = useCallback(async (id: string): Promise<SiteMap | null> => {
    try {
      const response = await fetch(`/api/admin/logistics/site-maps/${id}`, { credentials: 'include' })
      const data = await response.json()
      if (data.success && data.data) {
        setSiteMaps((prev) => {
          const exists = prev.some((map) => map.id === id)
          if (exists) return prev.map((map) => (map.id === id ? data.data : map))
          return [data.data, ...prev]
        })
        return data.data
      }
      return null
    } catch {
      return null
    }
  }, [])

  const upsertSiteMap = useCallback((map: SiteMap) => {
    if (!map?.id) return
    setSiteMaps((prev) => {
      const exists = prev.some((row) => row.id === map.id)
      if (exists) return prev.map((row) => (row.id === map.id ? { ...row, ...map } : row))
      return [map, ...prev]
    })
    setSelectedSiteMap(map)
  }, [])

  const createSiteMap = useCallback(async (data: Partial<SiteMap>): Promise<SiteMap | null> => {
    try {
      const response = await fetch('/api/admin/logistics/site-maps', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          eventId,
          tourId
        })
      })

      const result = await response.json()

      if (result.success) {
        setSiteMaps(prev => [result.data, ...prev])
        setSelectedSiteMap(result.data)
        return result.data
      } else {
        throw new Error(result.error || 'Failed to create site map')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create site map'
      setError(errorMessage)
      console.error('Error creating site map:', err)
      return null
    }
  }, [eventId, tourId])

  const updateSiteMap = useCallback(async (id: string, data: Partial<SiteMap>): Promise<SiteMap | null> => {
    try {
      const response = await fetch(`/api/admin/logistics/site-maps/${id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      const result = await response.json()

      if (result.success) {
        setSiteMaps(prev => prev.map(sm => sm.id === id ? result.data : sm))
        if (selectedSiteMap?.id === id) {
          setSelectedSiteMap(result.data)
        }
        return result.data
      } else {
        throw new Error(result.error || 'Failed to update site map')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update site map'
      setError(errorMessage)
      console.error('Error updating site map:', err)
      return null
    }
  }, [selectedSiteMap])

  const deleteSiteMap = useCallback(async (id: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/admin/logistics/site-maps/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      const result = await response.json()

      if (result.success) {
        setSiteMaps(prev => prev.filter(sm => sm.id !== id))
        if (selectedSiteMap?.id === id) {
          setSelectedSiteMap(null)
        }
        return true
      } else {
        throw new Error(result.error || 'Failed to delete site map')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete site map'
      setError(errorMessage)
      console.error('Error deleting site map:', err)
      return false
    }
  }, [selectedSiteMap])

  const selectSiteMap = useCallback((id: string) => {
    const siteMap = siteMaps.find(sm => sm.id === id)
    if (siteMap) {
      setSelectedSiteMap(siteMap)
    }
  }, [siteMaps])

  const refreshSiteMaps = useCallback(async () => {
    await fetchSiteMaps()
  }, [fetchSiteMaps])

  const exportSiteMap = useCallback(async (id: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/admin/logistics/site-maps/${id}/export`, { credentials: 'include' })
      
      if (response.ok) {
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `sitemap_${id}_export.json`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        return true
      } else {
        throw new Error('Failed to export site map')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to export site map'
      setError(errorMessage)
      console.error('Error exporting site map:', err)
      return false
    }
  }, [])

  const importSiteMap = useCallback(async (file: File, importEventId?: string, importTourId?: string): Promise<SiteMap | null> => {
    try {
      const text = await file.text()
      const importData = JSON.parse(text)

      const response = await fetch('/api/admin/logistics/site-maps/import', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          importData,
          eventId: importEventId || eventId,
          tourId: importTourId || tourId
        })
      })

      const result = await response.json()

      if (result.success) {
        setSiteMaps(prev => [result.data.site_map, ...prev])
        setSelectedSiteMap(result.data.site_map)
        return result.data.site_map
      } else {
        throw new Error(result.error || 'Failed to import site map')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to import site map'
      setError(errorMessage)
      console.error('Error importing site map:', err)
      return null
    }
  }, [eventId, tourId])

  // Load site maps on mount
  useEffect(() => {
    fetchSiteMaps()
  }, [fetchSiteMaps])

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      fetchSiteMaps()
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval, fetchSiteMaps])

  const shareSiteMap = useCallback(async (
    siteMapId: string,
    target: { userId?: string; email?: string },
    permissions: 'view' | 'edit' | 'admin' = 'view'
  ): Promise<boolean> => {
    try {
      const response = await fetch(`/api/admin/logistics/site-maps/${siteMapId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ...target, permissions })
      })
      const result = await response.json()
      return result.success === true
    } catch (err) {
      console.error('Error sharing site map:', err)
      return false
    }
  }, [])

  const getCollaborators = useCallback(async (siteMapId: string) => {
    try {
      const response = await fetch(`/api/admin/logistics/site-maps/${siteMapId}/collaborators`, {
        credentials: 'include'
      })
      const result = await response.json()
      return result.success ? result.data : []
    } catch {
      return []
    }
  }, [])

  const removeCollaborator = useCallback(async (siteMapId: string, userId: string): Promise<boolean> => {
    try {
      const response = await fetch(
        `/api/admin/logistics/site-maps/${siteMapId}/collaborators?userId=${userId}`,
        { method: 'DELETE', credentials: 'include' }
      )
      const result = await response.json()
      return result.success === true
    } catch {
      return false
    }
  }, [])

  return {
    siteMaps,
    selectedSiteMap,
    loading,
    error,
    createSiteMap,
    updateSiteMap,
    deleteSiteMap,
    selectSiteMap,
    refreshSiteMaps,
    exportSiteMap,
    importSiteMap,
    shareSiteMap,
    getCollaborators,
    removeCollaborator,
    getSiteMapById,
    upsertSiteMap,
  }
}

// Hook for individual site map management
interface UseSiteMapOptions {
  siteMapId: string
  autoRefresh?: boolean
  refreshInterval?: number
}

interface UseSiteMapReturn {
  siteMap: SiteMap | null
  loading: boolean
  error: string | null
  updateSiteMap: (data: Partial<SiteMap>) => Promise<SiteMap | null>
  createZone: (data: Partial<SiteMapZone>) => Promise<SiteMapZone | null>
  updateZone: (zoneId: string, data: Partial<SiteMapZone>) => Promise<SiteMapZone | null>
  deleteZone: (zoneId: string) => Promise<boolean>
  createTent: (data: Partial<GlampingTent>) => Promise<GlampingTent | null>
  updateTent: (tentId: string, data: Partial<GlampingTent>) => Promise<GlampingTent | null>
  deleteTent: (tentId: string) => Promise<boolean>
  createElement: (data: Partial<SiteMapElement>) => Promise<SiteMapElement | null>
  updateElement: (elementId: string, data: Partial<SiteMapElement>) => Promise<SiteMapElement | null>
  deleteElement: (elementId: string) => Promise<boolean>
  refreshSiteMap: () => Promise<void>
}

export function useSiteMap(options: UseSiteMapOptions): UseSiteMapReturn {
  const [siteMap, setSiteMap] = useState<SiteMap | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { siteMapId, autoRefresh = false, refreshInterval = 30000 } = options

  const fetchSiteMap = useCallback(async () => {
    if (!siteMapId) return

    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/admin/logistics/site-maps/${siteMapId}`, { credentials: 'include' })
      const data = await response.json()

      if (data.success) {
        setSiteMap(data.data)
      } else {
        throw new Error(data.error || 'Failed to fetch site map')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch site map'
      setError(errorMessage)
      console.error('Error fetching site map:', err)
    } finally {
      setLoading(false)
    }
  }, [siteMapId])

  const updateSiteMap = useCallback(async (data: Partial<SiteMap>): Promise<SiteMap | null> => {
    try {
      const response = await fetch(`/api/admin/logistics/site-maps/${siteMapId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      const result = await response.json()

      if (result.success) {
        setSiteMap(result.data)
        return result.data
      } else {
        throw new Error(result.error || 'Failed to update site map')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update site map'
      setError(errorMessage)
      console.error('Error updating site map:', err)
      return null
    }
  }, [siteMapId])

  const createZone = useCallback(async (data: Partial<SiteMapZone>): Promise<SiteMapZone | null> => {
    try {
      const response = await fetch(`/api/admin/logistics/site-maps/${siteMapId}/zones`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      const result = await response.json()

      if (result.success) {
        setSiteMap(prev => prev ? {
          ...prev,
          zones: [...(prev.zones || []), result.data]
        } : null)
        return result.data
      } else {
        throw new Error(result.error || 'Failed to create zone')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create zone'
      setError(errorMessage)
      console.error('Error creating zone:', err)
      return null
    }
  }, [siteMapId])

  const updateZone = useCallback(async (zoneId: string, data: Partial<SiteMapZone>): Promise<SiteMapZone | null> => {
    try {
      const response = await fetch(`/api/admin/logistics/site-maps/${siteMapId}/zones/${zoneId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      const result = await response.json()

      if (result.success) {
        setSiteMap(prev => prev ? {
          ...prev,
          zones: prev.zones?.map(zone => zone.id === zoneId ? result.data : zone) || []
        } : null)
        return result.data
      } else {
        throw new Error(result.error || 'Failed to update zone')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update zone'
      setError(errorMessage)
      console.error('Error updating zone:', err)
      return null
    }
  }, [siteMapId])

  const deleteZone = useCallback(async (zoneId: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/admin/logistics/site-maps/${siteMapId}/zones/${zoneId}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      const result = await response.json()

      if (result.success) {
        setSiteMap(prev => prev ? {
          ...prev,
          zones: prev.zones?.filter(zone => zone.id !== zoneId) || []
        } : null)
        return true
      } else {
        throw new Error(result.error || 'Failed to delete zone')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete zone'
      setError(errorMessage)
      console.error('Error deleting zone:', err)
      return false
    }
  }, [siteMapId])

  const createTent = useCallback(async (data: Partial<GlampingTent>): Promise<GlampingTent | null> => {
    try {
      const response = await fetch(`/api/admin/logistics/site-maps/${siteMapId}/tents`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      const result = await response.json()

      if (result.success) {
        setSiteMap(prev => prev ? {
          ...prev,
          tents: [...(prev.tents || []), result.data]
        } : null)
        return result.data
      } else {
        throw new Error(result.error || 'Failed to create tent')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create tent'
      setError(errorMessage)
      console.error('Error creating tent:', err)
      return null
    }
  }, [siteMapId])

  const updateTent = useCallback(async (tentId: string, data: Partial<GlampingTent>): Promise<GlampingTent | null> => {
    try {
      const response = await fetch(`/api/admin/logistics/site-maps/${siteMapId}/tents/${tentId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      const result = await response.json()

      if (result.success) {
        setSiteMap(prev => prev ? {
          ...prev,
          tents: prev.tents?.map(tent => tent.id === tentId ? result.data : tent) || []
        } : null)
        return result.data
      } else {
        throw new Error(result.error || 'Failed to update tent')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update tent'
      setError(errorMessage)
      console.error('Error updating tent:', err)
      return null
    }
  }, [siteMapId])

  const deleteTent = useCallback(async (tentId: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/admin/logistics/site-maps/${siteMapId}/tents/${tentId}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      const result = await response.json()

      if (result.success) {
        setSiteMap(prev => prev ? {
          ...prev,
          tents: prev.tents?.filter(tent => tent.id !== tentId) || []
        } : null)
        return true
      } else {
        throw new Error(result.error || 'Failed to delete tent')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete tent'
      setError(errorMessage)
      console.error('Error deleting tent:', err)
      return false
    }
  }, [siteMapId])

  const createElement = useCallback(async (data: Partial<SiteMapElement>): Promise<SiteMapElement | null> => {
    try {
      const response = await fetch(`/api/admin/logistics/site-maps/${siteMapId}/elements`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      const result = await response.json()

      if (result.success) {
        setSiteMap(prev => prev ? {
          ...prev,
          elements: [...(prev.elements || []), result.data]
        } : null)
        return result.data
      } else {
        throw new Error(result.error || 'Failed to create element')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create element'
      setError(errorMessage)
      console.error('Error creating element:', err)
      return null
    }
  }, [siteMapId])

  const updateElement = useCallback(async (elementId: string, data: Partial<SiteMapElement>): Promise<SiteMapElement | null> => {
    try {
      const response = await fetch(`/api/admin/logistics/site-maps/${siteMapId}/elements/${elementId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      const result = await response.json()

      if (result.success) {
        setSiteMap(prev => prev ? {
          ...prev,
          elements: prev.elements?.map(element => element.id === elementId ? result.data : element) || []
        } : null)
        return result.data
      } else {
        throw new Error(result.error || 'Failed to update element')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update element'
      setError(errorMessage)
      console.error('Error updating element:', err)
      return null
    }
  }, [siteMapId])

  const deleteElement = useCallback(async (elementId: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/admin/logistics/site-maps/${siteMapId}/elements/${elementId}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      const result = await response.json()

      if (result.success) {
        setSiteMap(prev => prev ? {
          ...prev,
          elements: prev.elements?.filter(element => element.id !== elementId) || []
        } : null)
        return true
      } else {
        throw new Error(result.error || 'Failed to delete element')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete element'
      setError(errorMessage)
      console.error('Error deleting element:', err)
      return false
    }
  }, [siteMapId])

  const refreshSiteMap = useCallback(async () => {
    await fetchSiteMap()
  }, [fetchSiteMap])

  // Load site map on mount
  useEffect(() => {
    fetchSiteMap()
  }, [fetchSiteMap])

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      fetchSiteMap()
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval, fetchSiteMap])

  return {
    siteMap,
    loading,
    error,
    updateSiteMap,
    createZone,
    updateZone,
    deleteZone,
    createTent,
    updateTent,
    deleteTent,
    createElement,
    updateElement,
    deleteElement,
    refreshSiteMap
  }
}
