"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { ColorPicker } from "@/components/ui/color-picker"
import type { EPKData } from "@/lib/services/epk.service"
import {
  EPK_COLOR_SWATCHES,
  EPK_PALETTE_PRESETS,
  type EpkAppearance,
} from "@/lib/epk/epk-appearance"
import type { EpkSkinId } from "@/lib/epk/epk-skin-tokens"
import {
  EPK_FONT_IDS,
  EPK_FONT_LABELS,
} from "@/lib/epk/epk-preview-utils"
import { EPK_FONT_CLASS_BY_ID } from "@/components/epk/epk-preview-fonts"
import {
  Type,
  LayoutGrid,
  UserCircle,
  Palette,
  ImageIcon,
  Layers,
  Undo2,
  RotateCcw,
  Columns3,
  Sparkles,
  WandSparkles,
} from "lucide-react"
import { EpkAppearanceAiPanel } from "@/components/epk/epk-appearance-ai-panel"
import type { EpkAppearanceAiPayload } from "@/lib/epk/epk-appearance-ai-prompt"
import { cn } from "@/lib/utils"
import {
  epkControlLabel,
  epkGlassDock,
  epkMiniButton,
  epkPopoverPanel,
  epkSelectTrigger,
  epkSegmentButton,
  epkSegmentButtonActive,
  epkSegmentedRow,
  epkToolButton,
  epkToolButtonActive,
} from "@/components/epk/epk-ui-styles"

export interface EpkBuilderToolbarProps {
  epkData: EPKData
  skin: EpkSkinId
  onCommitStyle: (patch: Partial<Pick<EPKData, "epkAppearance" | "epkFont" | "template">>) => void
  onUndo: () => void
  canUndo: boolean
  onReset: () => void
  appearancePrompt?: string
}

function patchAppearance(
  current: EpkAppearance,
  partial: Partial<EpkAppearance>
): EpkAppearance {
  return { ...current, ...partial }
}

function ColorSwatchRow({
  value,
  onPick,
}: {
  value: string | null
  onPick: (hex: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {EPK_COLOR_SWATCHES.map((hex) => (
        <button
          key={hex}
          type="button"
          title={hex}
          onClick={() => onPick(hex)}
          className={cn(
            "h-6 w-6 rounded-md border-2 transition-transform hover:scale-110",
            value === hex ? "border-white shadow" : "border-white/20"
          )}
          style={{ backgroundColor: hex }}
        />
      ))}
    </div>
  )
}

function HexWithNative({
  value,
  fallback,
  onChange,
  onClear,
}: {
  value: string | null
  fallback: string
  onChange: (hex: string | null) => void
  onClear?: () => void
}) {
  const display = value ?? fallback
  const [draft, setDraft] = React.useState(value ?? "")

  React.useEffect(() => {
    setDraft(value ?? "")
  }, [value])

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={display}
          onChange={(e) => onChange(e.target.value.toLowerCase())}
          className="h-9 w-10 cursor-pointer rounded border border-gray-600 bg-transparent p-0.5"
          aria-label="Pick color"
        />
        <Input
          className="flex-1 border-gray-600 bg-[#23263a] font-mono text-white"
          placeholder={fallback}
          value={draft}
          onChange={(e) => {
            const v = e.target.value.trim()
            setDraft(v)
            if (!v) {
              onChange(null)
              return
            }
            if (/^#[0-9A-Fa-f]{6}$/.test(v)) onChange(v.toLowerCase())
          }}
          onBlur={() => {
            if (draft && !/^#[0-9A-Fa-f]{6}$/.test(draft)) setDraft(value ?? "")
          }}
        />
      </div>
      {onClear ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full border-gray-600 text-xs"
          onClick={onClear}
        >
          Use template default
        </Button>
      ) : null}
    </div>
  )
}

export function EpkBuilderToolbar({
  epkData,
  skin,
  onCommitStyle,
  onUndo,
  canUndo,
  onReset,
  appearancePrompt = "",
}: EpkBuilderToolbarProps) {
  const a = epkData.epkAppearance
  const hasCoverControls = skin === "classic" || skin === "cinema"
  const presets = EPK_PALETTE_PRESETS[skin] ?? []

  const setA = (partial: Partial<EpkAppearance>) => {
    onCommitStyle({ epkAppearance: patchAppearance(a, partial) })
  }

  function handleAiApply(payload: EpkAppearanceAiPayload) {
    onCommitStyle({
      template: payload.template,
      epkFont: payload.epkFont,
      epkAppearance: payload.epkAppearance,
    })
  }

  const hasColorOverrides = Boolean(
    a.accentHex ||
      a.secondaryAccentHex ||
      a.pageBackgroundHex ||
      a.textColorCustomHex ||
      a.cardBackgroundHex ||
      a.borderColorHex
  )
  const hasCardOverrides =
    a.cardRadius !== "rounded" ||
    a.cardSurface !== "default" ||
    a.surfaceStyle !== "default" ||
    a.borderStrength !== "default" ||
    a.buttonStyle !== "solid" ||
    a.buttonRadius !== "rounded"
  const hasEffectOverrides =
    a.effectStyle !== "none" ||
    a.effectIntensity !== "subtle" ||
    a.backgroundStyle !== "template" ||
    a.heroImageTreatment !== "natural" ||
    a.sectionDividerStyle !== "line"

  const triggerClass = (active?: boolean) =>
    cn(epkToolButton, active && epkToolButtonActive, "gap-1.5")

  const panelClass = (width = "w-80") => cn(epkPopoverPanel, width)

  const segmentClass = (active: boolean) =>
    cn(epkSegmentButton, active && epkSegmentButtonActive)

  const paletteFields = (
    preset: (typeof presets)[number]
  ): Pick<
    EpkAppearance,
    | "accentHex"
    | "secondaryAccentHex"
    | "pageBackgroundHex"
    | "textColorCustomHex"
    | "cardBackgroundHex"
    | "borderColorHex"
  > => ({
    accentHex: preset.accentHex,
    secondaryAccentHex: preset.secondaryAccentHex,
    pageBackgroundHex: preset.pageBackgroundHex,
    textColorCustomHex: preset.textColorCustomHex,
    cardBackgroundHex: preset.cardBackgroundHex,
    borderColorHex: preset.borderColorHex,
  })

  return (
    <div className="border-t border-white/10 bg-[#090c14]/92 px-4 py-3 backdrop-blur-2xl sm:px-6 lg:px-8">
      <div className={cn(epkGlassDock, "mx-auto flex max-w-[1600px] flex-wrap items-center gap-2 p-2")}>
        <Popover>
          <PopoverTrigger asChild>
            <Button type="button" variant="ghost" size="sm" className={triggerClass()}>
              <Type className="h-3.5 w-3.5" />
              Type
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className={panelClass("w-80")}
            align="start"
          >
            <div className="space-y-3">
              <div>
                <Label className={epkControlLabel}>Font family</Label>
                <div className="mt-2 grid grid-cols-2 gap-1.5">
                  {EPK_FONT_IDS.map((id) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => onCommitStyle({ epkFont: id })}
                      className={cn(
                        "rounded-lg border px-2 py-2 text-left transition-colors",
                        epkData.epkFont === id
                          ? "border-indigo-400 bg-indigo-500/15"
                          : "border-gray-700 bg-[#23263a] hover:border-gray-500"
                      )}
                    >
                      <span
                        className={cn(
                          "block text-lg leading-none text-white",
                          EPK_FONT_CLASS_BY_ID[id]
                        )}
                      >
                        Aa
                      </span>
                      <span className="mt-1 block text-[10px] uppercase tracking-wide text-gray-400">
                        {EPK_FONT_LABELS[id]}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label className={epkControlLabel}>Body size</Label>
                <div className={cn(epkSegmentedRow, "mt-2 grid-cols-5")}>
                  {(["xs", "sm", "md", "lg", "xl"] as const).map((k) => (
                    <button
                      key={k}
                      type="button"
                      className={cn(segmentClass(a.fontSizeScale === k), "uppercase")}
                      onClick={() => setA({ fontSizeScale: k })}
                    >
                      {k}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label className={epkControlLabel}>Heading scale</Label>
                <div className={cn(epkSegmentedRow, "mt-2 grid-cols-4")}>
                  {(["sm", "md", "lg", "xl"] as const).map((k) => (
                    <button
                      key={k}
                      type="button"
                      className={cn(segmentClass(a.headingScale === k), "uppercase")}
                      onClick={() => setA({ headingScale: k })}
                    >
                      {k}
                    </button>
                  ))}
                </div>
                <p className="mt-1 text-[10px] text-gray-500">md keeps the template title size</p>
              </div>
              <div>
                <Label className={epkControlLabel}>Text preset</Label>
                <Select
                  value={a.textColorPreset}
                  onValueChange={(v) =>
                    setA({
                      textColorPreset: v as EpkAppearance["textColorPreset"],
                    })
                  }
                >
                  <SelectTrigger className={cn(epkSelectTrigger, "mt-2")}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inherit">Inherit template</SelectItem>
                    <SelectItem value="high_contrast">High contrast</SelectItem>
                    <SelectItem value="muted">Muted</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className={cn(epkControlLabel, "mb-2 block")}>Custom text color</Label>
                <ColorSwatchRow
                  value={a.textColorCustomHex}
                  onPick={(hex) => setA({ textColorCustomHex: hex })}
                />
                <div className="mt-2">
                  <ColorPicker
                    value={a.textColorCustomHex ?? "#e2e8f0"}
                    onChange={(c) => setA({ textColorCustomHex: c })}
                    label="Text"
                    showLabel={false}
                  />
                </div>
                <HexWithNative
                  value={a.textColorCustomHex}
                  fallback="#e2e8f0"
                  onChange={(hex) => setA({ textColorCustomHex: hex })}
                  onClear={() => setA({ textColorCustomHex: null })}
                />
              </div>
            </div>
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button type="button" variant="ghost" size="sm" className={triggerClass(hasColorOverrides)}>
              <Palette className="h-3.5 w-3.5" />
              Colors
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className={panelClass("w-[22rem]")}
            align="start"
          >
            <div className="space-y-4">
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <Label className={epkControlLabel}>Template palettes</Label>
                  <span className="text-[10px] text-slate-500">Manual safe</span>
                </div>
                <div className="grid gap-2">
                  {presets.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      className="group rounded-2xl border border-white/10 bg-black/20 p-2 text-left transition-all hover:border-purple-300/45 hover:bg-white/[0.07]"
                      onClick={() => setA(paletteFields(preset))}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-white">{preset.name}</span>
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-purple-200 opacity-0 transition-opacity group-hover:opacity-100">
                          Apply
                        </span>
                      </span>
                      <span className="mt-2 flex gap-1">
                        {[
                          ["accent", preset.accentHex],
                          ["secondary", preset.secondaryAccentHex],
                          ["page", preset.pageBackgroundHex],
                          ["text", preset.textColorCustomHex],
                          ["card", preset.cardBackgroundHex],
                          ["border", preset.borderColorHex],
                        ]
                          .filter((swatch): swatch is [string, string] => Boolean(swatch[1]))
                          .map(([role, hex]) => (
                            <span
                              key={`${preset.id}-${role}-${hex}`}
                              className="h-4 flex-1 rounded-full border border-white/15"
                              style={{ backgroundColor: hex }}
                            />
                          ))}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label className={cn(epkControlLabel, "mb-2 block")}>Accent (buttons / icons)</Label>
                <ColorSwatchRow
                  value={a.accentHex}
                  onPick={(hex) => setA({ accentHex: hex })}
                />
                <div className="mt-2">
                  <ColorPicker
                    value={a.accentHex ?? "#6366f1"}
                    onChange={(c) => setA({ accentHex: c })}
                    label="Accent"
                    showLabel={false}
                  />
                </div>
                <HexWithNative
                  value={a.accentHex}
                  fallback="#6366f1"
                  onChange={(hex) => setA({ accentHex: hex })}
                  onClear={() => setA({ accentHex: null })}
                />
              </div>
              <div className="border-t border-white/10 pt-3">
                <Label className={cn(epkControlLabel, "mb-2 block")}>Secondary accent</Label>
                <ColorSwatchRow
                  value={a.secondaryAccentHex}
                  onPick={(hex) => setA({ secondaryAccentHex: hex })}
                />
                <div className="mt-2">
                  <ColorPicker
                    value={a.secondaryAccentHex ?? "#06b6d4"}
                    onChange={(c) => setA({ secondaryAccentHex: c })}
                    label="Secondary"
                    showLabel={false}
                  />
                </div>
                <HexWithNative
                  value={a.secondaryAccentHex}
                  fallback="#06b6d4"
                  onChange={(hex) => setA({ secondaryAccentHex: hex })}
                  onClear={() => setA({ secondaryAccentHex: null })}
                />
              </div>
              <div className="border-t border-white/10 pt-3">
                <Label className={cn(epkControlLabel, "mb-2 block")}>Page background</Label>
                <ColorSwatchRow
                  value={a.pageBackgroundHex}
                  onPick={(hex) => setA({ pageBackgroundHex: hex })}
                />
                <div className="mt-2">
                  <ColorPicker
                    value={a.pageBackgroundHex ?? "#07080f"}
                    onChange={(c) => setA({ pageBackgroundHex: c })}
                    label="Page"
                    showLabel={false}
                  />
                </div>
                <HexWithNative
                  value={a.pageBackgroundHex}
                  fallback="#07080f"
                  onChange={(hex) => setA({ pageBackgroundHex: hex })}
                  onClear={() => setA({ pageBackgroundHex: null })}
                />
              </div>
              <div className="border-t border-white/10 pt-3">
                <Label className={cn(epkControlLabel, "mb-2 block")}>Card surface</Label>
                <HexWithNative
                  value={a.cardBackgroundHex}
                  fallback="#111827"
                  onChange={(hex) => setA({ cardBackgroundHex: hex })}
                  onClear={() => setA({ cardBackgroundHex: null })}
                />
              </div>
              <div className="border-t border-white/10 pt-3">
                <Label className={cn(epkControlLabel, "mb-2 block")}>Border color</Label>
                <HexWithNative
                  value={a.borderColorHex}
                  fallback="#4c1d95"
                  onChange={(hex) => setA({ borderColorHex: hex })}
                  onClear={() => setA({ borderColorHex: null })}
                />
              </div>
            </div>
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button type="button" variant="ghost" size="sm" className={triggerClass(hasCardOverrides)}>
              <LayoutGrid className="h-3.5 w-3.5" />
              Cards
            </Button>
          </PopoverTrigger>
          <PopoverContent className={panelClass("w-72")} align="start">
            <div className="space-y-3">
              <div>
                <Label className={epkControlLabel}>Card corners</Label>
                <div className={cn(epkSegmentedRow, "mt-2 grid-cols-3")}>
                  {(["sharp", "rounded", "pill"] as const).map((k) => (
                    <button
                      key={k}
                      type="button"
                      className={cn(segmentClass(a.cardRadius === k), "capitalize")}
                      onClick={() => setA({ cardRadius: k })}
                    >
                      {k}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label className={epkControlLabel}>Surface</Label>
                <Select
                  value={a.cardSurface}
                  onValueChange={(v) =>
                    setA({ cardSurface: v as EpkAppearance["cardSurface"] })
                  }
                >
                  <SelectTrigger className={cn(epkSelectTrigger, "mt-2")}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Default</SelectItem>
                    <SelectItem value="elevated">Elevated shadow</SelectItem>
                    <SelectItem value="minimal">Minimal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className={epkControlLabel}>Surface finish</Label>
                <Select
                  value={a.surfaceStyle}
                  onValueChange={(v) =>
                    setA({ surfaceStyle: v as EpkAppearance["surfaceStyle"] })
                  }
                >
                  <SelectTrigger className={cn(epkSelectTrigger, "mt-2")}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Template default</SelectItem>
                    <SelectItem value="glass">Glass</SelectItem>
                    <SelectItem value="solid">Solid</SelectItem>
                    <SelectItem value="editorial">Editorial shadow</SelectItem>
                    <SelectItem value="outlined">Outlined</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className={epkControlLabel}>Border strength</Label>
                <div className={cn(epkSegmentedRow, "mt-2 grid-cols-3")}>
                  {(["subtle", "default", "strong"] as const).map((k) => (
                    <button
                      key={k}
                      type="button"
                      className={cn(segmentClass(a.borderStrength === k), "capitalize")}
                      onClick={() => setA({ borderStrength: k })}
                    >
                      {k}
                    </button>
                  ))}
                </div>
              </div>
              <div className="border-t border-white/10 pt-3">
                <Label className={epkControlLabel}>Button style</Label>
                <Select
                  value={a.buttonStyle}
                  onValueChange={(v) =>
                    setA({ buttonStyle: v as EpkAppearance["buttonStyle"] })
                  }
                >
                  <SelectTrigger className={cn(epkSelectTrigger, "mt-2")}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="solid">Solid</SelectItem>
                    <SelectItem value="glass">Glass</SelectItem>
                    <SelectItem value="outline">Outline</SelectItem>
                    <SelectItem value="neon">Neon</SelectItem>
                    <SelectItem value="minimal">Minimal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className={epkControlLabel}>Button radius</Label>
                <div className={cn(epkSegmentedRow, "mt-2 grid-cols-3")}>
                  {(["sharp", "rounded", "pill"] as const).map((k) => (
                    <button
                      key={k}
                      type="button"
                      className={cn(segmentClass(a.buttonRadius === k), "capitalize")}
                      onClick={() => setA({ buttonRadius: k })}
                    >
                      {k}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button type="button" variant="ghost" size="sm" className={triggerClass()}>
              <Columns3 className="h-3.5 w-3.5" />
              Layout
            </Button>
          </PopoverTrigger>
          <PopoverContent className={panelClass("w-60")} align="start">
            <div className="space-y-3">
              <div>
                <Label className={epkControlLabel}>Content width</Label>
                <div className="mt-2 flex flex-col gap-1">
                  {(
                    [
                      ["narrow", "Narrow"],
                      ["default", "Default"],
                      ["wide", "Wide"],
                    ] as const
                  ).map(([k, label]) => (
                    <Button
                      key={k}
                      type="button"
                      size="sm"
                      variant="ghost"
                      className={segmentClass(a.contentWidth === k)}
                      onClick={() => setA({ contentWidth: k })}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              </div>
              <div>
                <Label className={epkControlLabel}>Section spacing</Label>
                <div className="mt-2 flex flex-col gap-1">
                  {(
                    [
                      ["compact", "Compact"],
                      ["default", "Default"],
                      ["relaxed", "Relaxed"],
                    ] as const
                  ).map(([k, label]) => (
                    <Button
                      key={k}
                      type="button"
                      size="sm"
                      variant="ghost"
                      className={segmentClass(a.sectionSpacing === k)}
                      onClick={() => setA({ sectionSpacing: k })}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button type="button" variant="ghost" size="sm" className={triggerClass()}>
              <UserCircle className="h-3.5 w-3.5" />
              Photo
            </Button>
          </PopoverTrigger>
          <PopoverContent className={panelClass("w-64")} align="start">
            <div className="space-y-3">
              <div>
                <Label className={epkControlLabel}>Shape</Label>
                <div className={cn(epkSegmentedRow, "mt-2 grid-cols-3")}>
                  {(["circle", "rounded", "square"] as const).map((k) => (
                    <button
                      key={k}
                      type="button"
                      className={cn(segmentClass(a.avatarShape === k), "capitalize")}
                      onClick={() => setA({ avatarShape: k })}
                    >
                      {k}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label className={epkControlLabel}>Size</Label>
                <div className={cn(epkSegmentedRow, "mt-2 grid-cols-2")}>
                  {(["sm", "md", "lg", "xl"] as const).map((k) => (
                    <button
                      key={k}
                      type="button"
                      className={cn(segmentClass(a.avatarSize === k), "uppercase")}
                      onClick={() => setA({ avatarSize: k })}
                    >
                      {k}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={cn(triggerClass(), !hasCoverControls && "opacity-50")}
              disabled={!hasCoverControls}
            >
              <ImageIcon className="h-3.5 w-3.5" />
              Cover
            </Button>
          </PopoverTrigger>
          <PopoverContent className={panelClass("w-64")} align="start">
            {!hasCoverControls ? (
              <p className="text-xs text-gray-400">
                Cover options apply to Classic and Cinema templates.
              </p>
            ) : (
              <div className="space-y-3">
                <div>
                  <Label className={epkControlLabel}>Height</Label>
                  <div className={cn(epkSegmentedRow, "mt-2 grid-cols-3")}>
                    {(["short", "medium", "tall"] as const).map((k) => (
                      <button
                        key={k}
                        type="button"
                        className={cn(segmentClass(a.coverHeight === k), "capitalize")}
                        onClick={() => setA({ coverHeight: k })}
                      >
                        {k}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className={epkControlLabel}>Overlay</Label>
                  <div className={cn(epkSegmentedRow, "mt-2 grid-cols-3")}>
                    {(["light", "medium", "heavy"] as const).map((k) => (
                      <button
                        key={k}
                        type="button"
                        className={cn(segmentClass(a.coverOverlay === k), "capitalize")}
                        onClick={() => setA({ coverOverlay: k })}
                      >
                        {k}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button type="button" variant="ghost" size="sm" className={triggerClass(hasEffectOverrides)}>
              <Sparkles className="h-3.5 w-3.5" />
              Effects
            </Button>
          </PopoverTrigger>
          <PopoverContent className={panelClass("w-72")} align="start">
            <div className="space-y-3">
              <div>
                <Label className={epkControlLabel}>Effect style</Label>
                <Select
                  value={a.effectStyle}
                  onValueChange={(v) =>
                    setA({ effectStyle: v as EpkAppearance["effectStyle"] })
                  }
                >
                  <SelectTrigger className={cn(epkSelectTrigger, "mt-2")}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="glow">Subtle glow</SelectItem>
                    <SelectItem value="glass">Glass</SelectItem>
                    <SelectItem value="shadow">Editorial shadow</SelectItem>
                    <SelectItem value="neon">Neon</SelectItem>
                    <SelectItem value="grain">Grain / noise</SelectItem>
                    <SelectItem value="spotlight">Spotlight</SelectItem>
                    <SelectItem value="poster">Poster texture</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className={epkControlLabel}>Intensity</Label>
                <div className={cn(epkSegmentedRow, "mt-2 grid-cols-3")}>
                  {(["subtle", "medium", "high"] as const).map((k) => (
                    <button
                      key={k}
                      type="button"
                      className={cn(segmentClass(a.effectIntensity === k), "capitalize")}
                      onClick={() => setA({ effectIntensity: k })}
                    >
                      {k}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label className={epkControlLabel}>Background mood</Label>
                <Select
                  value={a.backgroundStyle}
                  onValueChange={(v) =>
                    setA({ backgroundStyle: v as EpkAppearance["backgroundStyle"] })
                  }
                >
                  <SelectTrigger className={cn(epkSelectTrigger, "mt-2")}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="template">Template default</SelectItem>
                    <SelectItem value="solid">Solid</SelectItem>
                    <SelectItem value="radial">Radial aura</SelectItem>
                    <SelectItem value="mesh">Mesh aura</SelectItem>
                    <SelectItem value="spotlight">Spotlight</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className={epkControlLabel}>Hero media</Label>
                <Select
                  value={a.heroImageTreatment}
                  onValueChange={(v) =>
                    setA({ heroImageTreatment: v as EpkAppearance["heroImageTreatment"] })
                  }
                >
                  <SelectTrigger className={cn(epkSelectTrigger, "mt-2")}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="natural">Natural</SelectItem>
                    <SelectItem value="cinematic">Cinematic</SelectItem>
                    <SelectItem value="duotone">Duotone</SelectItem>
                    <SelectItem value="soft">Soft</SelectItem>
                    <SelectItem value="posterized">Posterized</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className={epkControlLabel}>Section dividers</Label>
                <Select
                  value={a.sectionDividerStyle}
                  onValueChange={(v) =>
                    setA({ sectionDividerStyle: v as EpkAppearance["sectionDividerStyle"] })
                  }
                >
                  <SelectTrigger className={cn(epkSelectTrigger, "mt-2")}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="line">Fine line</SelectItem>
                    <SelectItem value="accent">Accent line</SelectItem>
                    <SelectItem value="glow">Glow line</SelectItem>
                    <SelectItem value="ticker">Ticker dash</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button type="button" variant="ghost" size="sm" className={triggerClass()}>
              <Layers className="h-3.5 w-3.5" />
              Template
            </Button>
          </PopoverTrigger>
          <PopoverContent className={panelClass("w-56")} align="start">
            <Label className={epkControlLabel}>Layout skin</Label>
            <Select
              value={epkData.template}
              onValueChange={(v) => onCommitStyle({ template: v })}
            >
              <SelectTrigger className={cn(epkSelectTrigger, "mt-2")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="modern">Modern</SelectItem>
                <SelectItem value="classic">Classic</SelectItem>
                <SelectItem value="minimal">Minimal</SelectItem>
                <SelectItem value="bold">Bold</SelectItem>
                <SelectItem value="cinema">Cinema</SelectItem>
                <SelectItem value="gallery">Gallery</SelectItem>
                <SelectItem value="luxe">Luxe</SelectItem>
                <SelectItem value="poster">Poster</SelectItem>
                <SelectItem value="coastal">Coastal</SelectItem>
                <SelectItem value="scrapbook">Scrapbook</SelectItem>
                <SelectItem value="bandcard">Band Card</SelectItem>
                <SelectItem value="dossier">Dossier</SelectItem>
                <SelectItem value="pressgrid">Press Grid</SelectItem>
                <SelectItem value="redcolumn">Red Column</SelectItem>
                <SelectItem value="checkerboard">Checkerboard</SelectItem>
                <SelectItem value="editorial">Editorial</SelectItem>
                <SelectItem value="whitespace">Whitespace</SelectItem>
                <SelectItem value="colorblock">Color Block</SelectItem>
                <SelectItem value="sunburst">Sunburst</SelectItem>
                <SelectItem value="black">Black (→ minimal)</SelectItem>
                <SelectItem value="neon">Neon (→ bold)</SelectItem>
                <SelectItem value="sunset">Sunset (→ classic)</SelectItem>
              </SelectContent>
            </Select>
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button type="button" variant="ghost" size="sm" className={triggerClass()}>
              <WandSparkles className="h-3.5 w-3.5" />
              AI Style
            </Button>
          </PopoverTrigger>
          <PopoverContent className={panelClass("w-[22rem]")} align="end">
            <EpkAppearanceAiPanel
              prompt={appearancePrompt}
              onApply={handleAiApply}
              title="Generate EPK style with AI"
              description="Copy the prompt into your AI tool, paste the JSON it returns, then apply. Style only — content stays yours."
              className="border-0 bg-transparent p-0"
            />
          </PopoverContent>
        </Popover>

        <div className="ml-auto flex gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={epkMiniButton}
            disabled={!canUndo}
            onClick={onUndo}
          >
            <Undo2 className="mr-1 h-3.5 w-3.5" />
            Undo
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={epkMiniButton}
            onClick={onReset}
          >
            <RotateCcw className="mr-1 h-3.5 w-3.5" />
            Reset
          </Button>
        </div>
      </div>
    </div>
  )
}
