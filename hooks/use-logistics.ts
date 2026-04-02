import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/auth-context'

interface Transportation {
  id: string
  [key: string]: unknown
}

interface Equipment {
  id: string
  [key: string]: unknown
}

interface EquipmentAssignment {
  id: string
  [key: string]: unknown
}

interface LogisticsData {
  transportation: Transportation[]
  equipment: Equipment[]
  assignments: EquipmentAssignment[]
  analytics: {
    transportCostsByType: Record<string, number>
    equipmentByCategory: Record<string, { total: number; available: number; value: number }>
    equipmentCondition: Record<string, number>
    totalTransportCost: number
    totalEquipmentValue: number
    recentAssignments: number
  }
}

interface UseLogisticsOptions {
  eventId?: string
  tourId?: string
  /**
   * When set, only that slice is loaded from `/api/admin/logistics/items`.
   * When omitted, transportation, equipment, assignments, and metrics are fetched together (combined dashboards).
   */
  type?: 'transportation' | 'equipment' | 'assignments' | 'analytics'
  status?: string
  category?: string
  availability?: 'available' | 'assigned'
  limit?: number
  offset?: number
  autoRefresh?: boolean
  refreshInterval?: number
}

interface UseLogisticsReturn {
  data: LogisticsData | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  createTransportation: (data: Partial<Transportation>) => Promise<void>
  updateTransportation: (id: string, data: Partial<Transportation>) => Promise<void>
  createEquipment: (data: Partial<Equipment>) => Promise<void>
  updateEquipment: (id: string, data: Partial<Equipment>) => Promise<void>
  assignEquipment: (data: Partial<EquipmentAssignment>) => Promise<void>
  updateAssignment: (id: string, data: Partial<EquipmentAssignment>) => Promise<void>
}

export function useLogistics(options: UseLogisticsOptions = {}): UseLogisticsReturn {
  const { user } = useAuth()
  const [data, setData] = useState<LogisticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const {
    eventId,
    tourId,
    type,
    status,
    category,
    availability,
    limit = 50,
    offset = 0,
    autoRefresh = true,
    refreshInterval = 30000
  } = options

  const fetchLogisticsData = useCallback(async () => {
    if (!user) {
      setData(null)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const appendCommonQuery = (params: URLSearchParams) => {
        params.set('limit', limit.toString())
        params.set('offset', offset.toString())
        if (eventId) params.set('eventId', eventId)
        if (tourId) params.set('tourId', tourId)
        if (status) params.append('status', status)
        if (category) params.append('category', category)
        if (availability) params.append('availability', availability)
      }

      // Transform the data based on type
      let transformedData: LogisticsData

      if (type === 'transportation') {
        const params = new URLSearchParams()
        params.set('type', 'transportation')
        appendCommonQuery(params)

        const response = await fetch(`/api/admin/logistics/items?${params.toString()}`, {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          }
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const result = await response.json()
        transformedData = {
          transportation: result.items || [],
          equipment: [],
          assignments: [],
          analytics: {
            transportCostsByType: {},
            equipmentByCategory: {},
            equipmentCondition: {},
            totalTransportCost: 0,
            totalEquipmentValue: 0,
            recentAssignments: 0
          }
        }
      } else if (type === 'equipment') {
        const params = new URLSearchParams()
        params.set('type', 'equipment')
        appendCommonQuery(params)

        const response = await fetch(`/api/admin/logistics/items?${params.toString()}`, {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          }
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const result = await response.json()

        transformedData = {
          transportation: [],
          equipment: result.items || [],
          assignments: [],
          analytics: {
            transportCostsByType: {},
            equipmentByCategory: {},
            equipmentCondition: {},
            totalTransportCost: 0,
            totalEquipmentValue: 0,
            recentAssignments: 0
          }
        }
      } else if (type === 'assignments') {
        const params = new URLSearchParams()
        params.set('type', 'assignments')
        appendCommonQuery(params)

        const response = await fetch(`/api/admin/logistics/items?${params.toString()}`, {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          }
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const result = await response.json()

        transformedData = {
          transportation: [],
          equipment: [],
          assignments: result.items || [],
          analytics: {
            transportCostsByType: {},
            equipmentByCategory: {},
            equipmentCondition: {},
            totalTransportCost: 0,
            totalEquipmentValue: 0,
            recentAssignments: 0
          }
        }
      } else if (type === 'analytics') {
        const params = new URLSearchParams()
        params.set('type', 'analytics')
        appendCommonQuery(params)

        const response = await fetch(`/api/admin/logistics/items?${params.toString()}`, {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          }
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const result = await response.json()

        transformedData = {
          transportation: [],
          equipment: [],
          assignments: [],
          analytics: result.analytics || {
            transportCostsByType: {},
            equipmentByCategory: {},
            equipmentCondition: {},
            totalTransportCost: 0,
            totalEquipmentValue: 0,
            recentAssignments: 0
          }
        }
      } else {
        const baseParams = new URLSearchParams()
        appendCommonQuery(baseParams)
        const baseQuery = baseParams.toString()

        const [transportationRes, equipmentRes, assignmentsRes, analyticsRes] = await Promise.all([
          fetch(`/api/admin/logistics/items?type=transportation&${baseQuery}`, {
            credentials: 'include'
          }),
          fetch(`/api/admin/logistics/items?type=equipment&${baseQuery}`, {
            credentials: 'include'
          }),
          fetch(`/api/admin/logistics/items?type=assignments&${baseQuery}`, {
            credentials: 'include'
          }),
          fetch(`/api/admin/logistics/metrics?${baseQuery}`, {
            credentials: 'include'
          })
        ])

        const [transportationData, equipmentData, assignmentsData, analyticsData] = await Promise.all([
          transportationRes.json(),
          equipmentRes.json(),
          assignmentsRes.json(),
          analyticsRes.json()
        ])

        transformedData = {
          transportation: transportationData.items || [],
          equipment: equipmentData.items || [],
          assignments: assignmentsData.items || [],
          analytics: analyticsData.metrics || analyticsData.analytics || {
            transportCostsByType: {},
            equipmentByCategory: {},
            equipmentCondition: {},
            totalTransportCost: 0,
            totalEquipmentValue: 0,
            recentAssignments: 0
          }
        }
      }

      setData(transformedData)
    } catch (err) {
      console.error('[useLogistics] Error fetching logistics data:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch logistics data')
    } finally {
      setLoading(false)
    }
  }, [user, eventId, tourId, type, status, category, availability, limit, offset])

  // Create transportation record
  const createTransportation = useCallback(async (transportationData: Partial<Transportation>) => {
    if (!user) throw new Error('User not authenticated')

    try {
      const response = await fetch('/api/admin/logistics/items', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'transportation',
          ...transportationData
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      await fetchLogisticsData() // Refresh data
    } catch (err) {
      console.error('[useLogistics] Error creating transportation:', err)
      throw err
    }
  }, [user, fetchLogisticsData])

  // Update transportation record
  const updateTransportation = useCallback(async (id: string, updateData: Partial<Transportation>) => {
    if (!user) throw new Error('User not authenticated')

    try {
      const response = await fetch(`/api/admin/logistics/items/${encodeURIComponent(id)}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'transportation',
          ...updateData
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      await fetchLogisticsData() // Refresh data
    } catch (err) {
      console.error('[useLogistics] Error updating transportation:', err)
      throw err
    }
  }, [user, fetchLogisticsData])

  // Create equipment record
  const createEquipment = useCallback(async (equipmentData: Partial<Equipment>) => {
    if (!user) throw new Error('User not authenticated')

    try {
      const response = await fetch('/api/admin/logistics/items', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'equipment',
          ...equipmentData
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      await fetchLogisticsData() // Refresh data
    } catch (err) {
      console.error('[useLogistics] Error creating equipment:', err)
      throw err
    }
  }, [user, fetchLogisticsData])

  // Update equipment record
  const updateEquipment = useCallback(async (id: string, updateData: Partial<Equipment>) => {
    if (!user) throw new Error('User not authenticated')

    try {
      const response = await fetch(`/api/admin/logistics/items/${encodeURIComponent(id)}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'equipment',
          ...updateData
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      await fetchLogisticsData() // Refresh data
    } catch (err) {
      console.error('[useLogistics] Error updating equipment:', err)
      throw err
    }
  }, [user, fetchLogisticsData])

  // Assign equipment
  const assignEquipment = useCallback(async (assignmentData: Partial<EquipmentAssignment>) => {
    if (!user) throw new Error('User not authenticated')

    try {
      const response = await fetch(`/api/admin/logistics/items/${assignmentData.id}/equipment`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(assignmentData)
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      await fetchLogisticsData() // Refresh data
    } catch (err) {
      console.error('[useLogistics] Error assigning equipment:', err)
      throw err
    }
  }, [user, fetchLogisticsData])

  // Update assignment
  const updateAssignment = useCallback(async (id: string, updateData: Partial<EquipmentAssignment>) => {
    if (!user) throw new Error('User not authenticated')

    try {
      const response = await fetch(`/api/admin/logistics/items/${encodeURIComponent(id)}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'assignment',
          ...updateData
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      await fetchLogisticsData() // Refresh data
    } catch (err) {
      console.error('[useLogistics] Error updating assignment:', err)
      throw err
    }
  }, [user, fetchLogisticsData])

  // Initial fetch
  useEffect(() => {
    fetchLogisticsData()
  }, [fetchLogisticsData])

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      fetchLogisticsData()
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval, fetchLogisticsData])

  return {
    data,
    loading,
    error,
    refetch: fetchLogisticsData,
    createTransportation,
    updateTransportation,
    createEquipment,
    updateEquipment,
    assignEquipment,
    updateAssignment
  }
}

// Specialized hooks for specific logistics types
export function useTransportation(options: Omit<UseLogisticsOptions, 'type'> = {}) {
  return useLogistics({ ...options, type: 'transportation' })
}

export function useEquipment(options: Omit<UseLogisticsOptions, 'type'> = {}) {
  return useLogistics({ ...options, type: 'equipment' })
}

export function useEquipmentAssignments(options: Omit<UseLogisticsOptions, 'type'> = {}) {
  return useLogistics({ ...options, type: 'assignments' })
}

export function useLogisticsAnalytics(options: Omit<UseLogisticsOptions, 'type'> = {}) {
  return useLogistics({ ...options, type: 'analytics' })
} 