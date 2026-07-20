'use client'

import { resolveAchievementIcon } from '@/lib/achievements/resolve-achievement-icon'

interface AchievementIconProps {
  name?: string | null
  className?: string
}

export function AchievementIcon({ name, className = 'h-5 w-5' }: AchievementIconProps) {
  const Icon = resolveAchievementIcon(name)
  return <Icon className={className} aria-hidden="true" />
}
