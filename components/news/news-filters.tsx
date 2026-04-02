'use client'

import { BadgeCheck, Flame, Landmark, MapPinned, Radar, Users } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'

interface NewsFiltersProps {
  activeFacet: NewsFacet
  onFacetChange: (facet: NewsFacet) => void
}

export type NewsFacet = 'top' | 'following' | 'local' | 'industry' | 'gossip' | 'verified'

const FILTERS: Array<{ value: NewsFacet; label: string; icon: LucideIcon }> = [
  { value: 'top', label: 'Top', icon: Flame },
  { value: 'following', label: 'Following', icon: Users },
  { value: 'local', label: 'Local', icon: MapPinned },
  { value: 'industry', label: 'Industry', icon: Landmark },
  { value: 'gossip', label: 'Gossip', icon: Radar },
  { value: 'verified', label: 'Verified Only', icon: BadgeCheck }
]

export function NewsFilters({ activeFacet, onFacetChange }: NewsFiltersProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {FILTERS.map(filter => {
        const Icon = filter.icon
        const isActive = activeFacet === filter.value

        return (
          <Button
            key={filter.value}
            type="button"
            variant={isActive ? 'default' : 'outline'}
            className={
              isActive
                ? 'rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                : 'surface-chip hover:bg-white/10'
            }
            onClick={() => onFacetChange(filter.value)}
          >
            <Icon className="mr-2 h-4 w-4" />
            {filter.label}
          </Button>
        )
      })}
    </div>
  )
}
