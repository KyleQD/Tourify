'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface UseSiteMapRealtimeOptions {
  siteMapId: string
  userId?: string
  enableGeometry?: boolean
}

interface UseSiteMapRealtimeResult {
  isConnected: boolean
  presenceCount: number
  activityVersion: number
  tasksVersion: number
  geometryVersion: number
}

export function useSiteMapRealtime({
  siteMapId,
  userId = 'anonymous',
  enableGeometry = true,
}: UseSiteMapRealtimeOptions): UseSiteMapRealtimeResult {
  const [isConnected, setIsConnected] = useState(false)
  const [presenceCount, setPresenceCount] = useState(0)
  const [activityVersion, setActivityVersion] = useState(0)
  const [tasksVersion, setTasksVersion] = useState(0)
  const [geometryVersion, setGeometryVersion] = useState(0)
  const activityChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const taskChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const geometryChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const presenceChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  useEffect(() => {
    if (!siteMapId) return

    const activityChannel = supabase
      .channel(`site-map-activity-${siteMapId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'site_map_activity_log',
          filter: `site_map_id=eq.${siteMapId}`,
        },
        () => setActivityVersion((prev) => prev + 1)
      )
      .subscribe()

    const taskChannel = supabase
      .channel(`site-map-tasks-${siteMapId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'map_task_assignments',
          filter: `site_map_id=eq.${siteMapId}`,
        },
        () => setTasksVersion((prev) => prev + 1)
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') setIsConnected(true)
      })

    let geometryChannel: ReturnType<typeof supabase.channel> | null = null
    if (enableGeometry) {
      geometryChannel = supabase
        .channel(`site-map-geometry-${siteMapId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'site_map_elements', filter: `site_map_id=eq.${siteMapId}` },
          () => setGeometryVersion((prev) => prev + 1)
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'site_map_zones', filter: `site_map_id=eq.${siteMapId}` },
          () => setGeometryVersion((prev) => prev + 1)
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'glamping_tents', filter: `site_map_id=eq.${siteMapId}` },
          () => setGeometryVersion((prev) => prev + 1)
        )
        .subscribe()
      geometryChannelRef.current = geometryChannel
    }

    const presenceChannel = supabase.channel(`site-map-presence-${siteMapId}`, {
      config: { presence: { key: userId } },
    })

    presenceChannel.on('presence', { event: 'sync' }, () => {
      const state = presenceChannel.presenceState()
      const nextCount = Object.keys(state).length
      setPresenceCount(nextCount)
    })

    presenceChannel
      .subscribe(async (status) => {
        if (status !== 'SUBSCRIBED') return
        await presenceChannel.track({
          site_map_id: siteMapId,
          user_id: userId,
          online_at: new Date().toISOString(),
        })
      })

    activityChannelRef.current = activityChannel
    taskChannelRef.current = taskChannel
    presenceChannelRef.current = presenceChannel

    return () => {
      if (activityChannelRef.current) void supabase.removeChannel(activityChannelRef.current)
      if (taskChannelRef.current) void supabase.removeChannel(taskChannelRef.current)
      if (geometryChannelRef.current) void supabase.removeChannel(geometryChannelRef.current)
      if (presenceChannelRef.current) void supabase.removeChannel(presenceChannelRef.current)
      setIsConnected(false)
    }
  }, [enableGeometry, siteMapId, userId])

  return useMemo(
    () => ({ isConnected, presenceCount, activityVersion, tasksVersion, geometryVersion }),
    [activityVersion, geometryVersion, isConnected, presenceCount, tasksVersion]
  )
}
