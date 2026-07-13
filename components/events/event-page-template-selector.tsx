"use client"

import { CheckCircle } from "lucide-react"
import {
  EVENT_PAGE_TEMPLATE_PREVIEWS,
  type EventPageSkinId,
} from "@/lib/events/event-skin-tokens"
import { cn } from "@/lib/utils"

interface EventPageTemplateSelectorProps {
  selectedTemplate: string
  onTemplateChange: (template: EventPageSkinId) => void
  className?: string
}

export function EventPageTemplateSelector({
  selectedTemplate,
  onTemplateChange,
  className,
}: EventPageTemplateSelectorProps) {
  const selected = (selectedTemplate || "modern") as string

  return (
    <div className={cn("space-y-3", className)}>
      <div>
        <h3 className="text-sm font-semibold text-white">Page style</h3>
        <p className="mt-1 text-xs text-slate-400">
          Choose a visual template for your public event page. Same family as EPK skins.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {EVENT_PAGE_TEMPLATE_PREVIEWS.map((template) => {
          const isSelected = selected === template.id
          return (
            <button
              key={template.id}
              type="button"
              onClick={() => onTemplateChange(template.id)}
              className={cn(
                "group relative overflow-hidden rounded-xl border p-3 text-left transition-all",
                isSelected
                  ? "border-purple-400/60 bg-purple-500/10 ring-2 ring-purple-400/30"
                  : "border-slate-700/80 bg-slate-950/60 hover:border-slate-500"
              )}
            >
              <div
                className={cn(
                  "mb-3 h-14 rounded-lg bg-gradient-to-r",
                  template.colors.join(" ")
                )}
              />
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={cn("h-2 w-2 rounded-full", template.accent)} />
                    <span className="text-sm font-medium text-white">{template.name}</span>
                  </div>
                  <p className="mt-1 text-xs leading-snug text-slate-400">{template.description}</p>
                </div>
                {isSelected ? (
                  <CheckCircle className="h-4 w-4 shrink-0 text-purple-300" />
                ) : null}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
