'use client'

import { BadgeCheck, Flame, Landmark, MapPinned, Radar, Users } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

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
  { value: 'verified', label: 'Verified', icon: BadgeCheck }
]

export function NewsFilters({ activeFacet, onFacetChange }: NewsFiltersProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {FILTERS.map(filter => {
        const Icon = filter.icon
        const isActive = activeFacet === filter.value

        return (
          <button
            key={filter.value}
            type="button"
            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-medium transition-all duration-200 ${
              isActive
                ? 'bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white shadow-lg shadow-fuchsia-500/20'
                : 'border border-white/10 bg-white/5 text-slate-400 hover:border-white/20 hover:bg-white/10 hover:text-white'
            }`}
            onClick={() => onFacetChange(filter.value)}
          >
            <Icon className="h-3.5 w-3.5" />
            {filter.label}
          </button>
        )
      })}
    </div>
  )
}
