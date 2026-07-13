'use client'

import { useMemo, useState, useEffect, useCallback } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { Button } from '@/components/ui/button'
import { GripVertical } from 'lucide-react'
import {
  artistDashboardLayoutService,
  type ArtistDashboardLayoutState,
  type ArtistDashboardWidgetId,
} from '@/lib/services/artist-dashboard-layout.service'
import { SortableWidgetSection } from '@/components/dashboard/sortable-widget-section'
import {
  ARTIST_OUTLINE_BTN,
  ARTIST_SECTION_LABEL,
} from '@/components/dashboard/artist-tokens'

interface ArtistDashboardBottomSectionsProps {
  userId: string
  sections: Record<ArtistDashboardWidgetId, React.ReactNode>
}

export function ArtistDashboardBottomSections({ userId, sections: children }: ArtistDashboardBottomSectionsProps) {
  const [layout, setLayout] = useState<ArtistDashboardLayoutState>({
    order: ['recommendations', 'analytics', 'notifications'],
    hidden: [],
  })
  const [customize, setCustomize] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    artistDashboardLayoutService.getLayout(userId).then((l) => {
      if (!cancelled) setLayout(l)
    })
    return () => {
      cancelled = true
    }
  }, [userId])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const orderedIds = useMemo(() => {
    const hidden = new Set(layout.hidden)
    return layout.order.filter((id) => !hidden.has(id))
  }, [layout])

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event
      if (!over || active.id === over.id) return
      const oldIndex = layout.order.indexOf(active.id as ArtistDashboardWidgetId)
      const newIndex = layout.order.indexOf(over.id as ArtistDashboardWidgetId)
      if (oldIndex < 0 || newIndex < 0) return
      const nextOrder = arrayMove(layout.order, oldIndex, newIndex)
      const next = { ...layout, order: nextOrder }
      setLayout(next)
      setSaving(true)
      try {
        await artistDashboardLayoutService.saveLayout(userId, next)
      } catch (e) {
        console.error('[ArtistDashboardBottomSections] save failed', e)
      } finally {
        setSaving(false)
      }
    },
    [layout, userId]
  )

  return (
    <div className="mt-8 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className={ARTIST_SECTION_LABEL}>Depth</div>
          <h2 className="mt-1 text-lg font-semibold tracking-tight text-white">Insights</h2>
        </div>
        <div className="flex items-center gap-2">
          {customize && (
            <span className="text-xs text-slate-500">{saving ? 'Saving…' : 'Drag sections to reorder'}</span>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={ARTIST_OUTLINE_BTN}
            onClick={() => setCustomize((v) => !v)}
          >
            <GripVertical className="mr-1 h-4 w-4" />
            {customize ? 'Done' : 'Customize layout'}
          </Button>
        </div>
      </div>

      {customize ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={layout.order} strategy={verticalListSortingStrategy}>
            <div className="space-y-8">
              {orderedIds.map((id) => (
                <SortableWidgetSection key={id} id={id}>
                  {children[id]}
                </SortableWidgetSection>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <div className="space-y-8">
          {orderedIds.map((id) => (
            <div key={id}>{children[id]}</div>
          ))}
        </div>
      )}
    </div>
  )
}
