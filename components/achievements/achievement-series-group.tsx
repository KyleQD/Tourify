'use client'

import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { AchievementIcon } from '@/components/achievements/achievement-icon'
import { humanizeCategory, humanizeRarity } from '@/lib/achievements/labels'
import {
  type AchievementSeriesItem,
  groupAchievementsBySeries,
} from '@/lib/achievements/group-series'
import { CheckCircle } from 'lucide-react'

export type { AchievementSeriesItem }
export { groupAchievementsBySeries }

interface AchievementSeriesGroupProps {
  title: string
  category?: string
  items: AchievementSeriesItem[]
  className?: string
}

export function AchievementSeriesGroup({
  title,
  category,
  items,
  className,
}: AchievementSeriesGroupProps) {
  const completedCount = items.filter((item) => item.userAchievement?.is_completed).length
  const seriesProgress = items.length
    ? Math.round((completedCount / items.length) * 100)
    : 0

  return (
    <div
      className={cn(
        'rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm',
        className
      )}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          {category && (
            <p className="text-sm text-white/55">{humanizeCategory(category)}</p>
          )}
        </div>
        <Badge variant="outline" className="border-white/20 bg-transparent text-white/70">
          {completedCount}/{items.length}
        </Badge>
      </div>

      <Progress value={seriesProgress} className="mb-4 h-2 bg-white/10" />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {items.map(({ achievement, userAchievement }) => {
          const isCompleted = !!userAchievement?.is_completed
          const progress = userAchievement?.progress_percentage || 0
          const isHidden = achievement.is_hidden && !isCompleted

          return (
            <div
              key={achievement.id}
              className={cn(
                'rounded-xl border border-white/10 bg-black/20 p-3 transition-all duration-300',
                isCompleted && 'border-emerald-400/40 bg-emerald-500/10'
              )}
            >
              <div className="mb-2 flex items-center gap-2">
                <div
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-lg',
                    isCompleted
                      ? 'bg-emerald-500/30 text-emerald-200'
                      : 'bg-white/10 text-white/50'
                  )}
                >
                  {isHidden ? (
                    <span className="text-xs">?</span>
                  ) : (
                    <AchievementIcon name={achievement.icon} className="h-4 w-4" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white" title={achievement.name}>
                    {isHidden ? 'Hidden' : achievement.name}
                  </p>
                  <p className="text-xs text-white/45">
                    {humanizeRarity(achievement.rarity)} · {achievement.points} pts
                  </p>
                </div>
                {isCompleted && <CheckCircle className="h-4 w-4 shrink-0 text-emerald-400" />}
              </div>
              {!isCompleted && !isHidden && (
                <Progress value={progress} className="h-1.5 bg-white/10" />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
