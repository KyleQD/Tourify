'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { ArtistDashboardWidgetId } from '@/lib/services/artist-dashboard-layout.service'
import { GripVertical } from 'lucide-react'

interface SortableWidgetSectionProps {
  id: ArtistDashboardWidgetId
  children: React.ReactNode
}

export function SortableWidgetSection({ id, children }: SortableWidgetSectionProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.85 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} className="relative rounded-2xl border border-dashed border-slate-600/60 p-2">
      <button
        type="button"
        className="absolute left-2 top-2 z-10 flex h-9 w-9 items-center justify-center rounded-lg bg-slate-800/90 text-slate-400 hover:text-white"
        aria-label="Drag to reorder"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="pl-10">{children}</div>
    </div>
  )
}
