'use client'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/utils'
import {
  AlertTriangle,
  Bell,
  MessageSquare,
  ShoppingBag,
  Target,
} from 'lucide-react'
import {
  ARTIST_CARD,
  ARTIST_SECTION_LABEL,
} from '@/components/dashboard/artist-tokens'

export interface AttentionChip {
  id: string
  label: string
  count: number
  tone: 'neutral' | 'warning' | 'critical' | 'ok'
  targetId: string
}

interface ArtistAttentionStripProps {
  chips: AttentionChip[]
  onChipClick: (targetId: string) => void
}

const toneStyles: Record<AttentionChip['tone'], string> = {
  neutral:
    'border-white/15 bg-white/[0.04] text-slate-200 hover:bg-white/[0.08]',
  warning:
    'border-amber-500/40 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20',
  critical:
    'border-red-500/40 bg-red-500/10 text-red-200 hover:bg-red-500/20 shadow-[0_0_16px_-6px_rgba(239,68,68,0.45)]',
  ok:
    'border-emerald-500/40 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20',
}

const chipIcons: Record<string, typeof Target> = {
  actions: Target,
  notifications: Bell,
  commerce: ShoppingBag,
  messages: MessageSquare,
}

export function ArtistAttentionStrip({ chips, onChipClick }: ArtistAttentionStripProps) {
  const visible = chips.filter((chip) => chip.count > 0 || chip.tone === 'ok')
  if (visible.length === 0) return null

  return (
    <section
      aria-label="Needs attention"
      className={cn(ARTIST_CARD, 'mb-6 flex flex-wrap items-center gap-2 px-4 py-3')}
    >
      <div className={cn(ARTIST_SECTION_LABEL, 'mr-2 flex items-center gap-1.5')}>
        <AlertTriangle className="h-3.5 w-3.5 text-amber-400/80" />
        Attention
      </div>
      {visible.map((chip) => {
        const Icon = chipIcons[chip.id] || Target
        return (
          <button
            key={chip.id}
            type="button"
            onClick={() => onChipClick(chip.targetId)}
            className={cn(
              'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm backdrop-blur-sm transition-all duration-200',
              toneStyles[chip.tone]
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            <span>{chip.label}</span>
            <Badge variant="secondary" className="border-0 bg-black/40 text-current">
              {chip.count}
            </Badge>
          </button>
        )
      })}
    </section>
  )
}
