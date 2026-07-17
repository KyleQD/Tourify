"use client"

import React, { useState, useCallback, useRef, useEffect, useMemo } from "react"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable"
import { Button } from "@/components/ui/button"
import { Save, Share2, X, Loader2, Pencil } from "lucide-react"
import { cn } from "@/lib/utils"
import type { EPKData } from "@/lib/services/epk.service"
import { isSectionVisible, normalizeEpkLayout, EPK_SECTION_EDITOR_TAB } from "@/lib/epk/epk-preview-utils"
import {
  getDefaultEpkAppearance,
  getDefaultEpkAppearanceForTemplate,
  resolveEpkAppearanceForRender,
  type EpkAppearance,
} from "@/lib/epk/epk-appearance"
import { resolveEpkPreviewTemplateId } from "@/lib/epk/epk-skin-tokens"
import { epkFontClass } from "@/components/epk/epk-preview-fonts"
import {
  createEpkRenderCtx,
  renderEpkSection,
  EpkPageChrome,
  contentMaxWidth,
} from "@/components/epk/epk-template-variants"
import { SortableEpkSection, SortableEpkSectionOverlay } from "@/components/epk/sortable-epk-section"
import { EpkHiddenSectionsPanel } from "@/components/epk/epk-hidden-sections-panel"
import { EpkBuilderToolbar } from "@/components/epk/epk-builder-toolbar"
import { epkGlassPanel, epkIconButton, epkStatusPill } from "@/components/epk/epk-ui-styles"

interface StyleSnapshot {
  appearance: EpkAppearance
  template: string
  epkFont: EPKData["epkFont"]
}

interface EpkBuilderViewProps {
  epkData: EPKData
  updateEPKData: (partial: Partial<EPKData>) => void
  onSave: () => void | Promise<void>
  onShare: () => void
  onExitPreview: () => void
  onNavigateToTab: (tab: string) => void
  isSaving: boolean
  savedPublicUrl?: string | null
  hasSavedEpk?: boolean
  isDirty?: boolean
  isPublished?: boolean
}

const INLINE_EDITABLE_SECTIONS = new Set(["hero", "one-liner", "bio", "contact"])

function InlineEditableField({
  value,
  placeholder,
  multiline,
  className,
  onCommit,
}: {
  value: string
  placeholder: string
  multiline?: boolean
  className?: string
  onCommit: (newValue: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const ref = useRef<HTMLTextAreaElement | HTMLInputElement>(null)

  useEffect(() => { setDraft(value) }, [value])

  useEffect(() => {
    if (editing && ref.current) {
      ref.current.focus()
      if (ref.current instanceof HTMLInputElement) ref.current.select()
    }
  }, [editing])

  if (!editing) {
    return (
      <span
        role="button"
        tabIndex={0}
        className={cn("cursor-text rounded px-1 transition-colors hover:ring-1 hover:ring-purple-500/40", className)}
        onClick={() => setEditing(true)}
        onKeyDown={(e) => { if (e.key === "Enter") setEditing(true) }}
      >
        {value?.trim() || <span className="italic opacity-50">{placeholder}</span>}
      </span>
    )
  }

  const commit = () => {
    setEditing(false)
    if (draft !== value) onCommit(draft)
  }

  if (multiline) {
    return (
      <textarea
        ref={ref as React.RefObject<HTMLTextAreaElement>}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === "Escape") { setDraft(value); setEditing(false) } }}
        placeholder={placeholder}
        rows={4}
        className={cn("w-full resize-none rounded-lg border border-purple-500/40 bg-black/30 px-3 py-2 text-inherit outline-none backdrop-blur-sm", className)}
      />
    )
  }

  return (
    <input
      ref={ref as React.RefObject<HTMLInputElement>}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Escape") { setDraft(value); setEditing(false) }
        if (e.key === "Enter") commit()
      }}
      placeholder={placeholder}
      className={cn("w-full rounded-lg border border-purple-500/40 bg-black/30 px-3 py-1 text-inherit outline-none backdrop-blur-sm", className)}
    />
  )
}

function applyFieldUpdate(
  epkData: EPKData,
  fieldPath: string,
  value: string
): Partial<EPKData> {
  if (fieldPath.startsWith("contact.")) {
    const key = fieldPath.replace("contact.", "") as keyof EPKData["contact"]
    return { contact: { ...epkData.contact, [key]: value } }
  }
  if (fieldPath.startsWith("bookingAssets.")) {
    const key = fieldPath.replace("bookingAssets.", "") as keyof EPKData["bookingAssets"]
    return { bookingAssets: { ...epkData.bookingAssets, [key]: value } }
  }
  return { [fieldPath]: value }
}

function SectionEditOverlay({
  sectionId,
  onNavigateToTab,
}: {
  sectionId: string
  onNavigateToTab: (tab: string) => void
}) {
  const tab = EPK_SECTION_EDITOR_TAB[sectionId]
  if (!tab) return null
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center opacity-0 transition-opacity group-hover/section:opacity-100">
      <Button
        size="sm"
        className="rounded-xl border border-purple-500/40 bg-[#1a1d28]/90 text-purple-300 shadow-lg backdrop-blur-sm hover:bg-purple-500/20 hover:text-white"
        onClick={() => onNavigateToTab(tab)}
      >
        <Pencil className="mr-1.5 h-3.5 w-3.5" />
        Edit in {tab.charAt(0).toUpperCase() + tab.slice(1)} tab
      </Button>
    </div>
  )
}

export function EpkBuilderView({
  epkData,
  updateEPKData,
  onSave,
  onShare,
  onExitPreview,
  onNavigateToTab,
  isSaving,
  savedPublicUrl,
  hasSavedEpk = false,
  isDirty = false,
  isPublished = false,
}: EpkBuilderViewProps) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [hoveredTrack, setHoveredTrack] = useState<string | null>(null)
  const [canUndoStyle, setCanUndoStyle] = useState(false)
  const stylePastRef = useRef<StyleSnapshot[]>([])

  const layout = normalizeEpkLayout(epkData.layout)
  const skin = resolveEpkPreviewTemplateId(epkData.template)
  const fontClass = epkFontClass(epkData.epkFont ?? "sans")
  const appearance = epkData.epkAppearance ?? getDefaultEpkAppearance(epkData.template)
  const resolved = useMemo(
    () =>
      resolveEpkAppearanceForRender({
        skin,
        appearance,
      }),
    [skin, appearance]
  )

  const visibleSections = layout.sectionOrder.filter((id) =>
    isSectionVisible(id, layout)
  )
  const publicUrl = savedPublicUrl || (hasSavedEpk && epkData.epkSlug ? `/epk/${epkData.epkSlug}` : null)
  const urlLabel = publicUrl || "Save to create URL"
  const savedStateLabel = isSaving
    ? "Saving"
    : isDirty
      ? "Unsaved changes"
      : hasSavedEpk
        ? isPublished
          ? "Live"
          : "Draft saved"
        : "Not saved"
  const templateLabel = skin.charAt(0).toUpperCase() + skin.slice(1)
  const qualityScore = epkData.quality?.score ?? 0

  const editableField = useCallback(
    (field: string, value: string, placeholder: string, opts?: { multiline?: boolean; className?: string }) => (
      <InlineEditableField
        key={field}
        value={value}
        placeholder={placeholder}
        multiline={opts?.multiline}
        className={opts?.className}
        onCommit={(newValue) => updateEPKData(applyFieldUpdate(epkData, field, newValue))}
      />
    ),
    [epkData, updateEPKData]
  )

  const ctx = createEpkRenderCtx(
    { ...epkData, epkAppearance: appearance },
    skin,
    true,
    hoveredTrack,
    setHoveredTrack,
    editableField,
    resolved
  )

  const handleCommitStyle = useCallback(
    (patch: Partial<Pick<EPKData, "epkAppearance" | "epkFont" | "template">>) => {
      const nextPatch =
        patch.template && patch.template !== epkData.template && !patch.epkAppearance
          ? {
              ...patch,
              epkAppearance: getDefaultEpkAppearanceForTemplate(patch.template),
            }
          : patch
      const snap: StyleSnapshot = {
        appearance: epkData.epkAppearance ?? getDefaultEpkAppearance(epkData.template),
        template: epkData.template,
        epkFont: epkData.epkFont,
      }
      stylePastRef.current.push(snap)
      if (stylePastRef.current.length > 20) stylePastRef.current.shift()
      setCanUndoStyle(true)
      updateEPKData(nextPatch)
    },
    [epkData.epkAppearance, epkData.template, epkData.epkFont, updateEPKData]
  )

  const handleUndoStyle = useCallback(() => {
    const prev = stylePastRef.current.pop()
    setCanUndoStyle(stylePastRef.current.length > 0)
    if (!prev) return
    updateEPKData({
      epkAppearance: prev.appearance,
      template: prev.template,
      epkFont: prev.epkFont,
    })
  }, [updateEPKData])

  const handleResetStyle = useCallback(() => {
    handleCommitStyle({
      epkAppearance: getDefaultEpkAppearanceForTemplate(epkData.template),
      epkFont: "sans",
    })
  }, [epkData.template, handleCommitStyle])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  )

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(String(event.active.id))
  }, [])

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveId(null)
      const { active, over } = event
      if (!over || active.id === over.id) return

      const oldIndex = layout.sectionOrder.indexOf(String(active.id))
      const newIndex = layout.sectionOrder.indexOf(String(over.id))
      if (oldIndex === -1 || newIndex === -1) return

      const newOrder = arrayMove([...layout.sectionOrder], oldIndex, newIndex)
      updateEPKData({
        layout: { ...layout, sectionOrder: newOrder },
      })
    },
    [layout, updateEPKData]
  )

  const handleToggleVisibility = useCallback(
    (sectionId: string) => {
      updateEPKData({
        layout: {
          ...layout,
          sectionVisibility: {
            ...layout.sectionVisibility,
            [sectionId]: false,
          },
        },
      })
    },
    [layout, updateEPKData]
  )

  const handleRestoreSection = useCallback(
    (sectionId: string) => {
      const newOrder = layout.sectionOrder.includes(sectionId)
        ? layout.sectionOrder
        : [...layout.sectionOrder, sectionId]
      updateEPKData({
        layout: {
          ...layout,
          sectionOrder: newOrder,
          sectionVisibility: {
            ...layout.sectionVisibility,
            [sectionId]: true,
          },
        },
      })
    },
    [layout, updateEPKData]
  )

  const handleEditSection = useCallback(
    (sectionId: string) => {
      if (INLINE_EDITABLE_SECTIONS.has(sectionId)) return
      const tab = EPK_SECTION_EDITOR_TAB[sectionId]
      if (tab) onNavigateToTab(tab)
    },
    [onNavigateToTab]
  )

  return (
    <div className="min-h-screen bg-[#070a12] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_18%_0%,rgba(168,85,247,0.22),transparent_32%),radial-gradient(circle_at_82%_0%,rgba(34,211,238,0.16),transparent_30%)]" />
      <div className="sticky top-0 z-40 border-b border-white/10 bg-[#070a12]/86 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <h1 className="text-lg font-bold tracking-tight text-white sm:text-xl">
                  EPK Builder
                </h1>
                <p className="text-xs text-slate-400">Drag sections, tune the look, then publish the canonical link.</p>
              </div>
              <span className="rounded-full border border-purple-300/35 bg-purple-500/12 px-3 py-1 text-[11px] font-semibold text-purple-100 shadow-[0_0_22px_rgba(168,85,247,0.18)]">
                Drag to reorder
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={onSave}
                disabled={isSaving}
                className="rounded-2xl border border-purple-200/20 bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-500 px-4 text-white shadow-[0_0_28px_rgba(168,85,247,0.28)] hover:brightness-110"
                size="sm"
              >
                {isSaving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save
              </Button>
              <Button
                onClick={onShare}
                variant="outline"
                className={epkIconButton}
                size="sm"
              >
                <Share2 className="mr-2 h-4 w-4" />
                Share
              </Button>
              <Button
                onClick={onExitPreview}
                variant="outline"
                className={epkIconButton}
                size="sm"
              >
                <X className="mr-2 h-4 w-4" />
                Editor
              </Button>
            </div>
          </div>
          <div className={cn(epkGlassPanel, "flex flex-wrap items-center gap-2 px-3 py-2")}>
            <span className={cn(
              epkStatusPill,
              isPublished
                ? "border-emerald-300/35 text-emerald-200"
                : isDirty
                  ? "border-amber-300/35 text-amber-200"
                  : "border-purple-300/35 text-purple-100"
            )}>
              {savedStateLabel}
            </span>
            <span className={epkStatusPill}>{hasSavedEpk ? "Canonical link" : "Private draft"}</span>
            <span className={cn(epkStatusPill, "max-w-full truncate font-mono")}>{urlLabel}</span>
            <span className={epkStatusPill}>{templateLabel}</span>
            <span className={epkStatusPill}>Quality {qualityScore}%</span>
          </div>
        </div>
        <EpkBuilderToolbar
          epkData={{ ...epkData, epkAppearance: appearance }}
          skin={skin}
          onCommitStyle={handleCommitStyle}
          onUndo={handleUndoStyle}
          canUndo={canUndoStyle}
          onReset={handleResetStyle}
        />
      </div>

      <div className="relative mx-auto max-w-[1600px] px-4 py-5 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/[0.035] p-2 shadow-2xl shadow-black/45 backdrop-blur-xl">
          <div
            className={cn(
              resolved.mergedTokens.page,
              fontClass,
              resolved.wrapperClassName,
              "relative rounded-[1.25rem]",
              (skin === "modern" ||
                skin === "cinema" ||
                skin === "luxe" ||
                skin === "poster" ||
                skin === "scrapbook" ||
                skin === "bandcard" ||
                skin === "dossier" ||
                skin === "pressgrid" ||
                skin === "redcolumn" ||
                skin === "checkerboard" ||
                skin === "editorial" ||
                skin === "whitespace" ||
                skin === "colorblock" ||
                skin === "sunburst") &&
                "overflow-hidden"
            )}
            style={{ ...resolved.rootStyle, ...resolved.styles.page }}
          >
            <EpkPageChrome skin={skin} color={resolved.color} styles={resolved.styles} />
            <div
              className={cn(
                "relative mx-auto px-4 pb-16 pt-10 sm:px-6 lg:px-8",
                contentMaxWidth(skin, resolved.contentMaxWidthClass)
              )}
            >
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={visibleSections}
                  strategy={verticalListSortingStrategy}
                >
                  {visibleSections.map((sectionId) => (
                    <SortableEpkSection
                      key={sectionId}
                      id={sectionId}
                      onToggleVisibility={handleToggleVisibility}
                      onEditSection={handleEditSection}
                    >
                      <div className="relative">
                        {!INLINE_EDITABLE_SECTIONS.has(sectionId) && (
                          <SectionEditOverlay
                            sectionId={sectionId}
                            onNavigateToTab={onNavigateToTab}
                          />
                        )}
                        {renderEpkSection(sectionId, ctx)}
                      </div>
                    </SortableEpkSection>
                  ))}
                </SortableContext>

                <DragOverlay dropAnimation={null}>
                  {activeId ? (
                    <SortableEpkSectionOverlay id={activeId}>
                      {renderEpkSection(activeId, ctx)}
                    </SortableEpkSectionOverlay>
                  ) : null}
                </DragOverlay>
              </DndContext>
            </div>
          </div>
        </div>

        <EpkHiddenSectionsPanel
          layout={layout}
          onRestoreSection={handleRestoreSection}
        />
      </div>
    </div>
  )
}
