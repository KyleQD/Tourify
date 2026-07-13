import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/auth-context'

// =============================================================================
// TYPES
// =============================================================================

export interface RentalClient {
  id: string
  name: string
  email?: string
  phone?: string
  company?: string
  address?: string
  city?: string
  state?: string
  postal_code?: string
  country: string
  tax_id?: string
  credit_limit: number
  payment_terms: string
  status: 'active' | 'inactive' | 'suspended'
  notes?: string
  created_at: string
  updated_at: string
}

export interface RentalAgreementItem {
  id: string
  rental_agreement_id: string
  equipment_id: string
  quantity: number
  daily_rate: number
  total_days: number
  subtotal: number
  condition_out?: string
  condition_in?: string
  damage_notes?: string
  damage_photos?: string[]
  status: 'reserved' | 'picked_up' | 'returned' | 'damaged' | 'lost'
  actual_pickup_date?: string
  actual_return_date?: string
  notes?: string
  created_at: string
  updated_at: string
  equipment?: {
    id: string
    name: string
    category: string
    rental_rate: number
  }
}

export interface RentalAgreement {
  id: string
  agreement_number: string
  client_id: string
  event_id?: string
  tour_id?: string
  start_date: string
  end_date: string
  pickup_date?: string
  return_date?: string
  subtotal: number
  tax_amount: number
  deposit_amount: number
  total_amount: number
  paid_amount: number
  status: 'draft' | 'confirmed' | 'active' | 'completed' | 'cancelled' | 'overdue'
  payment_status: 'pending' | 'partial' | 'paid' | 'overdue'
  terms_conditions?: string
  special_requirements?: string
  insurance_required: boolean
  insurance_amount?: number
  contact_name?: string
  contact_phone?: string
  contact_email?: string
  delivery_address?: string
  delivery_instructions?: string
  pickup_instructions?: string
  created_by?: string
  approved_by?: string
  approved_at?: string
  created_at: string
  updated_at: string
  rental_clients?: RentalClient
  events?: {
    id: string
    name: string
    start_date: string
  }
  tours?: {
    id: string
    name: string
    start_date: string
  }
  rental_agreement_items?: RentalAgreementItem[]
}

export interface RentalAnalytics {
  month: string
  quarter: string
  year: string
  total_rentals: number
  total_revenue: number
  total_paid: number
  avg_rental_value: number
  unique_equipment_rented: number
  total_equipment_days: number
  unique_clients: number
  active_rentals: number
  completed_rentals: number
  overdue_rentals: number
  paid_rentals: number
  overdue_payments: number
  damage_reports: number
  total_repair_costs: number
}

export interface EquipmentUtilization {
  id: string
  name: string
  category: string
  rental_rate: number
  is_rentable: boolean
  total_rentals: number
  total_rental_days: number
  avg_rental_rate: number
  total_rental_revenue: number
  current_status: string
  damage_reports: number
  total_repair_costs: number
  last_rental_date?: string
}

// =============================================================================
// HOOK OPTIONS
// =============================================================================

interface UseRentalsOptions {
  type?: 'clients' | 'agreements' | 'analytics' | 'utilization'
  status?: string
  client_id?: string
  equipment_id?: string
  event_id?: string
  tour_id?: string
  limit?: number
  offset?: number
  autoRefresh?: boolean
  refreshInterval?: number
}

interface UseRentalsReturn {
  // Data
  clients: RentalClient[]
  agreements: RentalAgreement[]
  analytics: RentalAnalytics[]
  utilization: EquipmentUtilization[]
  
  // Loading states
  loading: boolean
  clientsLoading: boolean
  agreementsLoading: boolean
  analyticsLoading: boolean
  utilizationLoading: boolean
  
  // Error states
  error: string | null
  clientsError: string | null
  agreementsError: string | null
  analyticsError: string | null
  utilizationError: string | null
  
  // Pagination
  total: number
  limit: number
  offset: number
  
  // Actions
  refetch: () => Promise<void>
  refetchClients: () => Promise<void>
  refetchAgreements: () => Promise<void>
  refetchAnalytics: () => Promise<void>
  refetchUtilization: () => Promise<void>
  
  // CRUD Operations
  createClient: (data: Partial<RentalClient>) => Promise<RentalClient>
  updateClient: (id: string, data: Partial<RentalClient>) => Promise<RentalClient>
  deleteClient: (id: string) => Promise<void>
  
  createAgreement: (data: {
    client_id: string
    event_id?: string
    tour_id?: string
    start_date: string
    end_date: string
    items: Array<{
      equipment_id: string
      quantity: number
      daily_rate: number
      notes?: string
    }>
    [key: string]: any
  }) => Promise<RentalAgreement>
  updateAgreement: (id: string, data: Partial<RentalAgreement>) => Promise<RentalAgreement>
  deleteAgreement: (id: string) => Promise<void>
}

// =============================================================================
// MAIN HOOK
// =============================================================================

export function useRentals(options: UseRentalsOptions = {}): UseRentalsReturn {
  const { user } = useAuth()
  const [clients, setClients] = useState<RentalClient[]>([])
  const [agreements, setAgreements] = useState<RentalAgreement[]>([])
  const [analytics, setAnalytics] = useState<RentalAnalytics[]>([])
  const [utilization, setUtilization] = useState<EquipmentUtilization[]>([])
  
  const [loading, setLoading] = useState(true)
  const [clientsLoading, setClientsLoading] = useState(false)
  const [agreementsLoading, setAgreementsLoading] = useState(false)
  const [analyticsLoading, setAnalyticsLoading] = useState(false)
  const [utilizationLoading, setUtilizationLoading] = useState(false)
  
  const [error, setError] = useState<string | null>(null)
  const [clientsError, setClientsError] = useState<string | null>(null)
  const [agreementsError, setAgreementsError] = useState<string | null>(null)
  const [analyticsError, setAnalyticsError] = useState<string | null>(null)
  const [utilizationError, setUtilizationError] = useState<string | null>(null)
  
  const [total, setTotal] = useState(0)
  const [limit, setLimit] = useState(options.limit || 50)
  const [offset, setOffset] = useState(options.offset || 0)

  const {
    type = 'agreements',
    status,
    client_id,
    equipment_id,
    event_id,
    tour_id,
    autoRefresh = true,
    refreshInterval = 30000
  } = options

  // =============================================================================
  // FETCH FUNCTIONS
  // =============================================================================

  const fetchClients = useCallback(async () => {
    if (!user) return

    try {
      setClientsLoading(true)
      setClientsError(null)

      const params = new URLSearchParams({
        type: 'clients',
        limit: limit.toString(),
        offset: offset.toString()
      })

      if (status) params.append('status', status)

      const response = await fetch(`/api/admin/rentals?${params.toString()}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      setClients(result.clients || [])
      setTotal(result.total || 0)
    } catch (err) {
      console.error('[useRentals] Error fetching clients:', err)
      setClientsError(err instanceof Error ? err.message : 'Failed to fetch clients')
    } finally {
      setClientsLoading(false)
    }
  }, [user, status, limit, offset])

  const fetchAgreements = useCallback(async () => {
    if (!user) return

    try {
      setAgreementsLoading(true)
      setAgreementsError(null)

      const params = new URLSearchParams({
        type: 'agreements',
        limit: limit.toString(),
        offset: offset.toString()
      })

      if (status) params.append('status', status)
      if (client_id) params.append('client_id', client_id)
      if (event_id) params.append('event_id', event_id)
      if (tour_id) params.append('tour_id', tour_id)

      const response = await fetch(`/api/admin/rentals?${params.toString()}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      setAgreements(result.agreements || [])
      setTotal(result.total || 0)
    } catch (err) {
      console.error('[useRentals] Error fetching agreements:', err)
      setAgreementsError(err instanceof Error ? err.message : 'Failed to fetch agreements')
    } finally {
      setAgreementsLoading(false)
    }
  }, [user, status, client_id, event_id, tour_id, limit, offset])

  const fetchAnalytics = useCallback(async () => {
    if (!user) return

    try {
      setAnalyticsLoading(true)
      setAnalyticsError(null)

      const params = new URLSearchParams({ type: 'analytics' })
      if (event_id) params.append('event_id', event_id)
      if (tour_id) params.append('tour_id', tour_id)

      const response = await fetch(`/api/admin/rentals?${params.toString()}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      setAnalytics(result.analytics || [])
    } catch (err) {
      console.error('[useRentals] Error fetching analytics:', err)
      setAnalyticsError(err instanceof Error ? err.message : 'Failed to fetch analytics')
    } finally {
      setAnalyticsLoading(false)
    }
  }, [user, event_id, tour_id])

  const fetchUtilization = useCallback(async () => {
    if (!user) return

    try {
      setUtilizationLoading(true)
      setUtilizationError(null)

      const params = new URLSearchParams({ type: 'utilization' })
      if (event_id) params.append('event_id', event_id)
      if (tour_id) params.append('tour_id', tour_id)

      const response = await fetch(`/api/admin/rentals?${params.toString()}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      setUtilization(result.utilization || [])
    } catch (err) {
      console.error('[useRentals] Error fetching utilization:', err)
      setUtilizationError(err instanceof Error ? err.message : 'Failed to fetch utilization')
    } finally {
      setUtilizationLoading(false)
    }
  }, [user, event_id, tour_id])

  const fetchData = useCallback(async () => {
    if (!user) return

    setLoading(true)
    setError(null)

    try {
      if (type === 'clients') {
        await fetchClients()
      } else if (type === 'agreements') {
        await fetchAgreements()
      } else if (type === 'analytics') {
        await fetchAnalytics()
      } else if (type === 'utilization') {
        await fetchUtilization()
      }
    } catch (err) {
      console.error('[useRentals] Error fetching data:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch data')
    } finally {
      setLoading(false)
    }
  }, [user, type, fetchClients, fetchAgreements, fetchAnalytics, fetchUtilization])

  // =============================================================================
  // CRUD OPERATIONS
  // =============================================================================

  const createClient = useCallback(async (data: Partial<RentalClient>): Promise<RentalClient> => {
    if (!user) throw new Error('User not authenticated')

    try {
      const response = await fetch('/api/admin/rentals', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'create_client',
          ...data
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      await fetchClients() // Refresh clients list
      return result.client
    } catch (err) {
      console.error('[useRentals] Error creating client:', err)
      throw err
    }
  }, [user, fetchClients])

  const updateClient = useCallback(async (id: string, data: Partial<RentalClient>): Promise<RentalClient> => {
    if (!user) throw new Error('User not authenticated')

    try {
      const response = await fetch('/api/admin/rentals', {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id,
          type: 'client',
          ...data
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      await fetchClients() // Refresh clients list
      return result.client
    } catch (err) {
      console.error('[useRentals] Error updating client:', err)
      throw err
    }
  }, [user, fetchClients])

  const deleteClient = useCallback(async (id: string): Promise<void> => {
    if (!user) throw new Error('User not authenticated')

    try {
      const response = await fetch(`/api/admin/rentals?id=${id}&type=client`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      await fetchClients() // Refresh clients list
    } catch (err) {
      console.error('[useRentals] Error deleting client:', err)
      throw err
    }
  }, [user, fetchClients])

  const createAgreement = useCallback(async (data: {
    client_id: string
    event_id?: string
    tour_id?: string
    start_date: string
    end_date: string
    items: Array<{
      equipment_id: string
      quantity: number
      daily_rate: number
      notes?: string
    }>
    [key: string]: any
  }): Promise<RentalAgreement> => {
    if (!user) throw new Error('User not authenticated')

    try {
      const response = await fetch('/api/admin/rentals', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'create_agreement',
          ...data
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      await fetchAgreements() // Refresh agreements list
      return result.agreement
    } catch (err) {
      console.error('[useRentals] Error creating agreement:', err)
      throw err
    }
  }, [user, fetchAgreements])

  const updateAgreement = useCallback(async (id: string, data: Partial<RentalAgreement>): Promise<RentalAgreement> => {
    if (!user) throw new Error('User not authenticated')

    try {
      const response = await fetch('/api/admin/rentals', {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id,
          type: 'agreement',
          ...data
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      await fetchAgreements() // Refresh agreements list
      return result.agreement
    } catch (err) {
      console.error('[useRentals] Error updating agreement:', err)
      throw err
    }
  }, [user, fetchAgreements])

  const deleteAgreement = useCallback(async (id: string): Promise<void> => {
    if (!user) throw new Error('User not authenticated')

    try {
      const response = await fetch(`/api/admin/rentals?id=${id}&type=agreement`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      await fetchAgreements() // Refresh agreements list
    } catch (err) {
      console.error('[useRentals] Error deleting agreement:', err)
      throw err
    }
  }, [user, fetchAgreements])

  // =============================================================================
  // LIFECYCLE
  // =============================================================================

  // Initial fetch
  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      fetchData()
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval, fetchData])

  return {
    // Data
    clients,
    agreements,
    analytics,
    utilization,
    
    // Loading states
    loading,
    clientsLoading,
    agreementsLoading,
    analyticsLoading,
    utilizationLoading,
    
    // Error states
    error,
    clientsError,
    agreementsError,
    analyticsError,
    utilizationError,
    
    // Pagination
    total,
    limit,
    offset,
    
    // Actions
    refetch: fetchData,
    refetchClients: fetchClients,
    refetchAgreements: fetchAgreements,
    refetchAnalytics: fetchAnalytics,
    refetchUtilization: fetchUtilization,
    
    // CRUD Operations
    createClient,
    updateClient,
    deleteClient,
    createAgreement,
    updateAgreement,
    deleteAgreement
  }
}

// =============================================================================
// SPECIALIZED HOOKS
// =============================================================================

export function useRentalClients(options: Omit<UseRentalsOptions, 'type'> = {}) {
  return useRentals({ ...options, type: 'clients' })
}

export function useRentalAgreements(options: Omit<UseRentalsOptions, 'type'> = {}) {
  return useRentals({ ...options, type: 'agreements' })
}

export function useRentalAnalytics(options: Omit<UseRentalsOptions, 'type'> = {}) {
  return useRentals({ ...options, type: 'analytics' })
}

export function useEquipmentUtilization(options: Omit<UseRentalsOptions, 'type'> = {}) {
  return useRentals({ ...options, type: 'utilization' })
} 