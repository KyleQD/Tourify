const CATEGORY_LABELS: Record<string, string> = {
  music: 'Music',
  performance: 'Performance',
  collaboration: 'Collaboration',
  business: 'Business',
  community: 'Community',
  technical: 'Technical',
  creative: 'Creative',
  leadership: 'Leadership',
  innovation: 'Innovation',
  milestone: 'Milestone',
  recognition: 'Recognition',
  verification: 'Verification',
  expertise: 'Expertise',
  specialization: 'Specialization',
  partnership: 'Partnership',
  certification: 'Certification',
  award: 'Award',
  custom: 'Custom',
  interpersonal: 'Interpersonal',
  specialized: 'Specialized',
}

const RARITY_LABELS: Record<string, string> = {
  common: 'Common',
  uncommon: 'Uncommon',
  rare: 'Rare',
  epic: 'Epic',
  legendary: 'Legendary',
}

export function humanizeCategory(category?: string | null): string {
  if (!category) return 'General'
  return CATEGORY_LABELS[category] || category
    .split(/[-_\s]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export function humanizeRarity(rarity?: string | null): string {
  if (!rarity) return 'Common'
  return RARITY_LABELS[rarity] || humanizeCategory(rarity)
}

export function formatCategoryCount(category: string, count: number): string {
  const label = humanizeCategory(category)
  return `${label} · ${count} completed`
}

export const REWARD_TIER_THRESHOLDS = {
  bronze: 0,
  silver: 800,
  gold: 2500,
  platinum: 6000,
} as const

export function nextRewardTier(totalPoints: number): {
  current: keyof typeof REWARD_TIER_THRESHOLDS
  next: keyof typeof REWARD_TIER_THRESHOLDS | null
  progress: number
  pointsToNext: number
} {
  if (totalPoints >= REWARD_TIER_THRESHOLDS.platinum) {
    return { current: 'platinum', next: null, progress: 100, pointsToNext: 0 }
  }
  if (totalPoints >= REWARD_TIER_THRESHOLDS.gold) {
    const span = REWARD_TIER_THRESHOLDS.platinum - REWARD_TIER_THRESHOLDS.gold
    const into = totalPoints - REWARD_TIER_THRESHOLDS.gold
    return {
      current: 'gold',
      next: 'platinum',
      progress: Math.min(100, Math.round((into / span) * 100)),
      pointsToNext: REWARD_TIER_THRESHOLDS.platinum - totalPoints,
    }
  }
  if (totalPoints >= REWARD_TIER_THRESHOLDS.silver) {
    const span = REWARD_TIER_THRESHOLDS.gold - REWARD_TIER_THRESHOLDS.silver
    const into = totalPoints - REWARD_TIER_THRESHOLDS.silver
    return {
      current: 'silver',
      next: 'gold',
      progress: Math.min(100, Math.round((into / span) * 100)),
      pointsToNext: REWARD_TIER_THRESHOLDS.gold - totalPoints,
    }
  }
  const span = REWARD_TIER_THRESHOLDS.silver - REWARD_TIER_THRESHOLDS.bronze
  return {
    current: 'bronze',
    next: 'silver',
    progress: Math.min(100, Math.round((totalPoints / span) * 100)),
    pointsToNext: REWARD_TIER_THRESHOLDS.silver - totalPoints,
  }
}
