'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface UseSiteMapRealtimeOptions {
  siteMapId: string
  userId?: string
}

interface UseSiteMapRealtimeResult {
  isConnected: boolean
  presenceCount: number
  activityVersion: number
  tasksVersion: number
}

export function useSiteMapRealtime({
  siteMapId,
  userId = 'anonymous',
}: UseSiteMapRealtimeOptions): UseSiteMapRealtimeResult {
  const [isConnected, setIsConnected] = useState(false)
  const [presenceCount, setPresenceCount] = useState(0)
  const [activityVersion, setActivityVersion] = useState(0)
  const [tasksVersion, setTasksVersion] = useState(0)
  const activityChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const taskChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
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
      if (presenceChannelRef.current) void supabase.removeChannel(presenceChannelRef.current)
      setIsConnected(false)
    }
  }, [siteMapId, userId])

  return useMemo(
    () => ({ isConnected, presenceCount, activityVersion, tasksVersion }),
    [activityVersion, isConnected, presenceCount, tasksVersion]
  )
}
