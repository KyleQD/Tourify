"use client"

import React from "react"
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Eye, EyeOff, GripVertical, Plus, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import { EPK_SECTION_LABELS } from "@/lib/epk/epk-preview-utils"
import type { EpkSectionStyles } from "@/lib/epk/epk-section-styles"
import { isEpkSectionStyleEmpty } from "@/lib/epk/epk-section-styles"

function LayerRow({
  id,
  selected,
  styled,
  onSelect,
  onHide,
}: {
  id: string
  selected: boolean
  styled: boolean
  onSelect: () => void
  onHide: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "group flex items-center gap-1 rounded-lg border transition-colors",
        selected ? "border-purple-400/70 bg-purple-500/15" : "border-transparent hover:bg-white/[0.05]",
        isDragging && "z-10 bg-[#1b1e2a] shadow-xl",
      )}
    >
      <button
        type="button"
        aria-label={`Drag ${EPK_SECTION_LABELS[id] ?? id}`}
        className="cursor-grab touch-none p-2 text-slate-500 hover:text-white active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" aria-hidden />
      </button>
      <button type="button" onClick={onSelect} className="flex min-w-0 flex-1 items-center gap-2 py-2 text-left text-sm text-white">
        <span className="truncate">{EPK_SECTION_LABELS[id] ?? id}</span>
        {styled ? <Sparkles className="h-3 w-3 shrink-0 text-purple-300" aria-label="Custom style" /> : null}
      </button>
      <button
        type="button"
        aria-label="Hide section"
        onClick={onHide}
        className="p-2 text-slate-500 opacity-0 transition-opacity hover:text-white group-hover:opacity-100 focus-visible:opacity-100"
      >
        <Eye className="h-4 w-4" aria-hidden />
      </button>
    </li>
  )
}

export function LayersPanel({
  visible,
  hidden,
  selected,
  styles,
  onSelect,
  onReorder,
  onSetVisible,
}: {
  visible: string[]
  hidden: string[]
  selected: string | null
  styles: EpkSectionStyles
  onSelect: (id: string) => void
  onReorder: (order: string[]) => void
  onSetVisible: (id: string, visible: boolean) => void
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return
    onReorder(arrayMove(visible, visible.indexOf(String(active.id)), visible.indexOf(String(over.id))))
  }

  return (
    <div className="flex flex-col gap-4 p-3">
      <div>
        <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">On page</p>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={visible} strategy={verticalListSortingStrategy}>
            <ul className="flex flex-col gap-0.5">
              {visible.map((id) => (
                <LayerRow
                  key={id}
                  id={id}
                  selected={selected === id}
                  styled={!isEpkSectionStyleEmpty(styles[id])}
                  onSelect={() => onSelect(id)}
                  onHide={() => onSetVisible(id, false)}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      </div>
      {hidden.length > 0 ? (
        <div>
          <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Add section</p>
          <ul className="flex flex-col gap-0.5">
            {hidden.map((id) => (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => onSetVisible(id, true)}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-slate-400 hover:bg-white/[0.05] hover:text-white"
                >
                  <Plus className="h-4 w-4" aria-hidden />
                  <span className="flex-1 truncate">{EPK_SECTION_LABELS[id] ?? id}</span>
                  <EyeOff className="h-3.5 w-3.5 opacity-50" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
