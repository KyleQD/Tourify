"use client"

import Image from "next/image"
import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import {
  ArrowDown,
  ArrowUp,
  Check,
  Eye,
  Loader2,
  Monitor,
  RotateCcw,
  Save,
  Smartphone,
  Sparkles,
  Upload,
} from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { useActingContext } from "@/hooks/use-acting-context"
import {
  applyArtistProfileTemplatePreset,
  artistProfileAppearanceStyle,
  ARTIST_PROFILE_SECTION_IDS,
  ARTIST_PROFILE_TEMPLATE_MAP,
  ARTIST_PROFILE_TEMPLATES,
  getArtistProfilePalettePresets,
  normalizeArtistProfileAppearance,
  suggestAccessibleArtistProfileColors,
  validateArtistProfileContrast,
  type ArtistProfileAppearance,
  type ArtistProfileDesignState,
  type ArtistProfileSectionId,
} from "@/lib/public-artist/artist-profile-appearance"
import { cn } from "@/lib/utils"
import themeStyles from "@/components/public-artist/artist-profile-theme.module.css"

type StudioTab = "templates" | "style" | "sections"
type PreviewMode = "desktop" | "mobile"

interface PreviewProfile {
  artistName: string
  username: string | null
  bio: string | null
  genres: string[]
  avatarUrl: string | null
  coverUrl: string | null
  location: string | null
}

interface AppearanceResponse {
  success: boolean
  artistProfileId: string
  profileDesign: ArtistProfileDesignState
  seedAppearance: ArtistProfileAppearance
  previewProfile: PreviewProfile
}

const SECTION_LABELS: Record<ArtistProfileSectionId, string> = {
  social: "Social links",
  stats: "Audience stats",
  about: "About",
  music: "Music",
  storefront: "Storefront",
  events: "Upcoming events",
  services: "Work & services",
  memberships: "Memberships",
  gallery: "Media gallery",
  posts: "Posts",
  epk: "EPK",
}

const SECTION_EDITOR_LINKS: Record<ArtistProfileSectionId, string> = {
  social: "/artist/profile",
  stats: "/artist/business/analytics",
  about: "/artist/profile",
  music: "/artist/music",
  storefront: "/artist/business/store",
  events: "/artist/events",
  services: "/artist/profile",
  memberships: "/artist/profile",
  gallery: "/artist/profile",
  posts: "/create",
  epk: "/artist/epk",
}

const HEADING_OPTIONS = ["display", "editorial", "grotesk", "condensed", "mono"] as const
const BODY_OPTIONS = ["sans", "serif", "mono"] as const
const CORNER_OPTIONS = ["square", "soft", "round"] as const
const DENSITY_OPTIONS = ["compact", "comfortable", "spacious"] as const
const TEXTURE_OPTIONS = ["none", "grain", "paper", "halftone", "metal"] as const

function stableAppearance(value: ArtistProfileAppearance | null) {
  return value ? JSON.stringify(normalizeArtistProfileAppearance(value)) : ""
}

export function ArtistProfileThemeStudio() {
  const { actingHeaders } = useActingContext()
  const [tab, setTab] = useState<StudioTab>("templates")
  const [previewMode, setPreviewMode] = useState<PreviewMode>("desktop")
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saving, setSaving] = useState<"draft" | "publish" | "discard" | "restore" | null>(null)
  const [appearance, setAppearance] = useState<ArtistProfileAppearance | null>(null)
  const [baseline, setBaseline] = useState<ArtistProfileAppearance | null>(null)
  const [design, setDesign] = useState<ArtistProfileDesignState | null>(null)
  const [previewProfile, setPreviewProfile] = useState<PreviewProfile | null>(null)

  const isDirty = useMemo(
    () => stableAppearance(appearance) !== stableAppearance(baseline),
    [appearance, baseline]
  )
  const contrastErrors = useMemo(
    () => (appearance ? validateArtistProfileContrast(appearance) : []),
    [appearance]
  )

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setLoadError(null)
      const response = await fetch("/api/artist/public-appearance", {
        credentials: "include",
        cache: "no-store",
        headers: { ...actingHeaders },
      })
      const body = (await response.json().catch(() => null)) as AppearanceResponse | null
      if (!response.ok || !body?.success) throw new Error("Could not load Profile Studio")

      const next = normalizeArtistProfileAppearance(
        body.profileDesign.draft ?? body.profileDesign.published ?? body.seedAppearance
      )
      setAppearance(next)
      setBaseline(next)
      setDesign(body.profileDesign)
      setPreviewProfile(body.previewProfile)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not load Profile Studio"
      setLoadError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }, [actingHeaders])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!isDirty) return
      event.preventDefault()
      event.returnValue = ""
    }
    window.addEventListener("beforeunload", beforeUnload)
    return () => window.removeEventListener("beforeunload", beforeUnload)
  }, [isDirty])

  useEffect(() => {
    if (!isDirty) return
    const protectInAppNavigation = (event: MouseEvent) => {
      const target = event.target
      if (!(target instanceof Element)) return
      const anchor = target.closest<HTMLAnchorElement>("a[href]")
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return
      if (window.confirm("Leave Profile Studio and discard your unsaved changes?")) return
      event.preventDefault()
      event.stopPropagation()
    }
    document.addEventListener("click", protectInAppNavigation, true)
    return () => document.removeEventListener("click", protectInAppNavigation, true)
  }, [isDirty])

  async function mutate(
    action: "save_draft" | "publish" | "discard_draft" | "restore_published"
  ) {
    if (!appearance) return
    if (action === "publish" && contrastErrors.length) {
      toast.error("Fix the color contrast warnings before publishing.")
      setTab("style")
      return
    }

    const state =
      action === "save_draft"
        ? "draft"
        : action === "publish"
          ? "publish"
          : action === "discard_draft"
            ? "discard"
            : "restore"
    try {
      setSaving(state)
      const response = await fetch("/api/artist/public-appearance", {
        method: "PUT",
        credentials: "include",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          ...actingHeaders,
        },
        body: JSON.stringify({ action, appearance }),
      })
      const body = await response.json().catch(() => ({}))
      if (!response.ok || !body.success) {
        throw new Error(body.message || "Could not update profile design")
      }

      const nextDesign = body.profileDesign as ArtistProfileDesignState
      if (action === "discard_draft" || action === "restore_published") {
        await load()
        toast.success(
          action === "discard_draft" ? "Draft changes discarded" : "Published design restored"
        )
        return
      }
      const nextAppearance = normalizeArtistProfileAppearance(
        nextDesign.draft ?? nextDesign.published ?? appearance
      )
      setDesign(nextDesign)
      setAppearance(nextAppearance)
      setBaseline(nextAppearance)
      toast.success(
        action === "publish"
          ? "Theme published to your public profile"
          : "Private draft saved"
      )
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update profile design")
    } finally {
      setSaving(null)
    }
  }

  function patch(partial: Partial<ArtistProfileAppearance>) {
    setAppearance((current) =>
      current ? normalizeArtistProfileAppearance({ ...current, ...partial }) : current
    )
  }

  function moveSection(section: ArtistProfileSectionId, direction: -1 | 1) {
    if (!appearance) return
    const next = [...appearance.sectionOrder]
    const index = next.indexOf(section)
    const target = index + direction
    if (index < 0 || target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    patch({ sectionOrder: next })
  }

  if (loadError && !loading) {
    return (
      <div className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-rose-300/20 bg-rose-400/5 px-6 text-center">
        <p className="text-sm font-medium text-rose-100">Profile Studio could not be loaded.</p>
        <p className="mt-1 text-xs text-white/55">{loadError}</p>
        <Button className="mt-4" variant="secondary" onClick={() => void load()}>
          Try again
        </Button>
      </div>
    )
  }

  if (loading || !appearance || !previewProfile) {
    return (
      <div className="flex min-h-72 items-center justify-center rounded-2xl border border-white/10 bg-black/20">
        <Loader2 className="mr-2 h-5 w-5 animate-spin text-purple-300" />
        <span className="text-sm text-white/65">Loading Profile Studio…</span>
      </div>
    )
  }

  const template = ARTIST_PROFILE_TEMPLATE_MAP[appearance.templateId]
  const publicHref = previewProfile.username
    ? `/artist/${encodeURIComponent(previewProfile.username)}`
    : null

  return (
    <div className="space-y-5">
      <Card className="overflow-hidden border-purple-400/20 bg-gradient-to-br from-purple-500/10 via-black/20 to-cyan-400/5">
        <CardHeader className="gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge className="border-purple-300/25 bg-purple-400/15 text-purple-100">
                <Sparkles className="mr-1 h-3 w-3" />
                Profile Studio
              </Badge>
              <Badge
                className={
                  design?.published
                    ? "border-emerald-300/25 bg-emerald-400/15 text-emerald-100"
                    : "border-white/15 bg-white/5 text-white/65"
                }
              >
                {design?.published ? "Published design active" : "Current public look preserved"}
              </Badge>
              {isDirty ? (
                <Badge className="border-amber-300/25 bg-amber-400/15 text-amber-100">
                  Unsaved changes
                </Badge>
              ) : design?.draft ? (
                <Badge className="border-cyan-300/25 bg-cyan-400/15 text-cyan-100">
                  Private draft saved
                </Badge>
              ) : null}
            </div>
            <CardTitle className="text-2xl text-white">Design your full public profile</CardTitle>
            <CardDescription className="mt-1 max-w-2xl text-white/60">
              Choose a complete visual system, tune its palette, and decide how your real profile
              sections flow. Drafts stay private until you publish.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            {publicHref ? (
              <Button asChild variant="outline" className="border-white/15 text-white">
                <Link href={publicHref} target="_blank">
                  <Eye className="mr-2 h-4 w-4" />
                  View public page
                </Link>
              </Button>
            ) : null}
            <Button
              variant="outline"
              className="border-white/15 text-white"
              disabled={Boolean(saving) || !design?.published}
              onClick={() => void mutate("restore_published")}
            >
              {saving === "restore" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RotateCcw className="mr-2 h-4 w-4" />}
              Restore published
            </Button>
            <Button
              variant="secondary"
              disabled={Boolean(saving) || (!isDirty && Boolean(design?.draft))}
              onClick={() => void mutate("save_draft")}
            >
              {saving === "draft" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save draft
            </Button>
            <Button
              className="bg-emerald-500 text-black hover:bg-emerald-400"
              disabled={Boolean(saving) || contrastErrors.length > 0}
              onClick={() => void mutate("publish")}
            >
              {saving === "publish" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              Publish
            </Button>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[minmax(330px,0.78fr)_minmax(0,1.22fr)]">
        <Card className="border-white/10 bg-black/20">
          <CardHeader className="pb-3">
            <div className="grid grid-cols-3 gap-1 rounded-xl border border-white/10 bg-black/30 p-1">
              {([
                ["templates", "Templates"],
                ["style", "Palette & style"],
                ["sections", "Sections"],
              ] as const).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  className={cn(
                    "rounded-lg px-2 py-2 text-xs font-medium transition",
                    tab === id ? "bg-white text-black" : "text-white/60 hover:bg-white/10 hover:text-white"
                  )}
                  onClick={() => setTab(id)}
                >
                  {label}
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="max-h-[72vh] space-y-4 overflow-y-auto pb-6">
            {tab === "templates" ? (
              <div className="space-y-3">
                {ARTIST_PROFILE_TEMPLATES.map((item) => {
                  const selected = appearance.templateId === item.id
                  return (
                    <button
                      key={item.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setAppearance(applyArtistProfileTemplatePreset(item.id, appearance))}
                      className={cn(
                        "w-full overflow-hidden rounded-2xl border-2 text-left transition",
                        selected
                          ? "border-purple-400 bg-purple-400/10"
                          : "border-white/10 bg-white/[0.03] hover:border-white/25"
                      )}
                    >
                      <div className="relative aspect-[16/8] overflow-hidden bg-black">
                        <Image
                          src={item.previewImage}
                          alt={`${item.name} profile preview`}
                          fill
                          sizes="(max-width: 1280px) 100vw, 360px"
                          className="object-cover"
                        />
                        {selected ? (
                          <span className="absolute right-2 top-2 rounded-full bg-purple-500 px-2 py-1 text-[10px] font-semibold text-white">
                            <Check className="mr-1 inline h-3 w-3" />
                            Selected
                          </span>
                        ) : null}
                      </div>
                      <span className="block p-3">
                        <strong className="block text-sm text-white">{item.name}</strong>
                        <small className="mt-1 block text-xs leading-relaxed text-white/55">
                          {item.description}
                        </small>
                      </span>
                    </button>
                  )
                })}
              </div>
            ) : null}

            {tab === "style" ? (
              <div className="space-y-6">
                <fieldset className="space-y-3">
                  <legend className="text-sm font-semibold text-white">Curated palettes</legend>
                  <div className="grid grid-cols-2 gap-2">
                    {getArtistProfilePalettePresets(appearance.templateId).map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-left hover:border-white/25"
                        onClick={() => patch(preset.colors)}
                      >
                        <span className="mb-2 flex h-7 overflow-hidden rounded-lg">
                          {Object.values(preset.colors)
                            .slice(0, 4)
                            .map((color, index) => (
                              <i key={`${color}-${index}`} className="flex-1" style={{ backgroundColor: color }} />
                            ))}
                        </span>
                        <span className="text-xs font-medium text-white">{preset.name}</span>
                      </button>
                    ))}
                  </div>
                </fieldset>

                <fieldset className="space-y-3">
                  <legend className="text-sm font-semibold text-white">Custom colors</legend>
                  <div className="grid grid-cols-2 gap-3">
                    {([
                      ["accentColor", "Accent"],
                      ["secondaryColor", "Secondary"],
                      ["backgroundColor", "Background"],
                      ["surfaceColor", "Surface"],
                      ["textColor", "Text"],
                      ["mutedTextColor", "Muted text"],
                    ] as const).map(([key, label]) => (
                      <label key={key} className="rounded-xl border border-white/10 bg-black/20 p-2">
                        <span className="mb-1 block text-[10px] uppercase tracking-wide text-white/45">{label}</span>
                        <span className="flex items-center gap-2">
                          <input
                            type="color"
                            value={appearance[key]}
                            onChange={(event) => patch({ [key]: event.target.value })}
                            className="h-8 w-10 cursor-pointer rounded border-0 bg-transparent"
                          />
                          <Input
                            key={`${key}-${appearance[key]}`}
                            defaultValue={appearance[key]}
                            onBlur={(event) => {
                              const value = event.currentTarget.value.trim()
                              if (/^#[0-9a-f]{6}$/i.test(value)) patch({ [key]: value })
                              else event.currentTarget.value = appearance[key]
                            }}
                            className="h-8 border-white/10 bg-white/5 px-2 font-mono text-xs"
                            aria-label={`${label} hex color`}
                          />
                        </span>
                      </label>
                    ))}
                  </div>
                  {contrastErrors.length ? (
                    <div className="rounded-xl border border-amber-300/25 bg-amber-400/10 p-3">
                      <p className="text-xs font-medium text-amber-100">Publishing is paused for accessibility.</p>
                      <ul className="mt-1 list-disc space-y-1 pl-4 text-xs text-amber-100/75">
                        {contrastErrors.map((error) => <li key={error}>{error}</li>)}
                      </ul>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="mt-3"
                        onClick={() => patch(suggestAccessibleArtistProfileColors(appearance))}
                      >
                        Apply accessible text colors
                      </Button>
                    </div>
                  ) : null}
                </fieldset>

                <fieldset className="grid gap-3 sm:grid-cols-2">
                  <legend className="col-span-full text-sm font-semibold text-white">Typography and shape</legend>
                  <StudioSelect label="Heading" value={appearance.headingFont} options={HEADING_OPTIONS} onChange={(value) => patch({ headingFont: value })} />
                  <StudioSelect label="Body" value={appearance.bodyFont} options={BODY_OPTIONS} onChange={(value) => patch({ bodyFont: value })} />
                  <StudioSelect label="Corners" value={appearance.cornerStyle} options={CORNER_OPTIONS} onChange={(value) => patch({ cornerStyle: value })} />
                  <StudioSelect label="Spacing" value={appearance.density} options={DENSITY_OPTIONS} onChange={(value) => patch({ density: value })} />
                  <StudioSelect label="Texture" value={appearance.texture} options={TEXTURE_OPTIONS} onChange={(value) => patch({ texture: value })} />
                </fieldset>

                <fieldset className="space-y-4">
                  <legend className="text-sm font-semibold text-white">Hero image</legend>
                  <StudioRange label="Overlay" value={appearance.heroOverlayOpacity * 100} onChange={(value) => patch({ heroOverlayOpacity: value / 100 })} />
                  <StudioRange label="Horizontal focus" value={appearance.heroFocalPoint.x} onChange={(x) => patch({ heroFocalPoint: { ...appearance.heroFocalPoint, x } })} />
                  <StudioRange label="Vertical focus" value={appearance.heroFocalPoint.y} onChange={(y) => patch({ heroFocalPoint: { ...appearance.heroFocalPoint, y } })} />
                  <StudioToggle label="Show cover image" checked={appearance.showCoverImage} onChange={(showCoverImage) => patch({ showCoverImage })} />
                  <StudioToggle label="Show profile photo" checked={appearance.showAvatar} onChange={(showAvatar) => patch({ showAvatar })} />
                  <StudioToggle label="Show verified badge" checked={appearance.showVerifiedBadge} onChange={(showVerifiedBadge) => patch({ showVerifiedBadge })} />
                </fieldset>
              </div>
            ) : null}

            {tab === "sections" ? (
              <div className="space-y-3">
                <p className="text-xs leading-relaxed text-white/55">
                  The hero always stays visible. Feed, profile rail, and showcase sections each keep
                  their own zone; your order is applied within those zones. Hiding content never deletes it.
                </p>
                <ol className="space-y-2">
                  {appearance.sectionOrder.map((section, index) => (
                    <li key={section} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                      <span className="min-w-0 flex-1">
                        <strong className="block truncate text-sm text-white">{SECTION_LABELS[section]}</strong>
                        <Link href={SECTION_EDITOR_LINKS[section]} className="text-[11px] text-purple-300 hover:underline">
                          Manage content
                        </Link>
                      </span>
                      <Switch
                        checked={appearance.sectionVisibility[section]}
                        onCheckedChange={(checked) =>
                          patch({
                            sectionVisibility: {
                              ...appearance.sectionVisibility,
                              [section]: checked,
                            },
                          })
                        }
                        aria-label={`Show ${SECTION_LABELS[section]}`}
                      />
                      <span className="flex">
                        <Button
                          size="icon"
                          variant="ghost"
                          disabled={index === 0}
                          aria-label={`Move ${SECTION_LABELS[section]} up`}
                          onClick={() => moveSection(section, -1)}
                        >
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          disabled={index === appearance.sectionOrder.length - 1}
                          aria-label={`Move ${SECTION_LABELS[section]} down`}
                          onClick={() => moveSection(section, 1)}
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                      </span>
                    </li>
                  ))}
                </ol>
                <Button
                  variant="outline"
                  className="w-full border-white/15 text-white"
                  onClick={() => patch({ sectionOrder: [...ARTIST_PROFILE_SECTION_IDS] })}
                >
                  Reset section order
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <div className="space-y-3 xl:sticky xl:top-4 xl:self-start">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-medium text-white">Live private preview</p>
              <p className="text-xs text-white/45">{template.name} · real profile identity</p>
            </div>
            <div className="flex rounded-xl border border-white/10 bg-black/20 p-1">
              <Button
                size="sm"
                variant={previewMode === "desktop" ? "secondary" : "ghost"}
                onClick={() => setPreviewMode("desktop")}
                aria-pressed={previewMode === "desktop"}
              >
                <Monitor className="mr-2 h-4 w-4" />
                Desktop
              </Button>
              <Button
                size="sm"
                variant={previewMode === "mobile" ? "secondary" : "ghost"}
                onClick={() => setPreviewMode("mobile")}
                aria-pressed={previewMode === "mobile"}
              >
                <Smartphone className="mr-2 h-4 w-4" />
                Mobile
              </Button>
            </div>
          </div>
          <div
            className={cn(
              "mx-auto overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl transition-[max-width] duration-300",
              previewMode === "mobile" ? "max-w-[390px]" : "max-w-full"
            )}
          >
            <ArtistThemePreview appearance={appearance} profile={previewProfile} />
          </div>
          <div className="flex justify-end">
            <Button
              variant="ghost"
              disabled={Boolean(saving) || !design?.draft}
              onClick={() => void mutate("discard_draft")}
              className="text-white/55 hover:text-white"
            >
              {saving === "discard" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RotateCcw className="mr-2 h-4 w-4" />}
              Discard saved draft
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function StudioSelect<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: readonly T[]
  onChange: (value: T) => void
}) {
  return (
    <div>
      <Label className="mb-1.5 block text-xs text-white/55">{label}</Label>
      <Select value={value} onValueChange={(next) => onChange(next as T)}>
        <SelectTrigger className="border-white/10 bg-white/5 capitalize">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option} value={option} className="capitalize">
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

function StudioRange({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (value: number) => void
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-xs text-white/55">
        <Label>{label}</Label>
        <output>{Math.round(value)}%</output>
      </div>
      <Slider value={[value]} min={0} max={100} step={1} onValueChange={([next]) => onChange(next ?? value)} />
    </div>
  )
}

function StudioToggle({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <Label className="text-xs text-white/70">{label}</Label>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  )
}

function ArtistThemePreview({
  appearance,
  profile,
}: {
  appearance: ArtistProfileAppearance
  profile: PreviewProfile
}) {
  const visibleSections = appearance.sectionOrder.filter((id) => appearance.sectionVisibility[id])
  const railSections = visibleSections.filter((id) => ["social", "stats", "about", "services", "memberships"].includes(id))
  const showcaseSections = visibleSections.filter((id) => ["music", "storefront", "events", "gallery", "epk"].includes(id))
  const showFeed = visibleSections.includes("posts")
  const previewSection = (section: ArtistProfileSectionId) => (
    <section key={section} className={themeStyles.previewSection}>
      <span>{SECTION_LABELS[section]}</span>
      <h3>{section === "about" && profile.bio ? profile.bio : `Your ${SECTION_LABELS[section].toLowerCase()} content`}</h3>
    </section>
  )
  return (
    <div
      className={cn(
        themeStyles.root,
        themeStyles[appearance.templateId.replaceAll("-", "_")],
        themeStyles[`texture_${appearance.texture}`]
      )}
      style={artistProfileAppearanceStyle(appearance)}
      data-artist-profile-theme={appearance.templateId}
    >
      <header className={themeStyles.previewHero}>
        {appearance.showCoverImage && profile.coverUrl ? (
          <Image
            src={profile.coverUrl}
            alt=""
            fill
            sizes="(max-width: 500px) 390px, 900px"
            className={themeStyles.previewCover}
            style={{ objectPosition: `${appearance.heroFocalPoint.x}% ${appearance.heroFocalPoint.y}%` }}
          />
        ) : null}
        <div className={themeStyles.previewOverlay} />
        <div className={themeStyles.previewIdentity}>
          {appearance.showAvatar ? (
            <div className={themeStyles.previewAvatar}>
              {profile.avatarUrl ? (
                <Image src={profile.avatarUrl} alt="" fill sizes="96px" className="object-cover" />
              ) : (
                <span>{profile.artistName.slice(0, 1).toUpperCase()}</span>
              )}
            </div>
          ) : null}
          <div>
            <p className={themeStyles.previewKicker}>{profile.genres[0] || "Artist"}</p>
            <h2>{profile.artistName}</h2>
            <p>{[profile.genres.slice(0, 2).join(" · "), profile.location].filter(Boolean).join(" · ")}</p>
          </div>
        </div>
      </header>
      <main className={themeStyles.previewZonedLayout}>
        {showFeed ? (
          <div className={themeStyles.previewFeed}>
            <p className={themeStyles.previewZoneLabel}>Artist feed</p>
            <article className={themeStyles.previewPost}>
              <div className={themeStyles.previewPostHeader}><span>{profile.artistName.slice(0, 1)}</span><strong>{profile.artistName}</strong></div>
              <p>A styled post appears here with authored media, typography, and engagement controls.</p>
              <div className={themeStyles.previewPostMedia} />
            </article>
            <article className={themeStyles.previewPost}><strong>Latest update</strong><p>Standard posts inherit this profile theme.</p></article>
          </div>
        ) : null}
        <aside className={themeStyles.previewRail}>
          <p className={themeStyles.previewZoneLabel}>Profile</p>
          {railSections.map(previewSection)}
        </aside>
        <div className={themeStyles.previewShowcase}>
          <p className={themeStyles.previewZoneLabel}>Showcase</p>
          {showcaseSections.map(previewSection)}
        </div>
      </main>
    </div>
  )
}
