"use client"
/**
 * VkAppearancePanel
 * Template selector + EpkAppearance customization for the Venue Kit.
 * Reuses EpkTemplateSelector and appearance controls from the EPK system.
 */
import React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Palette, Type, Layout, Sparkles } from "lucide-react"
import type { VKData } from "@/lib/services/venue-kit.service"
import type { EpkAppearance } from "@/lib/epk/epk-appearance"
import { DEFAULT_EPK_APPEARANCE } from "@/lib/epk/epk-appearance"
import { EPK_FONT_IDS, EPK_FONT_LABELS } from "@/lib/epk/epk-preview-utils"
import { epkInput, epkSurface } from "@/components/epk/epk-ui-styles"
import { cn } from "@/lib/utils"

// Reuse the same template list from the EPK system
const TEMPLATES = [
  { id: "modern",  name: "Modern",  desc: "Sleek gradients with premium aesthetics",        swatch: "bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600" },
  { id: "classic", name: "Classic", desc: "Warm editorial layout for press and bookers",     swatch: "bg-gradient-to-br from-orange-500 via-pink-500 to-purple-600" },
  { id: "minimal", name: "Minimal", desc: "Clean monochrome with subtle depth",               swatch: "bg-gradient-to-br from-gray-50 via-white to-gray-100" },
  { id: "bold",    name: "Bold",    desc: "Electric highlights and strong contrast",          swatch: "bg-gradient-to-br from-blue-900 via-cyan-800 to-teal-700" },
  { id: "black",   name: "Black",   desc: "Pure black with neon accents",                    swatch: "bg-gradient-to-br from-black via-gray-900 to-black" },
  { id: "neon",    name: "Neon",    desc: "Electric cyan on deep blue",                      swatch: "bg-gradient-to-br from-blue-950 via-cyan-900 to-teal-900" },
  { id: "sunset",  name: "Sunset",  desc: "Warm orange to pink glow",                        swatch: "bg-gradient-to-br from-orange-900 via-pink-900 to-purple-900" },
  { id: "cinema",  name: "Cinema",  desc: "Letterbox charcoal with platinum type",            swatch: "bg-gradient-to-br from-zinc-950 via-zinc-900 to-black" },
  { id: "gallery", name: "Gallery", desc: "Museum white with airy editorial space",           swatch: "bg-gradient-to-br from-neutral-100 via-white to-neutral-50" },
  { id: "luxe",    name: "Luxe",    desc: "Deep navy with champagne gold accents",            swatch: "bg-[#0a1628]" },
  { id: "poster",  name: "Poster",  desc: "Concert ink with coral stamp energy",              swatch: "bg-[#140808]" },
  { id: "coastal", name: "Coastal", desc: "Soft sage sand with calm teal accents",            swatch: "bg-[#e8efe9]" },
] as const

function AppearanceRow({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <Label className="shrink-0 text-xs text-muted-foreground">{label}</Label>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}

function SegmentControl({
  value,
  options,
  onChange,
}: {
  value: string
  options: { id: string; label: string }[]
  onChange: (v: string) => void
}) {
  return (
    <div className="flex rounded-xl border border-white/10 bg-black/25 p-0.5">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={cn(
            "flex-1 rounded-lg px-2 py-1 text-xs font-medium transition-colors",
            value === o.id
              ? "bg-white/12 text-white"
              : "text-slate-400 hover:text-slate-200"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

interface Props {
  vkData: VKData
  updateVKData: (updates: Partial<VKData>) => void
}

export default function VkAppearancePanel({ vkData, updateVKData }: Props) {
  const ap = vkData.vkAppearance ?? { ...DEFAULT_EPK_APPEARANCE }

  const updateAp = (patch: Partial<EpkAppearance>) => {
    updateVKData({ vkAppearance: { ...ap, ...patch } })
  }

  return (
    <div className="space-y-5">
      {/* Template Selector */}
      <Card className={epkSurface}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Layout className="h-4 w-4 text-purple-400" />
            Template
          </CardTitle>
          <CardDescription className="text-xs">Choose your Venue Kit's visual style.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {TEMPLATES.map((t) => {
              const active = vkData.template === t.id
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => updateVKData({ template: t.id })}
                  className={cn(
                    "group relative rounded-xl border p-3 text-left transition-all",
                    active
                      ? "border-purple-500/60 bg-purple-500/10"
                      : "border-white/10 bg-white/5 hover:border-white/20"
                  )}
                >
                  <div className={cn("mb-2 h-10 rounded-lg", t.swatch)} />
                  <p className="text-xs font-semibold text-white">{t.name}</p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground leading-tight">{t.desc}</p>
                  {active && (
                    <div className="absolute right-2 top-2 h-2 w-2 rounded-full bg-purple-400" />
                  )}
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Font */}
      <Card className={epkSurface}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Type className="h-4 w-4 text-purple-400" />
            Typography
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <AppearanceRow label="Font Family">
            <Select
              value={vkData.vkFont}
              onValueChange={(v) => updateVKData({ vkFont: v as VKData["vkFont"] })}
            >
              <SelectTrigger className={cn(epkInput, "h-8 text-xs")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EPK_FONT_IDS.map((id) => (
                  <SelectItem key={id} value={id} className="text-xs">
                    {EPK_FONT_LABELS[id]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </AppearanceRow>

          <AppearanceRow label="Font Size">
            <SegmentControl
              value={ap.fontSizeScale}
              options={[
                { id: "sm", label: "Sm" },
                { id: "md", label: "Md" },
                { id: "lg", label: "Lg" },
                { id: "xl", label: "XL" },
              ]}
              onChange={(v) => updateAp({ fontSizeScale: v as EpkAppearance["fontSizeScale"] })}
            />
          </AppearanceRow>

          <AppearanceRow label="Heading Size">
            <SegmentControl
              value={ap.headingScale}
              options={[
                { id: "sm", label: "Sm" },
                { id: "md", label: "Md" },
                { id: "lg", label: "Lg" },
                { id: "xl", label: "XL" },
              ]}
              onChange={(v) => updateAp({ headingScale: v as EpkAppearance["headingScale"] })}
            />
          </AppearanceRow>
        </CardContent>
      </Card>

      {/* Colors */}
      <Card className={epkSurface}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Palette className="h-4 w-4 text-purple-400" />
            Colors
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {(
            [
              { key: "accentHex",          label: "Accent Color"     },
              { key: "secondaryAccentHex", label: "Secondary Accent" },
              { key: "pageBackgroundHex",  label: "Page Background"  },
              { key: "cardBackgroundHex",  label: "Card Background"  },
              { key: "borderColorHex",     label: "Border Color"     },
            ] as const
          ).map(({ key, label }) => (
            <AppearanceRow key={key} label={label}>
              <div className="flex items-center gap-2">
                <Input
                  type="color"
                  className="h-8 w-10 cursor-pointer rounded-md border border-white/10 bg-transparent p-0.5"
                  value={(ap[key] as string | null) ?? "#6366f1"}
                  onChange={(e) => updateAp({ [key]: e.target.value })}
                />
                <Input
                  className={cn(epkInput, "h-8 flex-1 font-mono text-xs")}
                  placeholder="e.g. #6366f1 or leave blank"
                  value={(ap[key] as string | null) ?? ""}
                  onChange={(e) => updateAp({ [key]: e.target.value || null })}
                />
              </div>
            </AppearanceRow>
          ))}
        </CardContent>
      </Card>

      {/* Effects & Layout */}
      <Card className={epkSurface}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Sparkles className="h-4 w-4 text-purple-400" />
            Effects & Layout
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <AppearanceRow label="Content Width">
            <SegmentControl
              value={ap.contentWidth}
              options={[
                { id: "narrow",  label: "Narrow" },
                { id: "default", label: "Default" },
                { id: "wide",    label: "Wide" },
              ]}
              onChange={(v) => updateAp({ contentWidth: v as EpkAppearance["contentWidth"] })}
            />
          </AppearanceRow>

          <AppearanceRow label="Section Spacing">
            <SegmentControl
              value={ap.sectionSpacing}
              options={[
                { id: "compact",  label: "Compact" },
                { id: "default",  label: "Default" },
                { id: "relaxed",  label: "Relaxed" },
              ]}
              onChange={(v) => updateAp({ sectionSpacing: v as EpkAppearance["sectionSpacing"] })}
            />
          </AppearanceRow>

          <AppearanceRow label="Button Style">
            <SegmentControl
              value={ap.buttonStyle}
              options={[
                { id: "solid",   label: "Solid" },
                { id: "outline", label: "Outline" },
                { id: "glass",   label: "Glass" },
                { id: "minimal", label: "Minimal" },
              ]}
              onChange={(v) => updateAp({ buttonStyle: v as EpkAppearance["buttonStyle"] })}
            />
          </AppearanceRow>

          <AppearanceRow label="Card Radius">
            <SegmentControl
              value={ap.cardRadius}
              options={[
                { id: "sharp",   label: "Sharp" },
                { id: "rounded", label: "Rounded" },
                { id: "pill",    label: "Pill" },
              ]}
              onChange={(v) => updateAp({ cardRadius: v as EpkAppearance["cardRadius"] })}
            />
          </AppearanceRow>

          <AppearanceRow label="Effect Style">
            <Select
              value={ap.effectStyle}
              onValueChange={(v) => updateAp({ effectStyle: v as EpkAppearance["effectStyle"] })}
            >
              <SelectTrigger className={cn(epkInput, "h-8 text-xs")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(["none", "glow", "glass", "shadow", "neon", "grain", "spotlight", "poster"] as const).map(
                  (v) => (
                    <SelectItem key={v} value={v} className="text-xs capitalize">
                      {v}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
          </AppearanceRow>

          <AppearanceRow label="Hero Height">
            <SegmentControl
              value={ap.coverHeight}
              options={[
                { id: "short",  label: "Short" },
                { id: "medium", label: "Medium" },
                { id: "tall",   label: "Tall" },
              ]}
              onChange={(v) => updateAp({ coverHeight: v as EpkAppearance["coverHeight"] })}
            />
          </AppearanceRow>
        </CardContent>
      </Card>

      {/* Apply to public profile */}
      <Card className={epkSurface}>
        <CardContent className="flex items-center justify-between py-4">
          <div>
            <p className="text-sm font-medium text-white">Apply style to public profile</p>
            <p className="text-xs text-muted-foreground">
              Use your Venue Kit's template and colors on <code>/venues/[slug]</code>
            </p>
          </div>
          <Switch
            checked={vkData.useVkStyleOnProfile}
            onCheckedChange={(v) => updateVKData({ useVkStyleOnProfile: v })}
          />
        </CardContent>
      </Card>
    </div>
  )
}
