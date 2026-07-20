'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  AchievementNotification,
} from '@/components/achievements/achievement-notification'

interface UnlockPayload {
  id: string
  name: string
  description: string
  category: string
  icon: string
  color: string
  points: number
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
}

const RARITY_DISMISS_MS: Record<UnlockPayload['rarity'], number> = {
  common: 4000,
  uncommon: 4500,
  rare: 5500,
  epic: 6500,
  legendary: 7500,
}

function normalizeRarity(value?: string): UnlockPayload['rarity'] {
  if (value === 'uncommon' || value === 'rare' || value === 'epic' || value === 'legendary') {
    return value
  }
  return 'common'
}

function extractUnlocksFromNotification(notification: {
  id?: string
  type?: string
  metadata?: Record<string, unknown>
  content?: string
  title?: string
}): UnlockPayload[] {
  if (!notification?.type) return []
  if (
    notification.type !== 'achievement_unlocked' &&
    notification.type !== 'badge_granted'
  ) {
    return []
  }

  const metadata = notification.metadata || {}
  const list = Array.isArray(metadata.achievements)
    ? (metadata.achievements as Record<string, unknown>[])
    : null

  if (list?.length) {
    return list.map((item, index) => ({
      id: String(item.id || `${notification.id}-${index}`),
      name: String(item.name || 'Achievement'),
      description: String(item.description || notification.content || ''),
      category: String(item.category || 'milestone'),
      icon: String(item.icon || 'trophy'),
      color: String(item.color || '#10b981'),
      points: Number(item.points || 0),
      rarity: normalizeRarity(String(item.rarity || 'common')),
    }))
  }

  if (notification.type === 'badge_granted') {
    return [
      {
        id: String(metadata.badge_id || notification.id || 'badge'),
        name: String(metadata.badge_name || notification.title || 'New badge'),
        description: String(notification.content || 'You received a new badge.'),
        category: 'recognition',
        icon: String(metadata.icon || 'award'),
        color: String(metadata.color || '#f59e0b'),
        points: 0,
        rarity: normalizeRarity(String(metadata.rarity || 'uncommon')),
      },
    ]
  }

  if (metadata.achievement_id || metadata.name) {
    return [
      {
        id: String(metadata.achievement_id || notification.id || 'achievement'),
        name: String(metadata.name || notification.title || 'Achievement unlocked'),
        description: String(metadata.description || notification.content || ''),
        category: String(metadata.category || 'milestone'),
        icon: String(metadata.icon || 'trophy'),
        color: String(metadata.color || '#10b981'),
        points: Number(metadata.points || 0),
        rarity: normalizeRarity(String(metadata.rarity || 'common')),
      },
    ]
  }

  return []
}

export function AchievementUnlockProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [queue, setQueue] = useState<UnlockPayload[]>([])
  const [current, setCurrent] = useState<UnlockPayload | null>(null)
  const [isVisible, setIsVisible] = useState(false)
  const seenIdsRef = useRef<Set<string>>(new Set())
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const enqueue = useCallback((unlocks: UnlockPayload[]) => {
    if (!unlocks.length) return
    setQueue((prev) => {
      const next = [...prev]
      for (const unlock of unlocks) {
        if (seenIdsRef.current.has(unlock.id)) continue
        seenIdsRef.current.add(unlock.id)
        next.push(unlock)
      }
      return next
    })
  }, [])

  const closeCurrent = useCallback(() => {
    setIsVisible(false)
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current)
      dismissTimerRef.current = null
    }
    setTimeout(() => {
      setCurrent(null)
    }, 250)
  }, [])

  useEffect(() => {
    if (current || !queue.length) return
    const [next, ...rest] = queue
    setCurrent(next)
    setQueue(rest)
    setIsVisible(true)
  }, [current, queue])

  useEffect(() => {
    if (!current || !isVisible) return
    const ms = RARITY_DISMISS_MS[current.rarity] || 4000
    dismissTimerRef.current = setTimeout(() => {
      closeCurrent()
    }, ms)
    return () => {
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current)
    }
  }, [current, isVisible, closeCurrent])

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null
    let isMounted = true

    async function setup() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user || !isMounted) return

      channel = supabase
        .channel(`recognition-unlocks-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const row = payload.new as {
              id?: string
              type?: string
              title?: string
              content?: string
              metadata?: Record<string, unknown>
            }
            const unlocks = extractUnlocksFromNotification(row)
            enqueue(unlocks)
          }
        )
        .subscribe()
    }

    setup()

    return () => {
      isMounted = false
      if (channel) supabase.removeChannel(channel)
    }
  }, [enqueue])

  return (
    <>
      {children}
      {current && (
        <AchievementNotification
          achievement={current}
          isVisible={isVisible}
          autoHide={false}
          onClose={closeCurrent}
          onViewDetails={() => {
            router.push(`/achievements?tab=achievements&highlight=${current.id}`)
          }}
        />
      )}
    </>
  )
}
