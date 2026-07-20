import type { Achievement, UserAchievement } from '@/types/achievements'

export interface AchievementSeriesItem {
  achievement: Achievement
  userAchievement?: UserAchievement
}

export function groupAchievementsBySeries(
  achievements: Achievement[],
  userAchievements: UserAchievement[]
): Array<{ key: string; title: string; category?: string; items: AchievementSeriesItem[] }> {
  const uaMap = new Map(userAchievements.map((ua) => [ua.achievement_id, ua]))
  const groups = new Map<string, AchievementSeriesItem[]>()

  for (const achievement of achievements) {
    if (achievement.is_hidden && !uaMap.get(achievement.id)?.is_completed) continue
    const key = achievement.group_key || achievement.id
    const list = groups.get(key) || []
    list.push({
      achievement,
      userAchievement: uaMap.get(achievement.id),
    })
    groups.set(key, list)
  }

  return Array.from(groups.entries())
    .map(([key, items]) => {
      const sorted = [...items].sort(
        (a, b) => (a.achievement.level || 0) - (b.achievement.level || 0)
      )
      const title =
        sorted.length > 1
          ? (sorted[0].achievement.group_key || sorted[0].achievement.name)
              .replace(/[-_]/g, ' ')
              .replace(/\b\w/g, (c) => c.toUpperCase())
          : sorted[0].achievement.name
      return {
        key,
        title,
        category: sorted[0].achievement.category,
        items: sorted,
      }
    })
    .sort((a, b) => {
      const aDone = a.items.filter((i) => i.userAchievement?.is_completed).length
      const bDone = b.items.filter((i) => i.userAchievement?.is_completed).length
      return bDone - aDone
    })
}
