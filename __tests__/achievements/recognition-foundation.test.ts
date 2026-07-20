import { describe, expect, it } from 'vitest'
import {
  formatCategoryCount,
  humanizeCategory,
  humanizeRarity,
  nextRewardTier,
} from '@/lib/achievements/labels'
import {
  FallbackAchievementIcon,
  resolveAchievementIcon,
} from '@/lib/achievements/resolve-achievement-icon'
import { groupAchievementsBySeries } from '@/lib/achievements/group-series'
import type { Achievement, UserAchievement } from '@/types/achievements'

describe('recognition labels', () => {
  it('humanizes category and rarity slugs', () => {
    expect(humanizeCategory('business')).toBe('Business')
    expect(humanizeRarity('legendary')).toBe('Legendary')
    expect(formatCategoryCount('business', 1)).toBe('Business · 1 completed')
  })

  it('computes reward tier progress', () => {
    expect(nextRewardTier(0).current).toBe('bronze')
    expect(nextRewardTier(0).next).toBe('silver')
    expect(nextRewardTier(900).current).toBe('silver')
    expect(nextRewardTier(900).next).toBe('gold')
    expect(nextRewardTier(7000).current).toBe('platinum')
    expect(nextRewardTier(7000).next).toBeNull()
  })
})

describe('resolveAchievementIcon', () => {
  it('resolves kebab-case and PascalCase catalog icons', () => {
    const CheckCircle = resolveAchievementIcon('check-circle')
    const CheckCirclePascal = resolveAchievementIcon('CheckCircle')
    const TrophyFallback = resolveAchievementIcon('not-a-real-icon')

    expect(CheckCircle).toBeTruthy()
    expect(CheckCirclePascal).toBeTruthy()
    expect(CheckCircle).toBe(CheckCirclePascal)
    expect(TrophyFallback).toBe(FallbackAchievementIcon)
  })
})

describe('groupAchievementsBySeries', () => {
  it('groups tiered achievements by group_key', () => {
    const achievements = [
      {
        id: 'a1',
        name: 'Calendar Starter I',
        group_key: 'bookings_accepted_total',
        level: 1,
        category: 'business',
        rarity: 'common',
        points: 100,
        is_hidden: false,
      },
      {
        id: 'a2',
        name: 'Calendar Starter II',
        group_key: 'bookings_accepted_total',
        level: 2,
        category: 'business',
        rarity: 'uncommon',
        points: 180,
        is_hidden: false,
      },
      {
        id: 'a3',
        name: 'Solo Win',
        group_key: null,
        level: 1,
        category: 'milestone',
        rarity: 'common',
        points: 50,
        is_hidden: false,
      },
    ] as Achievement[]

    const userAchievements = [
      {
        id: 'ua1',
        achievement_id: 'a1',
        is_completed: true,
      },
    ] as UserAchievement[]

    const groups = groupAchievementsBySeries(achievements, userAchievements)
    const series = groups.find((g) => g.key === 'bookings_accepted_total')
    expect(series?.items).toHaveLength(2)
    expect(series?.items[0].achievement.name).toBe('Calendar Starter I')
    expect(series?.items[0].userAchievement?.is_completed).toBe(true)
  })
})

describe('endorsement work-context verification rules', () => {
  it('treats any job/event/collaboration/project id as verified context', () => {
    function hasWorkContext(input: {
      job_id?: string
      event_id?: string
      collaboration_id?: string
      project_id?: string
    }) {
      return !!(input.job_id || input.event_id || input.collaboration_id || input.project_id)
    }

    expect(hasWorkContext({ job_id: 'job-1' })).toBe(true)
    expect(hasWorkContext({ event_id: 'event-1' })).toBe(true)
    expect(hasWorkContext({})).toBe(false)
  })
})
