"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Check, Paintbrush } from "lucide-react"
import {
  STOREFRONT_THEME_PRESETS,
  DEFAULT_STOREFRONT_THEME,
  type StorefrontThemeConfig,
} from "@/lib/marketplace/storefront-themes"
import { StorefrontBanner } from "@/components/marketplace/storefront-banner"
import { AnimatedProductCard } from "@/components/marketplace/animated-product-card"

interface StorefrontThemeEditorProps {
  theme: StorefrontThemeConfig
  displayName: string
  tagline?: string | null
  onChange: (theme: StorefrontThemeConfig) => void
}

const CARD_STYLE_OPTIONS: { value: StorefrontThemeConfig["cardStyle"]; label: string }[] = [
  { value: "glass", label: "Glass" },
  { value: "solid", label: "Solid" },
  { value: "outline", label: "Outline" },
  { value: "neon", label: "Neon" },
]

const LAYOUT_OPTIONS: { value: StorefrontThemeConfig["layout"]; label: string }[] = [
  { value: "grid", label: "Grid" },
  { value: "masonry", label: "Masonry" },
  { value: "list", label: "List" },
  { value: "carousel", label: "Carousel" },
]

const FONT_OPTIONS: { value: StorefrontThemeConfig["fontStyle"]; label: string }[] = [
  { value: "default", label: "Default" },
  { value: "elegant", label: "Elegant" },
  { value: "bold", label: "Bold" },
  { value: "mono", label: "Mono" },
]

const BANNER_OPTIONS: { value: StorefrontThemeConfig["bannerStyle"]; label: string }[] = [
  { value: "gradient", label: "Gradient" },
  { value: "solid", label: "Solid" },
  { value: "none", label: "None" },
]

const EFFECT_TOGGLES: { key: keyof StorefrontThemeConfig["effects"]; label: string; description: string }[] = [
  { key: "animateCards", label: "Card animations", description: "Entrance animations on product cards" },
  { key: "hoverLift", label: "Hover lift", description: "Cards lift up when hovered" },
  { key: "glowBorder", label: "Glow borders", description: "Accent-colored glow around cards" },
  { key: "shimmerImages", label: "Image shimmer", description: "Shimmer effect over product images" },
  { key: "floatingOrbs", label: "Floating orbs", description: "Decorative animated background orbs" },
  { key: "gradientText", label: "Gradient text", description: "Product titles use gradient colors" },
  { key: "staggerEntrance", label: "Stagger entrance", description: "Cards appear one by one" },
]

const MOCK_PRODUCT = {
  id: "preview-1",
  title: "Example Product",
  description: "A sample item to preview your theme",
  imageUrl: null as string | null,
  productType: "physical_merch",
  price: 29.99,
  currency: "USD",
}

export function StorefrontThemeEditor({ theme, displayName, tagline, onChange }: StorefrontThemeEditorProps) {
  const [showPreview, setShowPreview] = useState(true)

  function applyPreset(presetId: string) {
    const preset = STOREFRONT_THEME_PRESETS.find(p => p.id === presetId)
    if (preset) onChange(preset.theme)
  }

  function setEffect(key: keyof StorefrontThemeConfig["effects"], value: boolean) {
    onChange({ ...theme, effects: { ...theme.effects, [key]: value } })
  }

  return (
    <div className="space-y-6">
      {/* Theme presets */}
      <div className="space-y-3 rounded-lg border border-slate-800 bg-slate-900/60 p-4">
        <h3 className="flex items-center gap-2 text-base font-semibold">
          <Paintbrush className="h-4 w-4 text-purple-400" />
          Theme presets
        </h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {STOREFRONT_THEME_PRESETS.map(preset => (
            <button
              key={preset.id}
              onClick={() => applyPreset(preset.id)}
              className={`
                group relative rounded-xl border p-3 text-left transition-all duration-200
                ${theme.preset === preset.id
                  ? "border-purple-500/50 bg-purple-500/10 ring-1 ring-purple-500/30"
                  : "border-slate-700 bg-slate-800/50 hover:border-slate-600 hover:bg-slate-800"
                }
              `}
            >
              <div
                className="mb-2 h-6 w-full rounded-md bg-gradient-to-r"
                style={{
                  backgroundImage: `linear-gradient(to right, ${preset.theme.accentColor}40, ${preset.theme.accentColor}10)`,
                }}
              />
              <div className="text-sm font-medium text-white">{preset.name}</div>
              <div className="mt-0.5 text-xs text-slate-400">{preset.description}</div>
              {theme.preset === preset.id && (
                <div className="absolute right-2 top-2">
                  <Check className="h-4 w-4 text-purple-400" />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Custom options */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left: settings */}
        <div className="space-y-4">
          {/* Accent color */}
          <div className="space-y-2 rounded-lg border border-slate-800 bg-slate-900/60 p-4">
            <h4 className="text-sm font-medium text-white">Accent color</h4>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={theme.accentColor}
                onChange={e => onChange({ ...theme, accentColor: e.target.value })}
                className="h-10 w-14 cursor-pointer rounded-lg border border-slate-700 bg-transparent"
              />
              <Input
                value={theme.accentColor}
                onChange={e => onChange({ ...theme, accentColor: e.target.value })}
                className="w-28 font-mono text-sm"
                maxLength={7}
              />
              <div
                className="h-8 flex-1 rounded-lg"
                style={{ background: `linear-gradient(to right, ${theme.accentColor}60, ${theme.accentColor}10)` }}
              />
            </div>
          </div>

          {/* Card style */}
          <div className="space-y-2 rounded-lg border border-slate-800 bg-slate-900/60 p-4">
            <h4 className="text-sm font-medium text-white">Card style</h4>
            <div className="flex flex-wrap gap-2">
              {CARD_STYLE_OPTIONS.map(opt => (
                <Badge
                  key={opt.value}
                  variant={theme.cardStyle === opt.value ? "default" : "secondary"}
                  className={`cursor-pointer transition-all ${theme.cardStyle === opt.value ? "bg-purple-600" : "bg-slate-800 hover:bg-slate-700"}`}
                  onClick={() => onChange({ ...theme, cardStyle: opt.value })}
                >
                  {opt.label}
                </Badge>
              ))}
            </div>
          </div>

          {/* Layout */}
          <div className="space-y-2 rounded-lg border border-slate-800 bg-slate-900/60 p-4">
            <h4 className="text-sm font-medium text-white">Layout</h4>
            <div className="flex flex-wrap gap-2">
              {LAYOUT_OPTIONS.map(opt => (
                <Badge
                  key={opt.value}
                  variant={theme.layout === opt.value ? "default" : "secondary"}
                  className={`cursor-pointer transition-all ${theme.layout === opt.value ? "bg-purple-600" : "bg-slate-800 hover:bg-slate-700"}`}
                  onClick={() => onChange({ ...theme, layout: opt.value })}
                >
                  {opt.label}
                </Badge>
              ))}
            </div>
          </div>

          {/* Font style */}
          <div className="space-y-2 rounded-lg border border-slate-800 bg-slate-900/60 p-4">
            <h4 className="text-sm font-medium text-white">Font style</h4>
            <div className="flex flex-wrap gap-2">
              {FONT_OPTIONS.map(opt => (
                <Badge
                  key={opt.value}
                  variant={theme.fontStyle === opt.value ? "default" : "secondary"}
                  className={`cursor-pointer transition-all ${theme.fontStyle === opt.value ? "bg-purple-600" : "bg-slate-800 hover:bg-slate-700"}`}
                  onClick={() => onChange({ ...theme, fontStyle: opt.value })}
                >
                  {opt.label}
                </Badge>
              ))}
            </div>
          </div>

          {/* Banner style */}
          <div className="space-y-2 rounded-lg border border-slate-800 bg-slate-900/60 p-4">
            <h4 className="text-sm font-medium text-white">Banner style</h4>
            <div className="flex flex-wrap gap-2">
              {BANNER_OPTIONS.map(opt => (
                <Badge
                  key={opt.value}
                  variant={theme.bannerStyle === opt.value ? "default" : "secondary"}
                  className={`cursor-pointer transition-all ${theme.bannerStyle === opt.value ? "bg-purple-600" : "bg-slate-800 hover:bg-slate-700"}`}
                  onClick={() => onChange({ ...theme, bannerStyle: opt.value })}
                >
                  {opt.label}
                </Badge>
              ))}
            </div>
          </div>

          {/* Effects */}
          <div className="space-y-3 rounded-lg border border-slate-800 bg-slate-900/60 p-4">
            <h4 className="text-sm font-medium text-white">Effects &amp; animations</h4>
            <div className="space-y-2">
              {EFFECT_TOGGLES.map(toggle => (
                <label key={toggle.key} className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={theme.effects[toggle.key]}
                    onChange={e => setEffect(toggle.key, e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-600 bg-slate-800 accent-purple-500"
                  />
                  <div>
                    <div className="text-sm text-white group-hover:text-purple-300 transition-colors">{toggle.label}</div>
                    <div className="text-xs text-slate-500">{toggle.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Right: live preview */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-white">Live preview</h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowPreview(p => !p)}
              className="text-xs"
            >
              {showPreview ? "Hide preview" : "Show preview"}
            </Button>
          </div>

          {showPreview && (
            <div className="space-y-4 rounded-xl border border-slate-800 bg-black/40 p-4">
              <StorefrontBanner
                displayName={displayName || "My Store"}
                tagline={tagline}
                theme={theme}
              />

              <div className="grid gap-3 sm:grid-cols-2">
                {[MOCK_PRODUCT, { ...MOCK_PRODUCT, id: "preview-2", title: "Another Item", price: 14.99 }].map((product, i) => (
                  <AnimatedProductCard
                    key={product.id}
                    id={product.id}
                    title={product.title}
                    description={product.description}
                    imageUrl={product.imageUrl}
                    productType={product.productType}
                    price={product.price}
                    currency={product.currency}
                    index={i}
                    theme={theme}
                    layout={theme.layout === "carousel" ? "grid" : theme.layout}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
