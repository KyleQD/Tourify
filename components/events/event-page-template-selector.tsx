"use client"

import { CheckCircle, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  EVENT_PAGE_TEMPLATE_PREVIEWS,
  type EventPageSkinId,
} from "@/lib/events/event-skin-tokens"
import { artistEventUI } from "@/components/events/artist-event-ui"
import { cn } from "@/lib/utils"

interface EventPageTemplateSelectorProps {
  selectedTemplate: string
  onTemplateChange: (template: EventPageSkinId) => void
  onPreviewTemplate?: (template: EventPageSkinId) => void
  disabled?: boolean
  className?: string
}

export function EventPageTemplateSelector({
  selectedTemplate,
  onTemplateChange,
  onPreviewTemplate,
  disabled,
  className,
}: EventPageTemplateSelectorProps) {
  const selected = (selectedTemplate || "modern") as string

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white">Page style</h3>
          <p className="mt-1 text-xs text-slate-400">
            Choose a visual template for your public event page. Same family as EPK skins.
          </p>
        </div>
        <span className="w-fit rounded-full border border-purple-400/30 bg-purple-400/10 px-3 py-1 text-xs font-medium text-purple-100">
          {EVENT_PAGE_TEMPLATE_PREVIEWS.length} styles
        </span>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {EVENT_PAGE_TEMPLATE_PREVIEWS.map((template) => {
          const isSelected = selected === template.id
          return (
            <div
              key={template.id}
              role="button"
              tabIndex={disabled ? -1 : 0}
              onClick={() => !disabled && onTemplateChange(template.id)}
              onKeyDown={(event) => {
                if (disabled) return
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault()
                  onTemplateChange(template.id)
                }
              }}
              aria-disabled={disabled}
              aria-pressed={isSelected}
              className={cn(
                "group relative min-h-[154px] overflow-hidden rounded-xl border p-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/40",
                disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
                isSelected
                  ? "border-cyan-400/60 bg-cyan-500/10 shadow-lg shadow-cyan-950/25 ring-2 ring-cyan-400/25"
                  : "border-slate-700/80 bg-slate-950/60 hover:border-cyan-400/40 hover:bg-slate-900/70 hover:shadow-lg hover:shadow-cyan-950/15"
              )}
            >
              <div
                className={cn(
                  "mb-3 h-16 rounded-lg bg-gradient-to-r shadow-inner shadow-black/20",
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
                  {isSelected ? (
                    <span className="mt-3 inline-flex rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2.5 py-1 text-[11px] font-medium text-cyan-100">
                      Applied
                    </span>
                  ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {onPreviewTemplate ? (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className={cn(artistEventUI.buttonGhost, "h-8 w-8")}
                      disabled={disabled}
                      onClick={(event) => {
                        event.stopPropagation()
                        onPreviewTemplate(template.id)
                      }}
                      aria-label={`Preview ${template.name}`}
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                  ) : null}
                  {isSelected ? (
                    <CheckCircle className="h-4 w-4 text-cyan-300" />
                  ) : null}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
