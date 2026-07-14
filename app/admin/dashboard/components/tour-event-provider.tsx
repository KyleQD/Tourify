"use client"

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import type { AdminTour, AdminEvent } from '@/types/admin'

type Tour = AdminTour
type Event = AdminEvent

interface TourEventContextType {
  tours: Tour[]
  events: Event[]
  loading: boolean
  error: string | null
  isFirstTimeUser: boolean
  hasData: boolean
  refetch: () => void
}

const TourEventContext = createContext<TourEventContextType | undefined>(undefined)

export function TourEventProvider({ children }: { children: ReactNode }) {
  const [tours, setTours] = useState<Tour[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [initialLoadComplete, setInitialLoadComplete] = useState(false)

  function buildNoStoreInit(): RequestInit {
    return {
      credentials: 'include',
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
      },
    }
  }

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)

      const [toursResponse, eventsResponse] = await Promise.all([
        fetch('/api/admin/tours', buildNoStoreInit()).catch(() => ({ ok: false, json: async () => ({ tours: [] }) })),
        fetch('/api/admin/events', buildNoStoreInit()).catch(() => ({ ok: false, json: async () => ({ events: [] }) }))
      ])

      let toursData: Tour[] = []
      if (toursResponse.ok) {
        const toursResult = await toursResponse.json()
        toursData = toursResult.tours || []
      }

      let eventsData: Event[] = []
      if (eventsResponse.ok) {
        const eventsResult = await eventsResponse.json()
        eventsData = eventsResult.events || []
      }

      setTours(toursData)
      setEvents(eventsData)
      
      // No error state - we always succeed with empty arrays if needed
      setError(null)

    } catch {
      setTours([])
      setEvents([])
      setError(null) // Don't show errors, just empty states
    } finally {
      setLoading(false)
      setInitialLoadComplete(true)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Determine user state based on data
  const hasData = tours.length > 0 || events.length > 0
  const isFirstTimeUser = initialLoadComplete && !hasData

  const value: TourEventContextType = {
    tours,
    events,
    loading,
    error,
    isFirstTimeUser,
    hasData,
    refetch: fetchData
  }

  return (
    <TourEventContext.Provider value={value}>
      {children}
    </TourEventContext.Provider>
  )
}

export function useTourEventContext() {
  const context = useContext(TourEventContext)
  if (context === undefined) {
    throw new Error('useTourEventContext must be used within a TourEventProvider')
  }
  return context
} 