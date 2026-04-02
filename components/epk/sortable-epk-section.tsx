"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical, Eye, EyeOff, Pencil } from "lucide-react"
import { cn } from "@/lib/utils"
import { EPK_SECTION_LABELS } from "@/lib/epk/epk-preview-utils"

interface SortableEpkSectionProps {
  id: string
  children: React.ReactNode
  onToggleVisibility: (id: string) => void
  onEditSection?: (id: string) => void
}

export function SortableEpkSection({
  id,
  children,
  onToggleVisibility,
  onEditSection,
}: SortableEpkSectionProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isSorting,
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const label = EPK_SECTION_LABELS[id] || id

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group/section relative",
        isDragging && "z-50 opacity-80",
        isSorting && "transition-transform"
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute -inset-1 rounded-2xl border-2 border-transparent transition-colors duration-150",
          "group-hover/section:border-purple-500/40 group-hover/section:pointer-events-auto",
          isDragging && "border-purple-500/60 bg-purple-500/5"
        )}
      />

      <div
        className={cn(
          "absolute -top-3 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1 rounded-full border border-gray-700/80 bg-[#1a1d28]/95 px-2 py-0.5 opacity-0 shadow-lg backdrop-blur-sm transition-opacity duration-150",
          "group-hover/section:opacity-100",
          isDragging && "opacity-100"
        )}
      >
        <button
          type="button"
          className="flex h-6 w-6 cursor-grab items-center justify-center rounded text-gray-400 hover:text-white active:cursor-grabbing"
          aria-label={`Drag to reorder ${label}`}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>

        <span className="select-none text-[11px] font-medium text-gray-300">{label}</span>

        {onEditSection && (
          <button
            type="button"
            className="flex h-6 w-6 items-center justify-center rounded text-gray-400 hover:text-purple-300"
            aria-label={`Edit ${label}`}
            onClick={() => onEditSection(id)}
          >
            <Pencil className="h-3 w-3" />
          </button>
        )}

        <button
          type="button"
          className="flex h-6 w-6 items-center justify-center rounded text-gray-400 hover:text-red-400"
          aria-label={`Hide ${label}`}
          onClick={() => onToggleVisibility(id)}
        >
          <EyeOff className="h-3 w-3" />
        </button>
      </div>

      {children}
    </div>
  )
}

export function SortableEpkSectionOverlay({
  id,
  children,
}: {
  id: string
  children: React.ReactNode
}) {
  const label = EPK_SECTION_LABELS[id] || id
  return (
    <div className="pointer-events-none rounded-2xl border-2 border-purple-500/60 bg-purple-500/5 shadow-2xl">
      <div className="absolute -top-3 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1 rounded-full border border-purple-500/60 bg-[#1a1d28] px-2 py-0.5 shadow-lg">
        <GripVertical className="h-3.5 w-3.5 text-purple-400" />
        <span className="text-[11px] font-medium text-purple-300">{label}</span>
      </div>
      <div className="opacity-60">{children}</div>
    </div>
  )
}
