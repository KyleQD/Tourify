"use client"

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
import type { EPKData } from "@/lib/services/epk.service"
import type { EpkAppearance } from "@/lib/epk/epk-appearance"
import type { EpkSkinId } from "@/lib/epk/epk-skin-tokens"
import {
  Type,
  LayoutGrid,
  UserCircle,
  Palette,
  AlignVerticalSpaceAround,
  ImageIcon,
  Layers,
  Undo2,
  RotateCcw,
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

export function EpkBuilderToolbar({
  epkData,
  skin,
  onCommitStyle,
  onUndo,
  canUndo,
  onReset,
}: EpkBuilderToolbarProps) {
  const a = epkData.epkAppearance
  const isClassic = skin === "classic"

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
          <PopoverContent className="w-72 border-gray-700 bg-[#1e2230] p-3 text-white" align="start">
            <div className="space-y-3">
              <div>
                <Label className="text-xs text-gray-400">Font family</Label>
                <Select
                  value={epkData.epkFont}
                  onValueChange={(v) =>
                    onCommitStyle({ epkFont: v as EPKData["epkFont"] })
                  }
                >
                  <SelectTrigger className="mt-1 border-gray-600 bg-[#23263a] text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sans">Sans</SelectItem>
                    <SelectItem value="serif">Serif</SelectItem>
                    <SelectItem value="display">Display</SelectItem>
                    <SelectItem value="geometric">Geometric</SelectItem>
                    <SelectItem value="mono">Mono</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-gray-400">Size</Label>
                <div className="mt-1 flex gap-1">
                  {(["sm", "md", "lg"] as const).map((k) => (
                    <Button
                      key={k}
                      type="button"
                      size="sm"
                      variant={a.fontSizeScale === k ? "default" : "outline"}
                      className="flex-1 capitalize"
                      onClick={() => setA({ fontSizeScale: k })}
                    >
                      {k}
                    </Button>
                  ))}
                </div>
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
                <Label className="text-xs text-gray-400">Custom text (hex)</Label>
                <Input
                  className="mt-1 border-gray-600 bg-[#23263a] text-white"
                  placeholder="#e2e8f0"
                  value={a.textColorCustomHex ?? ""}
                  onChange={(e) => {
                    const v = e.target.value.trim()
                    setA({ textColorCustomHex: v || null })
                  }}
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
            <Button type="button" variant="ghost" size="sm" className={cn(chip, "gap-1.5")}>
              <Palette className="h-3.5 w-3.5" />
              Accent
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 border-gray-700 bg-[#1e2230] p-3 text-white" align="start">
            <Label className="text-xs text-gray-400">Accent (buttons / icons)</Label>
            <Input
              type="text"
              className="mt-1 border-gray-600 bg-[#23263a] text-white"
              placeholder="#6366f1"
              value={a.accentHex ?? ""}
              onChange={(e) => {
                const v = e.target.value.trim()
                setA({ accentHex: v || null })
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2 w-full border-gray-600"
              onClick={() => setA({ accentHex: null })}
            >
              Clear accent
            </Button>
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button type="button" variant="ghost" size="sm" className={cn(chip, "gap-1.5")}>
              <AlignVerticalSpaceAround className="h-3.5 w-3.5" />
              Spacing
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-52 border-gray-700 bg-[#1e2230] p-3 text-white" align="start">
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
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={cn(chip, "gap-1.5", !isClassic && "opacity-50")}
              disabled={!isClassic}
            >
              <ImageIcon className="h-3.5 w-3.5" />
              Cover
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 border-gray-700 bg-[#1e2230] p-3 text-white" align="start">
            {!isClassic ? (
              <p className="text-xs text-gray-400">Cover options apply to the Classic template.</p>
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
