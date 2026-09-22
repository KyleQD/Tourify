"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { ColorPicker } from "@/components/ui/color-picker"
import {
  CheckCircle,
  ExternalLink,
  Globe,
  Loader2,
  Palette,
  Save,
  Sparkles,
} from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import {
  EPK_COLOR_SWATCHES,
  EPK_PALETTE_PRESETS,
  getDefaultEpkAppearanceForTemplate,
  type EpkAppearance,
} from "@/lib/epk/epk-appearance"
import { EPK_TEMPLATE_CATALOG } from "@/lib/epk/epk-template-catalog"
import {
  EPK_FONT_IDS,
  EPK_FONT_LABELS,
  type EpkFontId,
} from "@/lib/epk/epk-preview-utils"
import { resolveEpkPreviewTemplateId } from "@/lib/epk/epk-skin-tokens"
import { EPK_FONT_CLASS_BY_ID, epkFontClass } from "@/components/epk/epk-preview-fonts"
import { EpkAppearanceAiPanel } from "@/components/epk/epk-appearance-ai-panel"
import {
  DEFAULT_PUBLIC_ARTIST_APPEARANCE,
  normalizePublicArtistAppearance,
  resolvePublicArtistAppearanceForRender,
  type PublicArtistAppearance,
} from "@/lib/public-artist/public-artist-appearance"
import {
  buildEpkAppearanceAiPrompt,
  type EpkAppearanceAiPayload,
} from "@/lib/epk/epk-appearance-ai-prompt"

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

export function ArtistPublicAppearancePanel() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [artistName, setArtistName] = useState<string | null>(null)
  const [bio, setBio] = useState<string | null>(null)
  const [genres, setGenres] = useState<string[]>([])
  const [appearance, setAppearance] = useState<PublicArtistAppearance>({
    ...DEFAULT_PUBLIC_ARTIST_APPEARANCE,
    epkAppearance: { ...DEFAULT_PUBLIC_ARTIST_APPEARANCE.epkAppearance },
  })
  const [isConfigured, setIsConfigured] = useState(false)
  const [useEpkStyleOnProfile, setUseEpkStyleOnProfile] = useState(false)

  useEffect(() => {
    void loadAppearance()
  }, [])

  async function loadAppearance() {
    try {
      setLoading(true)
      const response = await fetch("/api/artist/public-appearance", {
        credentials: "include",
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok || !data.success)
        throw new Error(data.message || data.error || "Failed to load appearance")

      setAppearance(normalizePublicArtistAppearance(data.appearance))
      setIsConfigured(Boolean(data.isConfigured))
      setUseEpkStyleOnProfile(Boolean(data.useEpkStyleOnProfile))
      setArtistName(typeof data.artistName === "string" ? data.artistName : null)
      setBio(typeof data.bio === "string" ? data.bio : null)
      setGenres(
        Array.isArray(data.genres)
          ? data.genres.filter((g: unknown): g is string => typeof g === "string")
          : []
      )
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load appearance")
    } finally {
      setLoading(false)
    }
  }

  async function saveAppearance(next: PublicArtistAppearance) {
    setSaving(true)
    try {
      const response = await fetch("/api/artist/public-appearance", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appearance: next }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok || !data.success)
        throw new Error(data.message || data.error || "Failed to save appearance")

      setAppearance(normalizePublicArtistAppearance(data.appearance))
      setIsConfigured(true)
      toast.success("Public profile appearance saved")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save appearance")
      throw error
    } finally {
      setSaving(false)
    }
  }

  function patchAppearance(partial: Partial<EpkAppearance>) {
    setAppearance((prev) => ({
      ...prev,
      epkAppearance: { ...prev.epkAppearance, ...partial },
    }))
  }

  function handleTemplateChange(templateId: string) {
    const template = resolveEpkPreviewTemplateId(templateId)
    setAppearance((prev) => ({
      ...prev,
      template,
      epkAppearance: getDefaultEpkAppearanceForTemplate(template),
    }))
  }

  function handleFontChange(epkFont: EpkFontId) {
    setAppearance((prev) => ({ ...prev, epkFont }))
  }

  async function handleAiApply(payload: EpkAppearanceAiPayload) {
    const next = normalizePublicArtistAppearance(payload)
    setAppearance(next)
    await saveAppearance(next)
  }

  const resolved = useMemo(
    () => resolvePublicArtistAppearanceForRender(appearance),
    [appearance]
  )
  const prompt = useMemo(
    () =>
      buildEpkAppearanceAiPrompt({
        surface: "public_artist_profile",
        artistName,
        bio,
        genres,
        location: null,
        currentTemplate: appearance.template,
        currentFont: appearance.epkFont,
      }),
    [appearance.epkFont, appearance.template, artistName, bio, genres]
  )
  const presets = EPK_PALETTE_PRESETS[appearance.template] ?? []
  const a = appearance.epkAppearance

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {useEpkStyleOnProfile ? (
        <div className="flex items-start gap-3 rounded-xl border border-amber-400/25 bg-amber-400/10 p-4">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
          <div className="min-w-0 flex-1 text-sm">
            <p className="font-medium text-amber-200">Profile appearance is synced with your EPK</p>
            <p className="mt-0.5 text-amber-200/70">
              Changes saved here will be overwritten the next time you save your EPK. To manage this
              style, edit it in the EPK builder.
            </p>
            <Link
              href="/artist/epk"
              className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-amber-300 underline-offset-2 hover:underline"
            >
              Edit in EPK Builder
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </div>
      ) : null}

      <div className="rounded-xl border border-purple-500/20 bg-gradient-to-r from-purple-500/10 to-pink-500/10 p-6">
        <div className="flex items-start gap-4">
          <div className="rounded-xl bg-purple-500/20 p-3">
            <Palette className="h-8 w-8 text-purple-400" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-2xl font-bold text-white">Public profile appearance</h3>
            <p className="mt-1 text-gray-300">
              Use the same EPK template styles on your public artist page. Style only — your
              sections, CTAs, and information stay the same.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge className="border-purple-500/30 bg-purple-500/20 text-purple-200">
                <Globe className="mr-1 h-3 w-3" />
                Public page only
              </Badge>
              <Badge className="border-white/15 bg-white/5 text-white/70">
                Does not change your artist dashboard
              </Badge>
              {isConfigured ? (
                <Badge className="border-emerald-400/30 bg-emerald-500/15 text-emerald-200">
                  Custom style active
                </Badge>
              ) : (
                <Badge className="border-white/15 bg-white/5 text-white/60">
                  Using default look until you save
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <Card className="border-white/10 bg-white/[0.03]">
            <CardHeader className="pb-3">
              <CardTitle className="text-white">Template</CardTitle>
              <CardDescription>
                Same skins as the EPK builder — applied as a visual overlay on your public page.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid max-h-[28rem] gap-2 overflow-y-auto sm:grid-cols-2">
              {EPK_TEMPLATE_CATALOG.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => handleTemplateChange(template.id)}
                  className={cn(
                    "rounded-xl border-2 p-2.5 text-left transition-all",
                    appearance.template === resolveEpkPreviewTemplateId(template.id)
                      ? "border-purple-500 bg-purple-500/10"
                      : "border-white/10 hover:border-white/25"
                  )}
                >
                  <div
                    className={cn(
                      "relative mb-2 h-16 overflow-hidden rounded-lg",
                      template.colors
                        ? `bg-gradient-to-br ${template.colors.join(" ")}`
                        : template.previewClassName
                    )}
                  >
                    {appearance.template === resolveEpkPreviewTemplateId(template.id) ? (
                      <CheckCircle className="absolute right-2 top-2 h-4 w-4 text-purple-300" />
                    ) : null}
                  </div>
                  <p className="text-sm font-medium text-white">{template.name}</p>
                  <p className="text-xs text-white/50">{template.description}</p>
                </button>
              ))}
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/[0.03]">
            <CardHeader className="pb-3">
              <CardTitle className="text-white">Type & colors</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <Label className="text-xs uppercase tracking-wide text-white/50">Font</Label>
                <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                  {EPK_FONT_IDS.map((id) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => handleFontChange(id)}
                      className={cn(
                        "rounded-lg border px-2 py-2 text-left",
                        appearance.epkFont === id
                          ? "border-indigo-400 bg-indigo-500/15"
                          : "border-white/10 bg-black/20 hover:border-white/25"
                      )}
                    >
                      <span className={cn("block text-lg text-white", EPK_FONT_CLASS_BY_ID[id])}>
                        Aa
                      </span>
                      <span className="text-[10px] uppercase tracking-wide text-white/45">
                        {EPK_FONT_LABELS[id]}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {presets.length > 0 ? (
                <div>
                  <Label className="text-xs uppercase tracking-wide text-white/50">
                    Palette presets
                  </Label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {presets.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() =>
                          patchAppearance({
                            accentHex: preset.accentHex,
                            secondaryAccentHex: preset.secondaryAccentHex,
                            pageBackgroundHex: preset.pageBackgroundHex,
                            textColorCustomHex: preset.textColorCustomHex,
                            cardBackgroundHex: preset.cardBackgroundHex,
                            borderColorHex: preset.borderColorHex,
                          })
                        }
                        className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10"
                      >
                        {preset.name}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className="mb-2 block text-xs uppercase tracking-wide text-white/50">
                    Accent
                  </Label>
                  <ColorSwatchRow
                    value={a.accentHex}
                    onPick={(hex) => patchAppearance({ accentHex: hex })}
                  />
                  <div className="mt-2">
                    <ColorPicker
                      value={a.accentHex ?? "#8b5cf6"}
                      onChange={(c) => patchAppearance({ accentHex: c })}
                      label="Accent"
                      showLabel={false}
                    />
                  </div>
                </div>
                <div>
                  <Label className="mb-2 block text-xs uppercase tracking-wide text-white/50">
                    Page background
                  </Label>
                  <ColorSwatchRow
                    value={a.pageBackgroundHex}
                    onPick={(hex) => patchAppearance({ pageBackgroundHex: hex })}
                  />
                  <div className="mt-2">
                    <ColorPicker
                      value={a.pageBackgroundHex ?? "#07080f"}
                      onChange={(c) => patchAppearance({ pageBackgroundHex: c })}
                      label="Background"
                      showLabel={false}
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label className="text-xs uppercase tracking-wide text-white/50">Effects</Label>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {(["none", "glow", "glass", "shadow", "neon", "grain"] as const).map((effect) => (
                      <button
                        key={effect}
                        type="button"
                        onClick={() => patchAppearance({ effectStyle: effect })}
                        className={cn(
                          "rounded-full border px-2.5 py-1 text-xs capitalize",
                          a.effectStyle === effect
                            ? "border-purple-400 bg-purple-500/20 text-white"
                            : "border-white/10 text-white/60 hover:border-white/25"
                        )}
                      >
                        {effect}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-wide text-white/50">
                    Surface style
                  </Label>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {(["default", "glass", "solid", "editorial", "outlined"] as const).map(
                      (surface) => (
                        <button
                          key={surface}
                          type="button"
                          onClick={() => patchAppearance({ surfaceStyle: surface })}
                          className={cn(
                            "rounded-full border px-2.5 py-1 text-xs capitalize",
                            a.surfaceStyle === surface
                              ? "border-purple-400 bg-purple-500/20 text-white"
                              : "border-white/10 text-white/60 hover:border-white/25"
                          )}
                        >
                          {surface}
                        </button>
                      )
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <EpkAppearanceAiPanel
            prompt={prompt}
            onApply={handleAiApply}
            title="Generate public profile style with AI"
            description="Copy the prompt, paste the returned JSON, and apply. Writes style only — not your bio, music, or sections."
          />
        </div>

        <div className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          <Card className="overflow-hidden border-white/10 bg-black/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-white">Live preview</CardTitle>
              <CardDescription className="text-xs">
                Approximate public chrome — functions and data stay unchanged.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                className={cn(
                  "relative overflow-hidden rounded-2xl border border-white/10 p-4",
                  resolved.mergedTokens.page,
                  resolved.wrapperClassName,
                  resolved.color.pageEffectClass,
                  epkFontClass(appearance.epkFont)
                )}
                style={{ ...resolved.rootStyle, ...resolved.styles.page }}
              >
                <div
                  className={cn(
                    "mb-3 overflow-hidden p-4",
                    resolved.mergedTokens.card,
                    resolved.color.effectClass
                  )}
                  style={resolved.styles.heroShell}
                >
                  <div className="mb-3 h-20 rounded-xl bg-white/10" />
                  <div className="flex items-end gap-3">
                    <div
                      className={cn(
                        "h-14 w-14 border-2 border-white/30 bg-white/20",
                        resolved.avatarShapeClass
                      )}
                      style={resolved.styles.avatarRing}
                    />
                    <div>
                      <p className={cn(resolved.mergedTokens.heading, "text-lg")}>Artist Name</p>
                      <p className={cn(resolved.mergedTokens.muted, "text-xs")}>Genre · City</p>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <span
                      className={cn("px-3 py-1.5 text-xs", resolved.mergedTokens.btnPrimary)}
                      style={resolved.styles.buttonPrimary}
                    >
                      Book
                    </span>
                    <span
                      className={cn("px-3 py-1.5 text-xs", resolved.mergedTokens.btnGhost)}
                      style={resolved.styles.buttonGhost}
                    >
                      Play
                    </span>
                  </div>
                </div>
                <div
                  className={cn("p-4", resolved.mergedTokens.card)}
                  style={resolved.styles.card}
                >
                  <p className={cn(resolved.mergedTokens.label, "mb-2")}>Music</p>
                  <div
                    className={cn("p-3", resolved.mergedTokens.cardMuted)}
                    style={resolved.styles.mutedCard}
                  >
                    <p className={cn(resolved.mergedTokens.bodyStrong, "text-sm")}>Track title</p>
                    <p className={cn(resolved.mergedTokens.muted, "text-xs")}>Featured release</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Button
            type="button"
            onClick={() => void saveAppearance(appearance)}
            disabled={saving}
            className="w-full bg-purple-600 text-white hover:bg-purple-500"
          >
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save public appearance
          </Button>
        </div>
      </div>
    </div>
  )
}
