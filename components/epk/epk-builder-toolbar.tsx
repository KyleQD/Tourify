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
} from "lucide-react"
import { cn } from "@/lib/utils"

export interface EpkBuilderToolbarProps {
  epkData: EPKData
  skin: EpkSkinId
  onCommitStyle: (patch: Partial<Pick<EPKData, "epkAppearance" | "epkFont" | "template">>) => void
  onUndo: () => void
  canUndo: boolean
  onReset: () => void
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
}: EpkBuilderToolbarProps) {
  const a = epkData.epkAppearance
  const hasCoverControls = skin === "classic" || skin === "cinema"

  const setA = (partial: Partial<EpkAppearance>) => {
    onCommitStyle({ epkAppearance: patchAppearance(a, partial) })
  }

  const chip =
    "rounded-lg border border-gray-700/80 bg-[#23263a] px-2.5 py-1.5 text-xs text-gray-200 hover:bg-white/5"

  return (
    <div className="border-t border-gray-800/80 bg-[#181b23]/98 px-4 py-2 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button type="button" variant="ghost" size="sm" className={cn(chip, "gap-1.5")}>
              <Type className="h-3.5 w-3.5" />
              Type
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="max-h-[80vh] w-80 overflow-y-auto border-gray-700 bg-[#1e2230] p-3 text-white"
            align="start"
          >
            <div className="space-y-3">
              <div>
                <Label className="text-xs text-gray-400">Font family</Label>
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
                <Label className="text-xs text-gray-400">Body size</Label>
                <div className="mt-1 flex flex-wrap gap-1">
                  {(["xs", "sm", "md", "lg", "xl"] as const).map((k) => (
                    <Button
                      key={k}
                      type="button"
                      size="sm"
                      variant={a.fontSizeScale === k ? "default" : "outline"}
                      className="min-w-[2.5rem] flex-1 uppercase"
                      onClick={() => setA({ fontSizeScale: k })}
                    >
                      {k}
                    </Button>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-xs text-gray-400">Heading scale</Label>
                <div className="mt-1 flex gap-1">
                  {(["sm", "md", "lg", "xl"] as const).map((k) => (
                    <Button
                      key={k}
                      type="button"
                      size="sm"
                      variant={a.headingScale === k ? "default" : "outline"}
                      className="flex-1 uppercase"
                      onClick={() => setA({ headingScale: k })}
                    >
                      {k}
                    </Button>
                  ))}
                </div>
                <p className="mt-1 text-[10px] text-gray-500">md keeps the template title size</p>
              </div>
              <div>
                <Label className="text-xs text-gray-400">Text preset</Label>
                <Select
                  value={a.textColorPreset}
                  onValueChange={(v) =>
                    setA({
                      textColorPreset: v as EpkAppearance["textColorPreset"],
                    })
                  }
                >
                  <SelectTrigger className="mt-1 border-gray-600 bg-[#23263a] text-white">
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
                <Label className="mb-2 block text-xs text-gray-400">Custom text color</Label>
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
            <Button type="button" variant="ghost" size="sm" className={cn(chip, "gap-1.5")}>
              <Palette className="h-3.5 w-3.5" />
              Colors
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="max-h-[80vh] w-80 overflow-y-auto border-gray-700 bg-[#1e2230] p-3 text-white"
            align="start"
          >
            <div className="space-y-4">
              <div>
                <Label className="mb-2 block text-xs text-gray-400">Accent (buttons / icons)</Label>
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
              <div className="border-t border-gray-700/80 pt-3">
                <Label className="mb-2 block text-xs text-gray-400">Page background</Label>
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
            </div>
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button type="button" variant="ghost" size="sm" className={cn(chip, "gap-1.5")}>
              <LayoutGrid className="h-3.5 w-3.5" />
              Cards
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 border-gray-700 bg-[#1e2230] p-3 text-white" align="start">
            <div className="space-y-3">
              <div>
                <Label className="text-xs text-gray-400">Corners</Label>
                <div className="mt-1 flex gap-1">
                  {(["sharp", "rounded", "pill"] as const).map((k) => (
                    <Button
                      key={k}
                      type="button"
                      size="sm"
                      variant={a.cardRadius === k ? "default" : "outline"}
                      className="flex-1 capitalize"
                      onClick={() => setA({ cardRadius: k })}
                    >
                      {k}
                    </Button>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-xs text-gray-400">Surface</Label>
                <Select
                  value={a.cardSurface}
                  onValueChange={(v) =>
                    setA({ cardSurface: v as EpkAppearance["cardSurface"] })
                  }
                >
                  <SelectTrigger className="mt-1 border-gray-600 bg-[#23263a] text-white">
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
                <Label className="text-xs text-gray-400">Border strength</Label>
                <div className="mt-1 flex gap-1">
                  {(["subtle", "default", "strong"] as const).map((k) => (
                    <Button
                      key={k}
                      type="button"
                      size="sm"
                      variant={a.borderStrength === k ? "default" : "outline"}
                      className="flex-1 capitalize"
                      onClick={() => setA({ borderStrength: k })}
                    >
                      {k}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button type="button" variant="ghost" size="sm" className={cn(chip, "gap-1.5")}>
              <Columns3 className="h-3.5 w-3.5" />
              Layout
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 border-gray-700 bg-[#1e2230] p-3 text-white" align="start">
            <div className="space-y-3">
              <div>
                <Label className="text-xs text-gray-400">Content width</Label>
                <div className="mt-1 flex flex-col gap-1">
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
                      variant={a.contentWidth === k ? "default" : "outline"}
                      onClick={() => setA({ contentWidth: k })}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-xs text-gray-400">Section spacing</Label>
                <div className="mt-1 flex flex-col gap-1">
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
                      variant={a.sectionSpacing === k ? "default" : "outline"}
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
            <Button type="button" variant="ghost" size="sm" className={cn(chip, "gap-1.5")}>
              <UserCircle className="h-3.5 w-3.5" />
              Photo
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 border-gray-700 bg-[#1e2230] p-3 text-white" align="start">
            <div className="space-y-3">
              <div>
                <Label className="text-xs text-gray-400">Shape</Label>
                <div className="mt-1 flex gap-1">
                  {(["circle", "rounded", "square"] as const).map((k) => (
                    <Button
                      key={k}
                      type="button"
                      size="sm"
                      variant={a.avatarShape === k ? "default" : "outline"}
                      className="flex-1 capitalize"
                      onClick={() => setA({ avatarShape: k })}
                    >
                      {k}
                    </Button>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-xs text-gray-400">Size</Label>
                <div className="mt-1 grid grid-cols-2 gap-1">
                  {(["sm", "md", "lg", "xl"] as const).map((k) => (
                    <Button
                      key={k}
                      type="button"
                      size="sm"
                      variant={a.avatarSize === k ? "default" : "outline"}
                      className="uppercase"
                      onClick={() => setA({ avatarSize: k })}
                    >
                      {k}
                    </Button>
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
              className={cn(chip, "gap-1.5", !hasCoverControls && "opacity-50")}
              disabled={!hasCoverControls}
            >
              <ImageIcon className="h-3.5 w-3.5" />
              Cover
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 border-gray-700 bg-[#1e2230] p-3 text-white" align="start">
            {!hasCoverControls ? (
              <p className="text-xs text-gray-400">
                Cover options apply to Classic and Cinema templates.
              </p>
            ) : (
              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-gray-400">Height</Label>
                  <div className="mt-1 flex gap-1">
                    {(["short", "medium", "tall"] as const).map((k) => (
                      <Button
                        key={k}
                        type="button"
                        size="sm"
                        variant={a.coverHeight === k ? "default" : "outline"}
                        className="flex-1 capitalize"
                        onClick={() => setA({ coverHeight: k })}
                      >
                        {k}
                      </Button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-gray-400">Overlay</Label>
                  <div className="mt-1 flex gap-1">
                    {(["light", "medium", "heavy"] as const).map((k) => (
                      <Button
                        key={k}
                        type="button"
                        size="sm"
                        variant={a.coverOverlay === k ? "default" : "outline"}
                        className="flex-1 capitalize"
                        onClick={() => setA({ coverOverlay: k })}
                      >
                        {k}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button type="button" variant="ghost" size="sm" className={cn(chip, "gap-1.5")}>
              <Layers className="h-3.5 w-3.5" />
              Template
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 border-gray-700 bg-[#1e2230] p-3 text-white" align="start">
            <Label className="text-xs text-gray-400">Layout skin</Label>
            <Select
              value={epkData.template}
              onValueChange={(v) => onCommitStyle({ template: v })}
            >
              <SelectTrigger className="mt-1 border-gray-600 bg-[#23263a] text-white">
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
                <SelectItem value="black">Black (→ minimal)</SelectItem>
                <SelectItem value="neon">Neon (→ bold)</SelectItem>
                <SelectItem value="sunset">Sunset (→ classic)</SelectItem>
              </SelectContent>
            </Select>
          </PopoverContent>
        </Popover>

        <div className="ml-auto flex gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-gray-700 text-gray-200"
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
            className="border-gray-700 text-gray-200"
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
