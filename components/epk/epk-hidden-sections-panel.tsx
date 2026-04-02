"use client"

import { Plus, ChevronDown, ChevronUp } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { EPK_SECTION_LABELS, EPK_DEFAULT_SECTION_ORDER } from "@/lib/epk/epk-preview-utils"
import type { EPKData } from "@/lib/services/epk.service"

interface EpkHiddenSectionsPanelProps {
  layout: EPKData["layout"]
  onRestoreSection: (sectionId: string) => void
}

export function EpkHiddenSectionsPanel({
  layout,
  onRestoreSection,
}: EpkHiddenSectionsPanelProps) {
  const [expanded, setExpanded] = useState(false)

  const hiddenSections = EPK_DEFAULT_SECTION_ORDER.filter(
    (id) => layout.sectionVisibility[id] === false
  )

  if (hiddenSections.length === 0) return null

  return (
    <div className="mx-auto mt-6 max-w-6xl px-4 sm:px-6 lg:px-8">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-gray-600/60 bg-gray-900/40 px-4 py-3 text-sm text-gray-400 transition-colors hover:border-purple-500/40 hover:text-gray-300"
      >
        <Plus className="h-4 w-4" />
        {hiddenSections.length} hidden section{hiddenSections.length > 1 ? "s" : ""}
        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {expanded && (
        <div className="mt-2 flex flex-wrap gap-2">
          {hiddenSections.map((id) => (
            <Button
              key={id}
              variant="outline"
              size="sm"
              className="rounded-xl border-gray-700/80 bg-gray-900/60 text-gray-300 hover:border-purple-500/50 hover:bg-purple-500/10 hover:text-white"
              onClick={() => onRestoreSection(id)}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              {EPK_SECTION_LABELS[id] || id}
            </Button>
          ))}
        </div>
      )}
    </div>
  )
}
