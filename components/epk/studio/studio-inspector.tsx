"use client"

import React, { useState } from "react"
import { ArrowDown, ArrowUp, Copy, EyeOff, RotateCcw, X } from "lucide-react"
import { cn } from "@/lib/utils"
import type { EPKData } from "@/lib/services/epk.service"
import { EPK_SECTION_LABELS, EPK_FONT_IDS, EPK_FONT_LABELS } from "@/lib/epk/epk-preview-utils"
import {
  EPK_MOOD_PALETTES,
  EPK_PALETTE_PRESETS,
  EPK_STYLE_RECIPES,
  type EpkAppearance,
  type EpkPalettePreset,
} from "@/lib/epk/epk-appearance"
import type { EpkSkinId } from "@/lib/epk/epk-skin-tokens"
import {
  EPK_SECTION_BACKDROPS,
  EPK_SECTION_MOTIONS,
  EPK_SECTION_SPACINGS,
  type EpkSectionStyle,
} from "@/lib/epk/epk-section-styles"
import { epkFontClass } from "@/components/epk/epk-preview-fonts"
import { SectionContentEditor } from "@/components/epk/studio/studio-content-editors"
import {
  ColorField,
  PanelSection,
  Segmented,
  STUDIO_SKINS,
  skinName,
} from "@/components/epk/studio/studio-ui"

type StylePatch = Partial<Pick<EPKData, "epkAppearance" | "epkFont" | "template">>

function paletteToPatch(p: EpkPalettePreset): Partial<EpkAppearance> {
  return {
    accentHex: p.accentHex,
    secondaryAccentHex: p.secondaryAccentHex,
    pageBackgroundHex: p.pageBackgroundHex,
    textColorCustomHex: p.textColorCustomHex,
    cardBackgroundHex: p.cardBackgroundHex,
    borderColorHex: p.borderColorHex,
  }
}

function PaletteGrid({
  palettes,
  activeAccent,
  onPick,
}: {
  palettes: EpkPalettePreset[]
  activeAccent: string | null
  onPick: (p: EpkPalettePreset) => void
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {palettes.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => onPick(p)}
          className={cn(
            "flex flex-col gap-1.5 rounded-lg border p-2 text-left transition-colors",
            activeAccent?.toLowerCase() === p.accentHex.toLowerCase()
              ? "border-purple-400 bg-purple-500/10"
              : "border-white/[0.08] hover:border-white/25",
          )}
        >
          <span className="flex h-5 overflow-hidden rounded">
            {[p.pageBackgroundHex, p.cardBackgroundHex, p.accentHex, p.secondaryAccentHex, p.textColorCustomHex]
              .filter(Boolean)
              .map((hex, i) => (
                <span key={i} className="flex-1" style={{ background: hex ?? undefined }} />
              ))}
          </span>
          <span className="truncate text-[11px] text-slate-300">{p.name}</span>
        </button>
      ))}
    </div>
  )
}

/* ---------- Page (nothing selected) ---------- */

export function PageInspector({
  data,
  skin,
  appearance,
  onStyle,
}: {
  data: EPKData
  skin: EpkSkinId
  appearance: EpkAppearance
  onStyle: (patch: StylePatch) => void
}) {
  const [tab, setTab] = useState<"style" | "type" | "motion">("style")
  const setA = (patch: Partial<EpkAppearance>) => onStyle({ epkAppearance: { ...appearance, ...patch } })

  return (
    <>
      <div className="flex gap-1 border-b border-white/[0.06] p-2">
        {(["style", "type", "motion"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "flex-1 rounded-md py-1.5 text-xs font-medium capitalize transition-colors",
              tab === t ? "bg-white/10 text-white" : "text-slate-400 hover:text-white",
            )}
          >
            {t === "style" ? "Color" : t}
          </button>
        ))}
      </div>

      {tab === "style" ? (
        <>
          <PanelSection title={`${skinName(skin)} palettes`}>
            <PaletteGrid
              palettes={EPK_PALETTE_PRESETS[skin] ?? []}
              activeAccent={appearance.accentHex}
              onPick={(p) => setA(paletteToPatch(p))}
            />
          </PanelSection>
          <PanelSection title="Moods">
            <PaletteGrid palettes={EPK_MOOD_PALETTES} activeAccent={appearance.accentHex} onPick={(p) => setA(paletteToPatch(p))} />
          </PanelSection>
          <PanelSection title="Custom colors">
            <ColorField label="Accent" value={appearance.accentHex} onChange={(v) => setA({ accentHex: v })} />
            <ColorField label="Second accent" value={appearance.secondaryAccentHex} onChange={(v) => setA({ secondaryAccentHex: v })} />
            <ColorField label="Background" value={appearance.pageBackgroundHex} onChange={(v) => setA({ pageBackgroundHex: v })} />
            <ColorField label="Cards" value={appearance.cardBackgroundHex} onChange={(v) => setA({ cardBackgroundHex: v })} />
            <ColorField label="Text" value={appearance.textColorCustomHex} onChange={(v) => setA({ textColorCustomHex: v })} />
            <ColorField label="Borders" value={appearance.borderColorHex} onChange={(v) => setA({ borderColorHex: v })} />
          </PanelSection>
          <PanelSection title="Surfaces">
            <Segmented label="Corners" value={appearance.cardRadius} options={["sharp", "rounded", "pill"] as const} onChange={(v) => setA({ cardRadius: v })} />
            <Segmented label="Buttons" value={appearance.buttonStyle} options={["solid", "glass", "outline", "neon", "minimal"] as const} onChange={(v) => setA({ buttonStyle: v })} />
            <Segmented label="Effect" value={appearance.effectStyle} options={["none", "glow", "glass", "shadow", "grain", "spotlight"] as const} onChange={(v) => setA({ effectStyle: v })} />
            <Segmented label="Hero photo" value={appearance.heroImageTreatment} options={["natural", "cinematic", "duotone", "soft", "posterized"] as const} onChange={(v) => setA({ heroImageTreatment: v })} />
            <Segmented label="Dividers" value={appearance.sectionDividerStyle} options={["none", "line", "accent", "glow", "ticker"] as const} onChange={(v) => setA({ sectionDividerStyle: v })} />
          </PanelSection>
        </>
      ) : null}

      {tab === "type" ? (
        <>
          <PanelSection title="Typeface">
            <div className="grid grid-cols-2 gap-2">
              {EPK_FONT_IDS.map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => onStyle({ epkFont: id })}
                  className={cn(
                    "flex flex-col items-start gap-0.5 rounded-lg border px-3 py-2.5 text-left transition-colors",
                    (data.epkFont ?? "sans") === id
                      ? "border-purple-400 bg-purple-500/10"
                      : "border-white/[0.08] hover:border-white/25",
                  )}
                >
                  <span className={cn(epkFontClass(id), "text-xl leading-none text-white")}>Aa</span>
                  <span className="text-[11px] text-slate-400">{EPK_FONT_LABELS[id]}</span>
                </button>
              ))}
            </div>
          </PanelSection>
          <PanelSection title="Scale">
            <Segmented label="Headings" value={appearance.headingScale} options={["sm", "md", "lg", "xl"] as const} onChange={(v) => setA({ headingScale: v })} />
            <Segmented label="Body text" value={appearance.fontSizeScale} options={["xs", "sm", "md", "lg", "xl"] as const} onChange={(v) => setA({ fontSizeScale: v })} />
            <Segmented label="Text contrast" value={appearance.textColorPreset} options={[{ value: "inherit", label: "Template" }, { value: "high_contrast", label: "High" }, { value: "muted", label: "Muted" }] as const} onChange={(v) => setA({ textColorPreset: v })} />
          </PanelSection>
          <PanelSection title="Layout">
            <Segmented label="Width" value={appearance.contentWidth} options={["narrow", "default", "wide"] as const} onChange={(v) => setA({ contentWidth: v })} />
            <Segmented label="Section spacing" value={appearance.sectionSpacing} options={["compact", "default", "relaxed"] as const} onChange={(v) => setA({ sectionSpacing: v })} />
          </PanelSection>
        </>
      ) : null}

      {tab === "motion" ? (
        <>
          <PanelSection title="Looks">
            <div className="flex flex-col gap-2">
              {EPK_STYLE_RECIPES.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setA(r.patch)}
                  className="rounded-lg border border-white/[0.08] px-3 py-2.5 text-left transition-colors hover:border-purple-400/60 hover:bg-purple-500/[0.06]"
                >
                  <span className="block text-sm font-medium text-white">{r.name}</span>
                  <span className="block text-xs leading-relaxed text-slate-400">{r.description}</span>
                </button>
              ))}
            </div>
          </PanelSection>
          <PanelSection title="Entrance">
            <MotionPicker
              value={appearance.motionStyle}
              options={["none", "fade", "rise", "zoom", "blur"] as const}
              onChange={(v) => setA({ motionStyle: v })}
            />
            <Segmented label="Speed" value={appearance.motionSpeed} options={["slow", "normal", "fast"] as const} onChange={(v) => setA({ motionSpeed: v })} />
            <Segmented label="Ambient loops" value={appearance.ambientMotion} options={["off", "on"] as const} onChange={(v) => setA({ ambientMotion: v })} />
          </PanelSection>
        </>
      ) : null}
    </>
  )
}

function MotionPicker<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: readonly T[]
  onChange: (v: T) => void
}) {
  return (
    <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Entrance motion">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          role="radio"
          aria-checked={value === o}
          onClick={() => onChange(o)}
          className={cn(
            "group flex flex-col items-center gap-2 rounded-lg border px-2 py-3 transition-colors",
            value === o ? "border-purple-400 bg-purple-500/10" : "border-white/[0.08] hover:border-white/25",
          )}
        >
          <span
            className="h-5 w-8 rounded bg-purple-300/80"
            style={{ animation: o === "none" || o === "inherit" ? undefined : `epk-demo-${o} 1.6s ease-out infinite` }}
          />
          <span className="text-[11px] capitalize text-slate-300">{o === "inherit" ? "Page" : o}</span>
        </button>
      ))}
    </div>
  )
}

/* ---------- Element (section selected) ---------- */

export function ElementInspector({
  sectionId,
  data,
  skin,
  style,
  onStyle,
  onPatch,
  onClose,
  onHide,
  onMove,
  canMoveUp,
  canMoveDown,
  onApplyToAll,
}: {
  sectionId: string
  data: EPKData
  skin: EpkSkinId
  style: EpkSectionStyle
  onStyle: (style: EpkSectionStyle) => void
  onPatch: (partial: Partial<EPKData>) => void
  onClose: () => void
  onHide: () => void
  onMove: (dir: -1 | 1) => void
  canMoveUp: boolean
  canMoveDown: boolean
  onApplyToAll: () => void
}) {
  const [tab, setTab] = useState<"design" | "content">("design")
  const set = (patch: Partial<EpkSectionStyle>) => onStyle({ ...style, ...patch })
  const activeSkin = style.skin ?? skin

  return (
    <>
      <div className="flex items-center justify-between gap-2 border-b border-white/[0.06] px-4 py-3">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.14em] text-purple-300">Selected</p>
          <h2 className="truncate text-base font-semibold text-white">{EPK_SECTION_LABELS[sectionId] ?? sectionId}</h2>
        </div>
        <div className="flex items-center gap-1">
          <IconBtn label="Move up" disabled={!canMoveUp} onClick={() => onMove(-1)}><ArrowUp className="h-4 w-4" /></IconBtn>
          <IconBtn label="Move down" disabled={!canMoveDown} onClick={() => onMove(1)}><ArrowDown className="h-4 w-4" /></IconBtn>
          <IconBtn label="Hide section" onClick={onHide}><EyeOff className="h-4 w-4" /></IconBtn>
          <IconBtn label="Deselect" onClick={onClose}><X className="h-4 w-4" /></IconBtn>
        </div>
      </div>

      <div className="flex gap-1 border-b border-white/[0.06] p-2">
        {(["design", "content"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "flex-1 rounded-md py-1.5 text-xs font-medium capitalize transition-colors",
              tab === t ? "bg-white/10 text-white" : "text-slate-400 hover:text-white",
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "content" ? (
        <SectionContentEditor sectionId={sectionId} data={data} onPatch={onPatch} />
      ) : (
        <>
          <PanelSection
            title="Element design"
            action={
              style.skin ? (
                <button type="button" onClick={() => set({ skin: undefined })} className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white">
                  <RotateCcw className="h-3 w-3" aria-hidden /> Match page
                </button>
              ) : null
            }
          >
            <p className="text-xs leading-relaxed text-slate-500">
              Use this section&apos;s design from any template. Browse previews in the Elements tab.
            </p>
            <div className="grid grid-cols-3 gap-1.5">
              {STUDIO_SKINS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => set({ skin: s === skin ? undefined : s })}
                  className={cn(
                    "truncate rounded-md border px-2 py-1.5 text-[11px] transition-colors",
                    activeSkin === s
                      ? "border-purple-400 bg-purple-500/15 text-white"
                      : "border-white/[0.08] text-slate-400 hover:border-white/25 hover:text-white",
                  )}
                >
                  {skinName(s)}
                </button>
              ))}
            </div>
          </PanelSection>
          <PanelSection title="Color">
            <ColorField label="Section accent" value={style.accentHex ?? null} onChange={(v) => set({ accentHex: v ?? undefined })} />
            <Segmented label="Backdrop" value={style.backdrop ?? "none"} options={EPK_SECTION_BACKDROPS} onChange={(v) => set({ backdrop: v })} />
          </PanelSection>
          <PanelSection title="Spacing">
            <Segmented value={style.spacing ?? "default"} options={EPK_SECTION_SPACINGS} onChange={(v) => set({ spacing: v })} />
          </PanelSection>
          <PanelSection title="Entrance motion">
            <MotionPicker value={style.motion ?? "inherit"} options={EPK_SECTION_MOTIONS} onChange={(v) => set({ motion: v })} />
          </PanelSection>
          <div className="flex gap-2 p-4">
            <button
              type="button"
              onClick={onApplyToAll}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-white/10 py-2 text-xs text-slate-300 hover:bg-white/5"
            >
              <Copy className="h-3.5 w-3.5" aria-hidden /> Apply to all sections
            </button>
            <button
              type="button"
              onClick={() => onStyle({})}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-300 hover:bg-white/5"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden /> Reset
            </button>
          </div>
        </>
      )}
    </>
  )
}

function IconBtn({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent"
    >
      {children}
    </button>
  )
}
