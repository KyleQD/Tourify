"use client"

import * as React from "react"
import {
  ArrowDown,
  ArrowUp,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  RotateCcw,
  Save,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { EventPageTemplateSelector } from "@/components/events/event-page-template-selector"
import {
  EVENT_PAGE_SECTION_DESCRIPTIONS,
  EVENT_PAGE_SECTION_LABELS,
  getVisibleEventPageTabs,
  normalizeEventPageLayout,
  type EventPageLayout,
  type EventPageSectionId,
} from "@/lib/events/event-page-layout"
import {
  resolveEventPageSkinId,
  type EventPageSkinId,
} from "@/lib/events/event-skin-tokens"
import { EventSkinProvider, useEventSkin } from "@/components/events/public/event-skin-context"
import { artistEventUI } from "@/components/events/artist-event-ui"
import { cn } from "@/lib/utils"

export interface EventPageDesignPreviewData {
  title: string
  type?: string | null
  status?: string | null
  description?: string | null
  posterUrl?: string | null
  eventDate?: string | null
  startTime?: string | null
  venueName?: string | null
  city?: string | null
  state?: string | null
  ticketUrl?: string | null
  capacity?: string | number | null
}

interface EventPageDesignPanelProps {
  selectedTemplate: string
  layout: EventPageLayout
  previewData: EventPageDesignPreviewData
  onTemplateChange: (template: EventPageSkinId) => void
  onLayoutChange: (layout: EventPageLayout) => void
  onSave?: () => void
  isSaving?: boolean
  publicPath?: string | null
  onCopyPublicLink?: () => void
  onOpenPublicPage?: () => void
}

function moveSection(
  layout: EventPageLayout,
  sectionId: EventPageSectionId,
  direction: -1 | 1,
) {
  const current = normalizeEventPageLayout(layout)
  const index = current.section_order.indexOf(sectionId)
  const nextIndex = index + direction
  if (index < 0 || nextIndex < 0 || nextIndex >= current.section_order.length) return current
  const nextOrder = [...current.section_order]
  const [item] = nextOrder.splice(index, 1)
  nextOrder.splice(nextIndex, 0, item)
  return { ...current, section_order: nextOrder }
}

function toggleSection(layout: EventPageLayout, sectionId: EventPageSectionId) {
  const current = normalizeEventPageLayout(layout)
  const isVisible = current.section_visibility[sectionId] !== false
  const visibleTabs = getVisibleEventPageTabs(current)
  if (sectionId !== "hero" && isVisible && visibleTabs.length === 1 && visibleTabs[0] === sectionId) {
    return current
  }
  return {
    ...current,
    section_visibility: {
      ...current.section_visibility,
      [sectionId]: !isVisible,
    },
  }
}

function EventPageMiniPreview({
  template,
  layout,
  data,
}: {
  template: string
  layout: EventPageLayout
  data: EventPageDesignPreviewData
}) {
  return (
    <EventSkinProvider template={template}>
      <EventPageMiniPreviewInner layout={layout} data={data} />
    </EventSkinProvider>
  )
}

function EventPageMiniPreviewInner({
  layout,
  data,
}: {
  layout: EventPageLayout
  data: EventPageDesignPreviewData
}) {
  const { tokens } = useEventSkin()
  const normalized = normalizeEventPageLayout(layout)
  const visibleTabs = getVisibleEventPageTabs(normalized)
  const dateLabel = data.eventDate || "Date TBD"
  const venueLabel = [data.venueName, data.city, data.state].filter(Boolean).join(" · ") || "Venue TBD"

  return (
    <div className={cn(tokens.page, "min-h-0 rounded-2xl border border-white/10 p-4")}>
      {normalized.section_visibility.hero ? (
        <div className={cn(tokens.heroFrame, "mb-4")}>
          <div
            className={cn("relative min-h-[230px] overflow-hidden", data.posterUrl ? "bg-cover bg-center" : tokens.heroFallback)}
            style={data.posterUrl ? { backgroundImage: `url(${data.posterUrl})` } : undefined}
          >
            <div className={tokens.heroScrim} />
            <div className="absolute inset-x-0 bottom-0 p-5">
              <div className="mb-2 flex flex-wrap gap-2">
                <span className={cn(tokens.badge, "px-2.5 py-1 text-xs")}>{data.type || "concert"}</span>
                <span className={cn(tokens.badge, "px-2.5 py-1 text-xs")}>{data.status || "draft"}</span>
              </div>
              <h3 className={cn("text-2xl font-bold", tokens.title)}>{data.title || "Untitled event"}</h3>
              <p className="mt-2 text-sm text-white/80">{dateLabel}</p>
              <p className="text-sm text-white/70">{venueLabel}</p>
            </div>
          </div>
        </div>
      ) : null}

      <div className={cn(tokens.stickyTabs, "mb-4 p-1")}>
        <div
          className="grid gap-1"
          style={{ gridTemplateColumns: `repeat(${visibleTabs.length}, minmax(0, 1fr))` }}
        >
          {visibleTabs.map((sectionId, index) => (
            <div
              key={sectionId}
              className={cn(
                "truncate rounded-xl px-2 py-2 text-center text-xs capitalize",
                index === 0 ? tokens.tabActive.replaceAll("data-[state=active]:", "") : "text-current/60",
              )}
            >
              {EVENT_PAGE_SECTION_LABELS[sectionId]}
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {visibleTabs.map((sectionId) => (
          <div key={sectionId} className={cn(tokens.card, "p-4")}>
            <p className={cn("text-sm font-semibold", tokens.heading)}>{EVENT_PAGE_SECTION_LABELS[sectionId]}</p>
            <p className={cn("mt-1 text-xs", tokens.muted)}>{EVENT_PAGE_SECTION_DESCRIPTIONS[sectionId]}</p>
            {sectionId === "overview" && data.description ? (
              <p className={cn("mt-3 max-h-16 overflow-hidden text-sm", tokens.body)}>{data.description}</p>
            ) : null}
            {sectionId === "details" ? (
              <p className={cn("mt-3 text-xs", tokens.muted)}>
                {data.ticketUrl ? "Ticket link ready" : "No ticket link"}{data.capacity ? ` · ${data.capacity} capacity` : ""}
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  )
}

export function EventPageDesignPanel({
  selectedTemplate,
  layout,
  previewData,
  onTemplateChange,
  onLayoutChange,
  onSave,
  isSaving,
  publicPath,
  onCopyPublicLink,
  onOpenPublicPage,
}: EventPageDesignPanelProps) {
  const normalizedLayout = normalizeEventPageLayout(layout)
  const [previewTemplate, setPreviewTemplate] = React.useState<EventPageSkinId | null>(null)
  const activeTemplate = resolveEventPageSkinId(selectedTemplate)

  const resetLayout = () => onLayoutChange(normalizeEventPageLayout(null))

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6">
          <EventPageTemplateSelector
            selectedTemplate={activeTemplate}
            onTemplateChange={onTemplateChange}
            onPreviewTemplate={setPreviewTemplate}
            disabled={isSaving}
          />

          <div className={cn(artistEventUI.panelPadded, "shadow-none")}>
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-white">Public sections</h3>
                <p className="mt-1 text-xs text-slate-400">
                  Choose what appears on the public event page and the order fans scan it in.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={artistEventUI.buttonOutline}
                onClick={resetLayout}
                disabled={isSaving}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Reset
              </Button>
            </div>

            <div className="space-y-2">
              {normalizedLayout.section_order.map((sectionId, index) => {
                const visible = normalizedLayout.section_visibility[sectionId] !== false
                return (
                  <div
                    key={sectionId}
                    className={cn(
                      "flex items-center gap-3 rounded-lg border p-3",
                      visible
                        ? "border-cyan-400/25 bg-slate-900/70"
                        : "border-slate-800 bg-slate-950/60 opacity-70",
                    )}
                  >
                    <button
                      type="button"
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border",
                        visible
                          ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-200"
                          : "border-slate-700 bg-slate-900 text-slate-500",
                      )}
                      onClick={() => onLayoutChange(toggleSection(normalizedLayout, sectionId))}
                      disabled={isSaving}
                      aria-label={visible ? `Hide ${EVENT_PAGE_SECTION_LABELS[sectionId]}` : `Show ${EVENT_PAGE_SECTION_LABELS[sectionId]}`}
                    >
                      {visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-white">{EVENT_PAGE_SECTION_LABELS[sectionId]}</p>
                      <p className="text-xs text-slate-400">{EVENT_PAGE_SECTION_DESCRIPTIONS[sectionId]}</p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-slate-400 hover:bg-white/10 hover:text-white"
                        onClick={() => onLayoutChange(moveSection(normalizedLayout, sectionId, -1))}
                        disabled={isSaving || index === 0}
                        aria-label={`Move ${EVENT_PAGE_SECTION_LABELS[sectionId]} up`}
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-slate-400 hover:bg-white/10 hover:text-white"
                        onClick={() => onLayoutChange(moveSection(normalizedLayout, sectionId, 1))}
                        disabled={isSaving || index === normalizedLayout.section_order.length - 1}
                        aria-label={`Move ${EVENT_PAGE_SECTION_LABELS[sectionId]} down`}
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className={cn(artistEventUI.panelPadded, "shadow-none")}>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-white">Live preview</h3>
                <p className="text-xs text-slate-400">Uses the selected public style.</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={artistEventUI.buttonOutline}
                onClick={() => setPreviewTemplate(activeTemplate)}
              >
                <Eye className="mr-2 h-4 w-4" />
                Expand
              </Button>
            </div>
            <EventPageMiniPreview
              template={activeTemplate}
              layout={normalizedLayout}
              data={previewData}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {onSave ? (
              <Button type="button" onClick={onSave} disabled={isSaving} className={artistEventUI.buttonAccent}>
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? "Saving..." : "Save design"}
              </Button>
            ) : null}
            {publicPath && onCopyPublicLink ? (
              <Button type="button" variant="outline" className={artistEventUI.buttonOutline} onClick={onCopyPublicLink}>
                <Copy className="mr-2 h-4 w-4" />
                Copy link
              </Button>
            ) : null}
            {publicPath && onOpenPublicPage ? (
              <Button type="button" variant="outline" className={artistEventUI.buttonOutline} onClick={onOpenPublicPage}>
                <ExternalLink className="mr-2 h-4 w-4" />
                Public page
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <Dialog open={Boolean(previewTemplate)} onOpenChange={(open) => !open && setPreviewTemplate(null)}>
        <DialogContent className={cn(artistEventUI.dialog, "max-h-[92vh] max-w-5xl overflow-y-auto p-0")}>
          <DialogHeader className="border-b border-slate-800 px-5 py-4">
            <DialogTitle>Template preview</DialogTitle>
          </DialogHeader>
          <div className="p-5">
            <EventPageMiniPreview
              template={previewTemplate || activeTemplate}
              layout={normalizedLayout}
              data={previewData}
            />
            {previewTemplate && previewTemplate !== activeTemplate ? (
              <div className="mt-4 flex justify-end">
                <Button
                  type="button"
                  className={artistEventUI.buttonAccent}
                  onClick={() => {
                    onTemplateChange(previewTemplate)
                    setPreviewTemplate(null)
                  }}
                >
                  Apply template
                </Button>
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
