import type { SupabaseClient } from '@supabase/supabase-js'
import { achievementEngine } from '@/lib/services/achievement-engine.service'

export async function recordAchievementMetricEvent(args: {
  supabase: SupabaseClient
  userId: string
  metricKey: string
  eventType: string
  delta?: number
  absoluteValue?: number
  eventData?: Record<string, unknown>
  relatedProjectId?: string
  relatedEventId?: string
  relatedCollaborationId?: string
}) {
  try {
    await achievementEngine.recordMetricEvent({
      supabase: args.supabase,
      userId: args.userId,
      metricKey: args.metricKey,
      eventType: args.eventType,
      delta: args.delta,
      absoluteValue: args.absoluteValue,
      eventData: args.eventData,
      relatedProjectId: args.relatedProjectId,
      relatedEventId: args.relatedEventId,
      relatedCollaborationId: args.relatedCollaborationId,
      eventSource: 'application',
    })
  } catch (error) {
    console.warn('[achievement-metric-events] skipped metric event:', error)
  }
}
