"use client"

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  ArrowLeft,
  Blocks,
  Layers,
  LayoutTemplate,
  Loader2,
  PanelLeft,
  Palette,
  Redo2,
  Save,
  Share2,
  Undo2,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { EPKData } from "@/lib/services/epk.service"
import { EPK_SECTION_LABELS, isSectionVisible, normalizeEpkLayout } from "@/lib/epk/epk-preview-utils"
import {
  getDefaultEpkAppearance,
  getDefaultEpkAppearanceForTemplate,
  resolveEpkAppearanceForRender,
} from "@/lib/epk/epk-appearance"
import { resolveEpkPreviewTemplateId, type EpkSkinId } from "@/lib/epk/epk-skin-tokens"
import { isEpkSectionStyleEmpty, type EpkSectionStyle } from "@/lib/epk/epk-section-styles"
import { epkFontClass } from "@/components/epk/epk-preview-fonts"
import {
  EpkPageChrome,
  contentMaxWidth,
  createEpkRenderCtx,
  renderStyledEpkSection,
  resolveSectionMotion,
} from "@/components/epk/epk-template-variants"
import { EpkReveal } from "@/components/epk/epk-reveal"
import { LayersPanel } from "@/components/epk/studio/studio-layers"
import { ElementLibrary, TemplateLibrary } from "@/components/epk/studio/studio-library"
import { ElementInspector, PageInspector } from "@/components/epk/studio/studio-inspector"
import { skinName } from "@/components/epk/studio/studio-ui"

type DesignSnapshot = Pick<EPKData, "epkAppearance" | "template" | "epkFont" | "layout">
type LeftTab = "layers" | "templates" | "elements"

interface EpkBuilderViewProps {
  epkData: EPKData
  updateEPKData: (partial: Partial<EPKData>) => void
  onSave: () => void | Promise<void>
  onShare: () => void
  onExitPreview: () => void
  /** Kept for compatibility; all editing now happens inside the studio. */
  onNavigateToTab?: (tab: string) => void
  isSaving: boolean
  savedPublicUrl?: string | null
  hasSavedEpk?: boolean
  isDirty?: boolean
  isPublished?: boolean
}

const LEFT_TABS: { id: LeftTab; label: string; icon: typeof Layers }[] = [
  { id: "layers", label: "Layers", icon: Layers },
  { id: "templates", label: "Templates", icon: LayoutTemplate },
  { id: "elements", label: "Elements", icon: Blocks },
]

export function EpkBuilderView({
  epkData,
  updateEPKData,
  onSave,
  onShare,
  onExitPreview,
  isSaving,
  hasSavedEpk = false,
  isDirty = false,
  isPublished = false,
}: EpkBuilderViewProps) {
  const [selected, setSelected] = useState<string | null>(null)
  const [leftTab, setLeftTab] = useState<LeftTab>("layers")
  const [mobilePanel, setMobilePanel] = useState<"left" | "right" | null>(null)
  const [hoveredTrack, setHoveredTrack] = useState<string | null>(null)
  const pastRef = useRef<DesignSnapshot[]>([])
  const futureRef = useRef<DesignSnapshot[]>([])
  const [, forceHistory] = useState(0)
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const layout = normalizeEpkLayout(epkData.layout)
  const sectionStyles = layout.sectionStyles ?? {}
  const skin = resolveEpkPreviewTemplateId(epkData.template)
  const appearance = epkData.epkAppearance ?? getDefaultEpkAppearance(epkData.template)
  const resolved = useMemo(() => resolveEpkAppearanceForRender({ skin, appearance }), [skin, appearance])
  const data = useMemo(() => ({ ...epkData, epkAppearance: appearance }), [epkData, appearance])
  const ctx = createEpkRenderCtx(data, skin, true, hoveredTrack, setHoveredTrack, undefined, resolved)

  const visible = layout.sectionOrder.filter((id) => isSectionVisible(id, layout))
  const hidden = Object.keys(EPK_SECTION_LABELS).filter((id) => !visible.includes(id))

  /* ---------- history ---------- */
  const snapshot = useCallback(
    (): DesignSnapshot => ({
      epkAppearance: epkData.epkAppearance ?? getDefaultEpkAppearance(epkData.template),
      template: epkData.template,
      epkFont: epkData.epkFont,
      layout: normalizeEpkLayout(epkData.layout),
    }),
    [epkData.epkAppearance, epkData.template, epkData.epkFont, epkData.layout],
  )

  const commit = useCallback(
    (patch: Partial<EPKData>) => {
      pastRef.current.push(snapshot())
      if (pastRef.current.length > 40) pastRef.current.shift()
      futureRef.current = []
      forceHistory((n) => n + 1)
      updateEPKData(patch)
    },
    [snapshot, updateEPKData],
  )

  const undo = useCallback(() => {
    const prev = pastRef.current.pop()
    if (!prev) return
    futureRef.current.push(snapshot())
    forceHistory((n) => n + 1)
    updateEPKData(prev)
  }, [snapshot, updateEPKData])

  const redo = useCallback(() => {
    const next = futureRef.current.pop()
    if (!next) return
    pastRef.current.push(snapshot())
    forceHistory((n) => n + 1)
    updateEPKData(next)
  }, [snapshot, updateEPKData])

  /* ---------- design actions ---------- */
  const setStyle = useCallback(
    (patch: Partial<Pick<EPKData, "epkAppearance" | "epkFont" | "template">>) => {
      if (patch.template && patch.template !== epkData.template && !patch.epkAppearance) {
        commit({ ...patch, epkAppearance: getDefaultEpkAppearanceForTemplate(patch.template) })
      } else {
        commit(patch)
      }
    },
    [commit, epkData.template],
  )

  const setLayout = useCallback(
    (next: Partial<EPKData["layout"]>) => commit({ layout: { ...layout, ...next } }),
    [commit, layout],
  )

  const setSectionStyle = useCallback(
    (id: string, style: EpkSectionStyle) => {
      const next = { ...sectionStyles }
      if (isEpkSectionStyleEmpty(style)) delete next[id]
      else next[id] = style
      setLayout({ sectionStyles: next })
    },
    [sectionStyles, setLayout],
  )

  const setVisible = useCallback(
    (id: string, show: boolean) => {
      setLayout({
        sectionOrder: layout.sectionOrder.includes(id) ? layout.sectionOrder : [...layout.sectionOrder, id],
        sectionVisibility: { ...layout.sectionVisibility, [id]: show },
      })
      if (!show && selected === id) setSelected(null)
      if (show) setSelected(id)
    },
    [layout, selected, setLayout],
  )

  const reorderVisible = useCallback(
    (nextVisible: string[]) => {
      const hiddenIds = layout.sectionOrder.filter((id) => !nextVisible.includes(id))
      setLayout({ sectionOrder: [...nextVisible, ...hiddenIds] })
    },
    [layout.sectionOrder, setLayout],
  )

  const moveSelected = useCallback(
    (dir: -1 | 1) => {
      if (!selected) return
      const i = visible.indexOf(selected)
      const j = i + dir
      if (i < 0 || j < 0 || j >= visible.length) return
      const next = [...visible]
      ;[next[i], next[j]] = [next[j], next[i]]
      reorderVisible(next)
    },
    [reorderVisible, selected, visible],
  )

  const select = useCallback((id: string | null) => {
    setSelected(id)
    if (id) {
      setMobilePanel("right")
      requestAnimationFrame(() =>
        sectionRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "nearest" }),
      )
    }
  }, [])

  /* ---------- keyboard ---------- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const typing = target.closest("input, textarea, select, [contenteditable='true']")
      if (e.key === "Escape" && !typing) setSelected(null)
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z" && !typing) {
        e.preventDefault()
        if (e.shiftKey) redo()
        else undo()
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault()
        void onSave()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onSave, redo, undo])

  const statusLabel = isSaving
    ? "Saving…"
    : isDirty
      ? "Unsaved changes"
      : hasSavedEpk
        ? isPublished
          ? "Live"
          : "Draft saved"
        : "Not saved"

  const leftPanel = (
    <>
      <div role="tablist" aria-label="Studio panels" className="flex gap-1 border-b border-white/[0.06] p-2">
        {LEFT_TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            role="tab"
            type="button"
            aria-selected={leftTab === id}
            onClick={() => setLeftTab(id)}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-xs font-medium transition-colors",
              leftTab === id ? "bg-white/10 text-white" : "text-slate-400 hover:text-white",
            )}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden />
            {label}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {leftTab === "layers" ? (
          <LayersPanel
            visible={visible}
            hidden={hidden}
            selected={selected}
            styles={sectionStyles}
            onSelect={select}
            onReorder={reorderVisible}
            onSetVisible={setVisible}
          />
        ) : null}
        {leftTab === "templates" ? (
          <TemplateLibrary ctx={ctx} activeSkin={skin} onApply={(s) => setStyle({ template: s })} />
        ) : null}
        {leftTab === "elements" ? (
          <ElementLibrary
            ctx={ctx}
            pageSkin={skin}
            selectedSection={selected}
            currentSkinFor={(id) => sectionStyles[id]?.skin ?? skin}
            onUse={(id, s) => {
              const current = sectionStyles[id] ?? {}
              setSectionStyle(id, { ...current, skin: s === skin ? undefined : s })
              if (!isSectionVisible(id, layout)) setVisible(id, true)
              else select(id)
            }}
          />
        ) : null}
      </div>
    </>
  )

  const rightPanel = selected ? (
    <ElementInspector
      key={selected}
      sectionId={selected}
      data={data}
      skin={skin}
      style={sectionStyles[selected] ?? {}}
      onStyle={(style) => setSectionStyle(selected, style)}
      onPatch={updateEPKData}
      onClose={() => setSelected(null)}
      onHide={() => setVisible(selected, false)}
      onMove={moveSelected}
      canMoveUp={visible.indexOf(selected) > 0}
      canMoveDown={visible.indexOf(selected) < visible.length - 1}
      onApplyToAll={() => {
        const style = sectionStyles[selected] ?? {}
        const next = { ...sectionStyles }
        for (const id of visible) {
          if (isEpkSectionStyleEmpty(style)) delete next[id]
          else next[id] = { ...style }
        }
        setLayout({ sectionStyles: next })
      }}
    />
  ) : (
    <>
      <div className="border-b border-white/[0.06] px-4 py-3">
        <p className="text-[11px] uppercase tracking-[0.14em] text-slate-400">Page</p>
        <h2 className="text-base font-semibold text-white">{skinName(skin)} template</h2>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">Click any section on the canvas to edit it.</p>
      </div>
      <PageInspector data={data} skin={skin} appearance={appearance} onStyle={setStyle} />
    </>
  )

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-[#0a0c12] font-sans text-white">
      {/* Top bar */}
      <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-white/[0.07] bg-[#0d0f16] px-3">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            onClick={onExitPreview}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-slate-300 hover:bg-white/[0.06] hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            <span className="hidden sm:inline">Exit</span>
          </button>
          <span className="h-5 w-px bg-white/10" aria-hidden />
          <button
            type="button"
            aria-label="Open panels"
            onClick={() => setMobilePanel(mobilePanel === "left" ? null : "left")}
            className="rounded-lg p-2 text-slate-300 hover:bg-white/[0.06] lg:hidden"
          >
            <PanelLeft className="h-4 w-4" aria-hidden />
          </button>
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold">EPK Studio</h1>
            <p className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  isPublished && !isDirty ? "bg-emerald-400" : isDirty ? "bg-amber-400" : "bg-slate-500",
                )}
                aria-hidden
              />
              {statusLabel}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Undo"
            title="Undo (⌘Z)"
            onClick={undo}
            disabled={pastRef.current.length === 0}
            className="rounded-lg p-2 text-slate-300 hover:bg-white/[0.06] disabled:opacity-30"
          >
            <Undo2 className="h-4 w-4" aria-hidden />
          </button>
          <button
            type="button"
            aria-label="Redo"
            title="Redo (⇧⌘Z)"
            onClick={redo}
            disabled={futureRef.current.length === 0}
            className="rounded-lg p-2 text-slate-300 hover:bg-white/[0.06] disabled:opacity-30"
          >
            <Redo2 className="h-4 w-4" aria-hidden />
          </button>
          <button
            type="button"
            aria-label="Style panel"
            onClick={() => setMobilePanel(mobilePanel === "right" ? null : "right")}
            className="rounded-lg p-2 text-slate-300 hover:bg-white/[0.06] lg:hidden"
          >
            <Palette className="h-4 w-4" aria-hidden />
          </button>
          <span className="mx-1 h-5 w-px bg-white/10" aria-hidden />
          <button
            type="button"
            onClick={onShare}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-slate-300 hover:bg-white/[0.06] hover:text-white"
          >
            <Share2 className="h-4 w-4" aria-hidden />
            <span className="hidden sm:inline">Share</span>
          </button>
          <button
            type="button"
            onClick={() => void onSave()}
            disabled={isSaving}
            className="flex items-center gap-1.5 rounded-lg bg-purple-500 px-3.5 py-1.5 text-sm font-medium text-white hover:bg-purple-400 disabled:opacity-60"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Save className="h-4 w-4" aria-hidden />}
            Save
          </button>
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1">
        {/* Left rail */}
        <aside
          aria-label="Layers and libraries"
          className={cn(
            "flex w-72 shrink-0 flex-col border-r border-white/[0.07] bg-[#0d0f16]",
            "max-lg:absolute max-lg:inset-y-0 max-lg:left-0 max-lg:z-20 max-lg:shadow-2xl",
            mobilePanel === "left" ? "max-lg:flex" : "max-lg:hidden",
          )}
        >
          {leftPanel}
        </aside>

        {/* Canvas */}
        <main
          className="min-w-0 flex-1 overflow-y-auto bg-[radial-gradient(rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:18px_18px] p-3 sm:p-6"
          onClick={() => setSelected(null)}
        >
          <div className="mx-auto max-w-[1180px] overflow-hidden rounded-2xl shadow-2xl shadow-black/60 ring-1 ring-white/10">
            <div
              className={cn(
                resolved.mergedTokens.page,
                epkFontClass(epkData.epkFont ?? "sans"),
                resolved.wrapperClassName,
                "relative overflow-hidden",
              )}
              style={{ ...resolved.rootStyle, ...resolved.styles.page }}
            >
              <EpkPageChrome skin={skin} color={resolved.color} styles={resolved.styles} />
              <div className={cn("relative mx-auto px-4 pb-16 pt-10 sm:px-6 lg:px-8", contentMaxWidth(skin, resolved.contentMaxWidthClass))}>
                {visible.map((id, index) => {
                  const isSelected = selected === id
                  return (
                    <div
                      key={id}
                      ref={(el) => {
                        sectionRefs.current[id] = el
                      }}
                      role="button"
                      tabIndex={0}
                      aria-label={`Edit ${EPK_SECTION_LABELS[id] ?? id}`}
                      aria-pressed={isSelected}
                      onClickCapture={(e) => {
                        if ((e.target as HTMLElement).closest("a")) e.preventDefault()
                      }}
                      onClick={(e) => {
                        e.stopPropagation()
                        select(id)
                      }}
                      onKeyDown={(e) => {
                        if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
                          e.preventDefault()
                          select(id)
                        }
                      }}
                      className="group/section relative cursor-pointer rounded-xl outline-none"
                    >
                      <span
                        aria-hidden
                        className={cn(
                          "pointer-events-none absolute -inset-2 z-20 rounded-2xl border-2 transition-colors",
                          isSelected
                            ? "border-purple-400"
                            : "border-transparent group-hover/section:border-purple-400/40 group-focus-visible/section:border-purple-400/70",
                        )}
                      />
                      <span
                        className={cn(
                          "pointer-events-none absolute -top-2 left-2 z-30 -translate-y-full rounded-md bg-purple-500 px-2 py-0.5 font-sans text-[11px] font-medium text-white transition-opacity",
                          isSelected ? "opacity-100" : "opacity-0 group-hover/section:opacity-100",
                        )}
                      >
                        {EPK_SECTION_LABELS[id] ?? id}
                        {sectionStyles[id]?.skin ? ` · ${skinName(sectionStyles[id].skin as EpkSkinId)}` : ""}
                      </span>
                      <EpkReveal motion={resolveSectionMotion(ctx.motion, sectionStyles[id])} index={index}>
                        {renderStyledEpkSection(id, ctx, sectionStyles[id])}
                      </EpkReveal>
                    </div>
                  )
                })}
                {visible.length === 0 ? (
                  <p className="py-24 text-center font-sans text-sm opacity-60">
                    No sections on the page. Add one from Layers.
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </main>

        {/* Inspector */}
        <aside
          aria-label={selected ? "Element inspector" : "Page inspector"}
          className={cn(
            "flex w-80 shrink-0 flex-col overflow-y-auto border-l border-white/[0.07] bg-[#0d0f16]",
            "max-lg:absolute max-lg:inset-y-0 max-lg:right-0 max-lg:z-20 max-lg:shadow-2xl",
            mobilePanel === "right" ? "max-lg:flex" : "max-lg:hidden",
          )}
        >
          <button
            type="button"
            aria-label="Close panel"
            onClick={() => setMobilePanel(null)}
            className="absolute right-2 top-2 hidden rounded-md p-1 text-slate-400 max-lg:block"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
          {rightPanel}
        </aside>
      </div>
    </div>
  )
}
