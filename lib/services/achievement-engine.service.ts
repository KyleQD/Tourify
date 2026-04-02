import type { SupabaseClient } from '@supabase/supabase-js'

export interface AchievementRow {
  id: string
  name: string
  requirements: Record<string, any> | null
  metric_key: string | null
  target_value: number | null
  evaluation_mode: 'increment' | 'absolute' | null
}

interface UserAchievementRow {
  id: string
  user_id: string
  achievement_id: string
  current_value: number
  target_value: number
  progress_percentage: number
  is_completed: boolean
  completed_at: string | null
}

export interface RecordMetricEventArgs {
  supabase: SupabaseClient
  userId: string
  metricKey: string
  eventType: string
  delta?: number
  absoluteValue?: number
  eventSource?: string
  eventData?: Record<string, unknown>
  relatedEventId?: string
  relatedProjectId?: string
  relatedCollaborationId?: string
}

export interface RecordMetricEventResult {
  unlockedAchievementIds: string[]
}

export function resolveTarget(achievement: AchievementRow): number {
  const fromRequirements = Number(achievement.requirements?.target ?? achievement.requirements?.threshold)
  if (Number.isFinite(fromRequirements) && fromRequirements > 0) return fromRequirements
  if (achievement.target_value && achievement.target_value > 0) return achievement.target_value
  return 1
}

export function resolveMode(achievement: AchievementRow): 'increment' | 'absolute' {
  const reqMode = achievement.requirements?.mode
  if (reqMode === 'absolute') return 'absolute'
  if (achievement.evaluation_mode === 'absolute') return 'absolute'
  return 'increment'
}

export function computeNextValue(args: {
  currentValue: number
  mode: 'increment' | 'absolute'
  delta: number
  absoluteValue?: number
}): number {
  if (args.mode === 'absolute') {
    const snapshot = Number(args.absoluteValue ?? args.delta)
    if (!Number.isFinite(snapshot)) return args.currentValue
    return Math.max(args.currentValue, snapshot)
  }
  return args.currentValue + args.delta
}

export const achievementEngine = {
  async recordMetricEvent(args: RecordMetricEventArgs): Promise<RecordMetricEventResult> {
    const delta = Number(args.delta ?? 1)
    const metricValue = Number(args.absoluteValue ?? delta)

    // Best-effort event log
    await args.supabase.from('achievement_progress_events').insert({
      user_id: args.userId,
      achievement_id: null,
      metric_key: args.metricKey,
      metric_value: metricValue,
      event_type: args.eventType,
      event_value: delta,
      event_source: args.eventSource ?? 'application',
      event_data: args.eventData ?? {},
      related_event_id: args.relatedEventId,
      related_project_id: args.relatedProjectId,
      related_collaboration_id: args.relatedCollaborationId
    })

    const { data: achievementRows, error: achievementsError } = await args.supabase
      .from('achievements')
      .select('id, name, requirements, metric_key, target_value, evaluation_mode')
      .eq('is_active', true)

    if (achievementsError || !achievementRows?.length) {
      return { unlockedAchievementIds: [] }
    }

    const matchingAchievements = (achievementRows as AchievementRow[]).filter(achievement => {
      const reqMetric = String(achievement.requirements?.metric_key ?? '')
      return achievement.metric_key === args.metricKey || reqMetric === args.metricKey
    })

    if (!matchingAchievements.length) {
      return { unlockedAchievementIds: [] }
    }

    const unlockedAchievementIds: string[] = []
    const nowIso = new Date().toISOString()

    for (const achievement of matchingAchievements) {
      const { data: existingRow } = await args.supabase
        .from('user_achievements')
        .select('id, user_id, achievement_id, current_value, target_value, progress_percentage, is_completed, completed_at')
        .eq('user_id', args.userId)
        .eq('achievement_id', achievement.id)
        .maybeSingle()

      const existing = existingRow as UserAchievementRow | null
      const currentValue = Number(existing?.current_value ?? 0)
      const targetValue = resolveTarget(achievement)
      const mode = resolveMode(achievement)
      const nextValue = computeNextValue({
        currentValue,
        mode,
        delta,
        absoluteValue: args.absoluteValue
      })

      const progressPercentage = Math.min(100, Math.round((nextValue / targetValue) * 100))
      const wasCompleted = Boolean(existing?.is_completed)
      const isCompleted = wasCompleted || nextValue >= targetValue
      const completedAt = wasCompleted ? existing?.completed_at : isCompleted ? nowIso : null

      const { error: upsertError } = await args.supabase
        .from('user_achievements')
        .upsert(
          {
            user_id: args.userId,
            achievement_id: achievement.id,
            current_value: nextValue,
            target_value: targetValue,
            progress_percentage: progressPercentage,
            is_completed: isCompleted,
            completed_at: completedAt,
            updated_at: nowIso
          },
          { onConflict: 'user_id,achievement_id' }
        )

      if (!upsertError && !wasCompleted && isCompleted) {
        unlockedAchievementIds.push(achievement.id)
      }
    }

    return { unlockedAchievementIds }
  }
}
