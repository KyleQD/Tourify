'use client'

import { FileText, Newspaper, Megaphone } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PRESS_FORMAT_LABELS, type PressFormat } from '@/lib/press/formats'

const OPTIONS: Array<{
  format: PressFormat
  icon: LucideIcon
  description: string
}> = [
  {
    format: 'blog',
    icon: FileText,
    description: 'Personal long-form posts that appear on your feed',
  },
  {
    format: 'article',
    icon: Newspaper,
    description: 'Industry stories that appear in News → Articles',
  },
  {
    format: 'press_release',
    icon: Megaphone,
    description: 'Official announcements to share privately + download as PDF',
  },
]

interface PressFormatPickerProps {
  value?: PressFormat | null
  onSelect: (format: PressFormat) => void
  className?: string
}

export function PressFormatPicker({ value, onSelect, className }: PressFormatPickerProps) {
  return (
    <div className={cn('grid gap-3 sm:grid-cols-3', className)}>
      {OPTIONS.map(option => {
        const Icon = option.icon
        const isSelected = value === option.format

        return (
          <button
            key={option.format}
            type="button"
            onClick={() => onSelect(option.format)}
            className={cn(
              'rounded-2xl border p-4 text-left transition-all',
              isSelected
                ? 'border-purple-400/60 bg-purple-500/15 shadow-lg shadow-purple-500/10'
                : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
            )}
          >
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-blue-500">
              <Icon className="h-5 w-5 text-white" />
            </div>
            <p className="text-sm font-semibold text-white">{PRESS_FORMAT_LABELS[option.format]}</p>
            <p className="mt-1 text-xs text-slate-400">{option.description}</p>
          </button>
        )
      })}
    </div>
  )
}
