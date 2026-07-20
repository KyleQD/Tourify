'use client'

import { CalendarDays, Disc3, FileText, Globe2, MessageCircle, Newspaper, Sparkles } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { NewsCategory } from '@/lib/news/types'

interface NewsFiltersProps {
  activeCategory: NewsCategory
  onCategoryChange: (category: NewsCategory) => void
}

const FILTERS: Array<{ value: NewsCategory; label: string; icon: LucideIcon }> = [
  { value: 'featured', label: 'Featured', icon: Sparkles },
  { value: 'articles', label: 'Articles', icon: Newspaper },
  { value: 'new-music', label: 'New Music', icon: Disc3 },
  { value: 'events', label: 'Events', icon: CalendarDays },
  { value: 'gossip', label: 'Gossip', icon: MessageCircle },
  { value: 'editorial', label: 'Editorial', icon: FileText },
  { value: 'global', label: 'Global', icon: Globe2 }
]

export function NewsFilters({ activeCategory, onCategoryChange }: NewsFiltersProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {FILTERS.map(filter => {
        const Icon = filter.icon
        const isActive = activeCategory === filter.value

        return (
          <button
            key={filter.value}
            type="button"
            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-medium transition-all duration-200 ${
              isActive
                ? 'bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white shadow-lg shadow-fuchsia-500/20'
                : 'border border-white/10 bg-white/5 text-slate-400 hover:border-white/20 hover:bg-white/10 hover:text-white'
            }`}
            onClick={() => onCategoryChange(filter.value)}
          >
            <Icon className="h-3.5 w-3.5" />
            {filter.label}
          </button>
        )
      })}
    </div>
  )
}
