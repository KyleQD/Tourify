"use client"

import React, { useState } from "react"
import type { EPKData } from "@/lib/services/epk.service"
import {
  accentFromEditorTemplate,
  displayOrPlaceholder,
  formatEpkNumber,
  isSectionVisible,
  normalizeEpkLayout,
  placeholderTone,
  placeholderToneLight,
  shouldRenderStandaloneStats,
  statsBelongInHero,
} from "@/lib/epk/epk-preview-utils"
import { getSocialIcon } from "@/components/epk/epk-preview-icons"
import { cn } from "@/lib/utils"
import { formatSafeDate } from "@/lib/events/admin-event-normalization"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { TourifyLogo } from "@/components/tourify-logo"
import {
  ArrowUpRight,
  Calendar,
  Clock3,
  Disc3,
  Download,
  FileText,
  Globe,
  Headphones,
  Image as ImageIcon,
  Link2,
  Mail,
  MapPin,
  Music,
  Newspaper,
  Play,
  Quote,
  Radio,
  Share2,
  Sparkles,
  Ticket,
  Users,
} from "lucide-react"
import { type EpkSkinId, type EpkSkinTokens } from "@/lib/epk/epk-skin-tokens"
import {
  getDefaultEpkAppearance,
  resolveEpkAppearanceForRender,
  type ResolvedEpkAppearance,
} from "@/lib/epk/epk-appearance"

export interface EpkTemplateProps {
  data: EPKData
  fontClass: string
  showPlaceholder: boolean
  /** Public pages opt into click telemetry; builder/editor previews leave this false. */
  trackingEnabled?: boolean
  /** When set, reused instead of resolving from data.epkAppearance (e.g. builder + overlay). */
  resolvedAppearance?: ResolvedEpkAppearance
}

export interface EpkSectionRenderCtx {
  data: EPKData
  skin: EpkSkinId
  showPlaceholder: boolean
  layout: EPKData["layout"]
  t: EpkSkinTokens
  c: ResolvedEpkAppearance["color"]
  s: ResolvedEpkAppearance["styles"]
  sectionGapClass: string
  heroGapClass: string
  avatarClassName: string
  avatarShapeClass: string
  classicCoverHeightClass: string
  classicCoverOverlayFromClass: string
  accent: ReturnType<typeof accentFromEditorTemplate>
  ph: (v: string, p: string) => string
  empty: (v: string) => boolean
  name: string
  initial: string
  mutedPh: (v: string) => string
  accentRing: string
  minimalAccent: string
  hoveredTrack: string | null
  setHoveredTrack: (id: string | null) => void
  trackingEnabled: boolean
  trackInteraction: (eventType: string, metadata?: Record<string, unknown>) => void
  /** When provided, simple text fields become inline-editable in builder mode. */
  editableField?: (
    field: string,
    value: string,
    placeholder: string,
    opts?: { multiline?: boolean; className?: string },
  ) => React.ReactNode
}

export function createEpkRenderCtx(
  data: EPKData,
  skin: EpkSkinId,
  showPlaceholder: boolean,
  hoveredTrack: string | null,
  setHoveredTrack: (id: string | null) => void,
  editableField?: EpkSectionRenderCtx["editableField"],
  resolvedAppearance?: ResolvedEpkAppearance,
  trackingEnabled = false,
): EpkSectionRenderCtx {
  const resolved =
    resolvedAppearance ??
    resolveEpkAppearanceForRender({
      skin,
      appearance: data.epkAppearance ?? getDefaultEpkAppearance(data.template),
    })
  const t = resolved.mergedTokens
  const c = resolved.color
  const s = resolved.styles
  const layout = normalizeEpkLayout(data.layout)
  const accent = accentFromEditorTemplate(data.template)
  const ph = (v: string, p: string) =>
    displayOrPlaceholder(v, p, showPlaceholder)
  const empty = (v: string) => !v?.trim()
  const name = ph(data.artistName, "Artist name")
  const initial = (data.artistName?.trim()?.[0] || "?").toUpperCase()
  const mutedPh = (v: string) =>
    c.hasCustomText && empty(v) && showPlaceholder
      ? c.placeholderText
      : t.isLightSurface
        ? placeholderToneLight(empty(v))
        : placeholderTone(empty(v))
  const accentRing = c.hasCustomAccent
    ? "ring-[color:var(--epk-accent)] shadow-[0_0_40px_-10px_var(--epk-accent)]"
    : accent === "neon"
      ? "ring-cyan-400/40 shadow-[0_0_40px_-10px_rgba(34,211,238,0.45)]"
      : accent === "sunset"
        ? "ring-orange-400/30 shadow-[0_0_40px_-10px_rgba(251,146,60,0.35)]"
        : "ring-indigo-400/25"
  const minimalAccent = c.hasCustomAccent
    ? cn(c.accentBorder, c.accentText)
    : accent === "black"
      ? "border-emerald-500/40 text-emerald-300/90"
      : accent === "neon"
        ? "border-cyan-400/40 text-cyan-200/90"
      : "border-white/20 text-white/80"
  const trackInteraction = (eventType: string, metadata: Record<string, unknown> = {}) => {
    if (!trackingEnabled || !data.epkSlug) return
    fetch("/api/epk/telemetry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ epkSlug: data.epkSlug, eventType, metadata }),
    }).catch(() => null)
  }

  return {
    data,
    skin,
    showPlaceholder,
    layout,
    t,
    c,
    s,
    sectionGapClass: resolved.sectionGapClass,
    heroGapClass: resolved.heroGapClass,
    avatarClassName: resolved.avatarClassName,
    avatarShapeClass: resolved.avatarShapeClass,
    classicCoverHeightClass: resolved.classicCoverHeightClass,
    classicCoverOverlayFromClass: resolved.classicCoverOverlayFromClass,
    accent,
    ph,
    empty,
    name,
    initial,
    mutedPh,
    accentRing,
    minimalAccent,
    hoveredTrack,
    setHoveredTrack,
    trackingEnabled,
    trackInteraction,
    editableField,
  }
}

function renderStatGrid(ctx: EpkSectionRenderCtx) {
  const { data, skin, t, layout, minimalAccent, c } = ctx
  if (!statsBelongInHero(layout)) return null
  return (
    <div className="grid grid-cols-3 gap-3 pt-2 sm:gap-4">
      {[
        { k: "followers", label: "Followers", v: data.stats.followers },
        {
          k: "monthly",
          label: "Monthly listeners",
          v: data.stats.monthlyListeners,
        },
        { k: "streams", label: "Streams", v: data.stats.totalStreams },
      ].map((s) => (
        <div
          key={s.k}
          className={cn(
            t.statCell,
            skin === "minimal" && minimalAccent,
            c.mutedCardBg,
          )}
          style={ctx.s.statCell}
        >
          <div className={t.statValue} style={ctx.s.accentText}>
            {formatEpkNumber(s.v)}
          </div>
          <div className={t.label} style={ctx.s.label}>
            {s.label}
          </div>
        </div>
      ))}
    </div>
  )
}

function heroNameNode(ctx: EpkSectionRenderCtx) {
  const { data, showPlaceholder, empty, name, editableField, t, c } = ctx
  return (
    editableField?.("artistName", data.artistName, "Artist name") ?? (
      <span
        className={cn(
          empty(data.artistName) &&
            showPlaceholder &&
            (c.hasCustomText
              ? c.placeholderText
              : t.isLightSurface
                ? "italic text-stone-400"
                : "italic opacity-60"),
        )}
      >
        {name}
      </span>
    )
  )
}

const REFERENCE_EPK_SKINS: EpkSkinId[] = [
  "scrapbook",
  "bandcard",
  "dossier",
  "pressgrid",
  "redcolumn",
  "checkerboard",
  "editorial",
  "whitespace",
  "colorblock",
  "sunburst",
]

function isReferenceEpkSkin(skin: EpkSkinId) {
  return REFERENCE_EPK_SKINS.includes(skin)
}

function renderReferenceHero(ctx: EpkSectionRenderCtx): React.ReactNode | null {
  const { data, skin, t, c, s, ph, initial, editableField, heroGapClass } = ctx
  if (!isReferenceEpkSkin(skin)) return null

  const eName = heroNameNode(ctx)
  const eGenre =
    editableField?.("genre", data.genre, "Genre") ?? ph(data.genre, "Genre")
  const eLocation =
    editableField?.("location", data.location, "City, region") ??
    ph(data.location, "City, region")
  const statGrid = renderStatGrid(ctx)
  const imageUrl = data.avatarUrl || data.coverUrl
  const image = (className: string, fallbackClassName: string) =>
    imageUrl ? (
      <img
        src={imageUrl}
        alt={
          data.artistName
            ? `${data.artistName} press image`
            : "Artist press image"
        }
        className={cn(className, c.heroImage)}
      />
    ) : (
      <div
        className={cn("flex items-center justify-center", fallbackClassName)}
      >
        <span className="text-6xl font-black opacity-70">{initial}</span>
      </div>
    )
  const actions = (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" className={t.btnPrimary} style={s.buttonPrimary}>
        <Mail className="mr-2 h-4 w-4" />
        Contact
      </Button>
      <Button
        size="sm"
        variant="outline"
        className={t.btnGhost}
        style={s.buttonGhost}
      >
        <Share2 className="mr-2 h-4 w-4" />
        Share
      </Button>
    </div>
  )

  if (skin === "scrapbook") {
    return (
      <header
        className={cn(
          "relative overflow-hidden bg-[#fbf8f4] shadow-[0_30px_90px_rgba(48,31,24,0.22)]",
          heroGapClass,
        )}
        style={s.heroShell}
      >
        <div className="grid min-h-[26rem] lg:grid-cols-2">
          <div className="relative flex flex-col justify-center overflow-hidden bg-[#f3efeb] p-8 sm:p-12">
            <div className="absolute -left-28 -top-36 h-72 w-72 rounded-full bg-[#d08156]/75" />
            <div className="absolute -bottom-28 -right-20 h-64 w-64 rounded-full bg-[#78978e]/55" />
            <div className="relative space-y-6">
              <h1
                className="max-w-lg font-serif text-5xl font-medium italic leading-[0.95] tracking-[-0.04em] text-[#191512] sm:text-7xl"
                style={s.heading}
              >
                {eName}
              </h1>
              <div className="flex flex-wrap gap-2">
                <Badge className={t.badge} style={s.badge}>
                  {eGenre}
                </Badge>
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 text-sm",
                    t.muted,
                  )}
                  style={s.muted}
                >
                  <MapPin className="h-4 w-4" />
                  {eLocation}
                </span>
              </div>
            </div>
          </div>
          <div className="min-h-[20rem]">
            {image(
              "h-full min-h-[20rem] w-full object-cover",
              "h-full min-h-[20rem] bg-[#78978e] text-white",
            )}
          </div>
        </div>
        <div className="space-y-5 border-t border-[#d9cec6] bg-[#fbf8f4] p-6 sm:p-8">
          {statGrid}
          {actions}
        </div>
      </header>
    )
  }

  if (skin === "bandcard") {
    return (
      <header
        className={cn(
          "overflow-hidden border border-white/15 bg-black",
          heroGapClass,
        )}
        style={s.heroShell}
      >
        <div className="grid lg:grid-cols-[0.95fr_1.35fr]">
          <div className="relative min-h-[18rem] overflow-hidden">
            {image(
              "absolute inset-0 h-full w-full object-cover grayscale",
              "absolute inset-0 bg-[#222] text-[#f5df18]",
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/15" />
          </div>
          <div className="flex flex-col justify-between border-l-0 border-[#f5df18] bg-black p-6 lg:border-l-4 lg:p-9">
            <div>
              <h1
                className="text-5xl font-black uppercase leading-[0.82] tracking-[-0.065em] text-white sm:text-7xl"
                style={s.heading}
              >
                {eName}
              </h1>
            </div>
            <div className="mt-8 space-y-5">
              <div className="flex flex-wrap gap-2">
                <span className={t.badge} style={s.badge}>
                  {eGenre}
                </span>
                <span className={t.badge} style={s.badge}>
                  {eLocation}
                </span>
              </div>
              {statGrid}
              {actions}
            </div>
          </div>
        </div>
      </header>
    )
  }

  if (skin === "dossier") {
    return (
      <header
        className={cn(
          "relative overflow-hidden border border-black/20 bg-[#f7f5f0] p-6 shadow-[12px_14px_0_rgba(0,0,0,0.12)] sm:p-10",
          heroGapClass,
        )}
        style={s.heroShell}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg,transparent,transparent 3px,#000 4px)",
          }}
        />
        <div className="relative mx-auto grid max-w-2xl items-center gap-8">
          <div className="relative border-2 border-black bg-white p-3 shadow-[8px_8px_0_rgba(0,0,0,0.16)]">
            {image(
              "aspect-square w-full object-cover grayscale",
              "aspect-square bg-[#dedbd4] text-black",
            )}
            <div className="mt-4 border-t-2 border-black pt-4 text-center">
              <h1
                className="text-4xl font-black uppercase tracking-[-0.06em] text-black"
                style={s.heading}
              >
                {eName}
              </h1>
              <div className="mt-2 flex flex-wrap justify-center gap-2">
                <Badge className={t.badge} style={s.badge}>
                  {eGenre}
                </Badge>
                <Badge className={t.badge} style={s.badge}>
                  {eLocation}
                </Badge>
              </div>
            </div>
          </div>
        </div>
        <div className="relative mt-8 space-y-5">
          {statGrid}
          <div className="flex justify-center">{actions}</div>
        </div>
      </header>
    )
  }

  if (skin === "pressgrid") {
    return (
      <header
        className={cn("bg-white p-4 sm:p-6", heroGapClass)}
        style={s.heroShell}
      >
        <div className="relative min-h-[18rem] overflow-hidden bg-black">
          {image(
            "absolute inset-0 h-full w-full object-cover",
            "absolute inset-0 bg-[#222] text-white",
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/15 to-transparent" />
          <h1
            className="absolute left-5 top-4 max-w-[80%] text-5xl font-black uppercase leading-[0.85] tracking-[-0.065em] text-white sm:left-8 sm:top-7 sm:text-7xl"
            style={s.heading}
          >
            {eName}
          </h1>
        </div>
        <div className="grid gap-5 border-b border-black/25 py-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="flex flex-wrap gap-2">
            <Badge className={t.badge} style={s.badge}>
              {eGenre}
            </Badge>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 text-sm",
                t.muted,
              )}
              style={s.muted}
            >
              <MapPin className="h-4 w-4" />
              {eLocation}
            </span>
          </div>
          {actions}
        </div>
        {statGrid}
      </header>
    )
  }

  if (skin === "redcolumn") {
    return (
      <header
        className={cn(
          "grid overflow-hidden bg-[#f2f2ef] lg:grid-cols-[0.9fr_1.1fr]",
          heroGapClass,
        )}
        style={s.heroShell}
      >
        <div className="relative min-h-[25rem] bg-[#e11118] p-6">
          {image(
            "absolute inset-x-6 bottom-0 top-6 h-[calc(100%-1.5rem)] w-[calc(100%-3rem)] object-cover grayscale",
            "absolute inset-x-6 bottom-0 top-6 bg-[#c40e14] text-white",
          )}
          <div className="absolute inset-y-0 left-0 w-5 bg-[#e11118]" />
        </div>
        <div className="flex flex-col justify-center bg-[#f2f2ef] p-7 sm:p-10">
          <h1
            className="text-6xl font-black uppercase leading-[0.78] tracking-[-0.075em] text-[#202020] sm:text-8xl"
            style={s.heading}
          >
            {eName}
          </h1>
          <div className="mt-7 flex flex-wrap gap-2">
            <Badge className={t.badge} style={s.badge}>
              {eGenre}
            </Badge>
            <Badge className={t.badge} style={s.badge}>
              {eLocation}
            </Badge>
          </div>
          <div className="mt-7">{statGrid}</div>
          <div className="mt-6">{actions}</div>
        </div>
      </header>
    )
  }

  if (skin === "checkerboard") {
    return (
      <header
        className={cn(
          "overflow-hidden border border-[#8b3dff] bg-black",
          heroGapClass,
        )}
        style={s.heroShell}
      >
        <div className="relative min-h-[22rem] bg-white">
          {image(
            "absolute inset-0 h-full w-full object-cover object-top",
            "absolute inset-0 bg-[#ededed] text-[#8b3dff]",
          )}
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black to-transparent" />
        </div>
        <div
          className="h-8"
          style={{
            backgroundColor: "#8b3dff",
            backgroundImage:
              "linear-gradient(45deg,#050505 25%,transparent 25%),linear-gradient(-45deg,#050505 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#050505 75%),linear-gradient(-45deg,transparent 75%,#050505 75%)",
            backgroundSize: "32px 32px",
            backgroundPosition: "0 0,0 16px,16px -16px,-16px 0",
          }}
        />
        <div className="space-y-6 bg-black p-6 sm:p-8">
          <h1
            className="text-5xl font-black uppercase leading-[0.85] tracking-[-0.06em] text-white sm:text-7xl"
            style={s.heading}
          >
            {eName}
          </h1>
          <div className="flex flex-wrap gap-2">
            <Badge className={t.badge} style={s.badge}>
              {eGenre}
            </Badge>
            <Badge className={t.badge} style={s.badge}>
              {eLocation}
            </Badge>
          </div>
          {statGrid}
          {actions}
        </div>
      </header>
    )
  }

  if (skin === "editorial") {
    return (
      <header
        className={cn("relative overflow-hidden bg-[#171717]", heroGapClass)}
        style={s.heroShell}
      >
        <div className="grid min-h-[32rem] lg:grid-cols-[1.15fr_1fr]">
          <div className="relative bg-[#ff3542]">
            {image(
              "absolute inset-y-0 left-[12%] h-full w-[76%] object-cover grayscale",
              "absolute inset-y-0 left-[12%] w-[76%] bg-[#d72431] text-white",
            )}
          </div>
          <div className="relative flex flex-col justify-center bg-[#171717] p-8 sm:p-12">
            <h1
              className="relative z-10 -ml-0 text-6xl font-semibold uppercase leading-[0.78] tracking-[-0.08em] text-[#ff3542] sm:text-8xl lg:-ml-36 lg:text-9xl"
              style={s.heading}
            >
              {eName}
            </h1>
            <div className="mt-8 flex flex-wrap gap-2">
              <Badge className={t.badge} style={s.badge}>
                {eGenre}
              </Badge>
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 text-sm",
                  t.muted,
                )}
                style={s.muted}
              >
                <MapPin className="h-4 w-4" />
                {eLocation}
              </span>
            </div>
            <div className="mt-8">{statGrid}</div>
            <div className="mt-6">{actions}</div>
          </div>
        </div>
      </header>
    )
  }

  if (skin === "whitespace") {
    return (
      <header className={cn("bg-white", heroGapClass)} style={s.heroShell}>
        <div className="relative min-h-[27rem] overflow-hidden">
          {image(
            "absolute inset-0 h-full w-full object-cover",
            "absolute inset-0 bg-[#f2f2f2] text-[#2aa9c8]",
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent" />
          <h1
            className="absolute bottom-5 left-5 max-w-[90%] text-6xl font-semibold lowercase leading-none tracking-[-0.07em] text-white drop-shadow-lg sm:bottom-8 sm:left-8 sm:text-8xl"
            style={s.heading}
          >
            {eName}
          </h1>
        </div>
        <div className="grid gap-6 border-b border-black/15 px-5 py-7 sm:px-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="flex flex-wrap gap-3">
            <span className={t.badge} style={s.badge}>
              {eGenre}
            </span>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 text-sm",
                t.muted,
              )}
              style={s.muted}
            >
              <MapPin className="h-4 w-4" />
              {eLocation}
            </span>
          </div>
          {actions}
        </div>
        <div className="px-5 pb-7 sm:px-8">{statGrid}</div>
      </header>
    )
  }

  if (skin === "colorblock") {
    return (
      <header
        className={cn("overflow-hidden bg-[#ef2d2d] p-6 sm:p-10", heroGapClass)}
        style={s.heroShell}
      >
        <h1
          className="text-6xl font-extralight leading-[0.82] tracking-[-0.08em] text-white sm:text-8xl"
          style={s.heading}
        >
          {eName}
        </h1>
        <div className="mt-10 grid items-center gap-8 lg:grid-cols-[18rem_1fr]">
          {image(
            "aspect-square w-full object-cover grayscale",
            "aspect-square bg-white/15 text-black",
          )}
          <div className="space-y-7">
            <div className="flex flex-wrap gap-2">
              <Badge className={t.badge} style={s.badge}>
                {eGenre}
              </Badge>
              <Badge className={t.badge} style={s.badge}>
                {eLocation}
              </Badge>
            </div>
            {statGrid}
            {actions}
          </div>
        </div>
      </header>
    )
  }

  return (
    <header
      className={cn("overflow-hidden bg-[#f6c743] p-6 sm:p-9", heroGapClass)}
      style={s.heroShell}
    >
      <div className="grid gap-7 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
        {image(
          "min-h-[24rem] w-full object-cover",
          "min-h-[24rem] bg-[#d02d20] text-[#ffd85e]",
        )}
        <div>
          <h1
            className="text-6xl font-black leading-[0.82] tracking-[-0.07em] text-[#d02d20] sm:text-8xl"
            style={s.heading}
          >
            {eName}
          </h1>
          <div className="mt-6 flex flex-wrap gap-2">
            <Badge className={t.badge} style={s.badge}>
              {eGenre}
            </Badge>
            <Badge className={t.badge} style={s.badge}>
              {eLocation}
            </Badge>
          </div>
          <div className="mt-7">{statGrid}</div>
          <div className="mt-6">{actions}</div>
        </div>
      </div>
    </header>
  )
}

function renderHero(ctx: EpkSectionRenderCtx): React.ReactNode {
  const {
    data,
    skin,
    t,
    c,
    s,
    accent,
    ph,
    initial,
    accentRing,
    minimalAccent,
    editableField,
    heroGapClass,
    avatarClassName,
    avatarShapeClass,
    classicCoverHeightClass,
    classicCoverOverlayFromClass,
  } = ctx
  const av = cn(avatarClassName, avatarShapeClass)
  const statGrid = renderStatGrid(ctx)
  const eName = heroNameNode(ctx)
  const eGenre =
    editableField?.("genre", data.genre, "Genre") ?? ph(data.genre, "Genre")
  const eLocation =
    editableField?.("location", data.location, "City, region") ??
    ph(data.location, "City, region")
  const hasCustomAccent = c.hasCustomAccent
  const accentBorder = c.accentBorder
  const accentBg = c.accentBg
  const customText = c.text
  const customSubtext = c.subtext
  const referenceHero = renderReferenceHero(ctx)

  if (referenceHero) return referenceHero

  if (skin === "classic") {
    return (
      <header key="hero" className={heroGapClass}>
        <div
          className={cn(
            "relative -mx-4 overflow-hidden rounded-xl sm:mx-0",
            classicCoverHeightClass,
          )}
        >
          {data.coverUrl ? (
            <img
              src={data.coverUrl}
              alt=""
              className={cn("h-full w-full object-cover", c.heroImage)}
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-amber-200/50 to-rose-200/40" />
          )}
          <div
            className={cn(
              "absolute inset-0 bg-gradient-to-t to-transparent",
              classicCoverOverlayFromClass,
            )}
          />
        </div>
        <div
          className={cn("relative z-10 -mt-14 mx-auto max-w-4xl", t.card)}
          style={s.heroShell}
        >
          <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:items-end sm:text-left">
            <Avatar
              className={cn(
                "border-4 border-white shadow-lg",
                accentBorder,
                av,
              )}
              style={s.avatarRing}
            >
              <AvatarImage
                src={data.avatarUrl}
                className={cn("object-cover", c.heroImage)}
              />
              <AvatarFallback
                className={cn(
                  "bg-amber-800 text-2xl text-white",
                  accentBg,
                  customText,
                  avatarShapeClass,
                )}
                style={s.decorativeAccent}
              >
                {initial}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1 space-y-3">
              <h1
                className={cn(
                  "font-serif text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl",
                  customText,
                )}
                style={s.heading}
              >
                {eName}
              </h1>
              <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <Badge className={t.badge} style={s.badge}>
                  {eGenre}
                </Badge>
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 text-sm text-stone-600",
                    customSubtext,
                  )}
                  style={s.muted}
                >
                  <MapPin className="h-4 w-4 shrink-0" />
                  {eLocation}
                </span>
              </div>
              {statGrid}
              <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
                <Button
                  size="sm"
                  className={t.btnPrimary}
                  style={s.buttonPrimary}
                >
                  <Mail className="mr-2 h-4 w-4" />
                  Contact
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className={t.btnGhost}
                  style={s.buttonGhost}
                >
                  <Share2 className="mr-2 h-4 w-4" />
                  Share
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>
    )
  }

  if (skin === "minimal") {
    return (
      <header
        key="hero"
        className={cn("px-4 py-10 text-center", heroGapClass, minimalAccent)}
        style={s.heroShell}
      >
        <div className="mx-auto max-w-xl space-y-6">
          <div className="relative mx-auto w-fit">
            <div
              className={cn(
                "absolute inset-0 scale-110 border border-white/10",
                accentBorder,
                avatarShapeClass,
              )}
              style={s.avatarRing}
            />
            <Avatar
              className={cn(
                "relative border border-white/20",
                accentBorder,
                av,
              )}
              style={s.avatarRing}
            >
              <AvatarImage
                src={data.avatarUrl}
                className={cn("object-cover", c.heroImage)}
              />
              <AvatarFallback
                className={cn(
                  "bg-transparent text-2xl text-white",
                  customText,
                  avatarShapeClass,
                )}
                style={s.body}
              >
                {initial}
              </AvatarFallback>
            </Avatar>
          </div>
          <h1
            className={cn(
              "text-4xl font-light tracking-tight sm:text-5xl",
              customText,
            )}
            style={s.heading}
          >
            {eName}
          </h1>
          <p
            className={cn(
              "text-sm font-light uppercase tracking-[0.35em] text-white/55",
              customSubtext,
            )}
            style={s.muted}
          >
            {eGenre}
          </p>
          <p
            className={cn("text-sm text-white/45", customSubtext)}
            style={s.muted}
          >
            {eLocation}
          </p>
          {statGrid}
          <div className="flex justify-center gap-3">
            <Button size="sm" className={t.btnPrimary} style={s.buttonPrimary}>
              <Mail className="mr-2 h-4 w-4" />
              Contact
            </Button>
            <Button size="sm" className={t.btnGhost} style={s.buttonGhost}>
              <Share2 className="mr-2 h-4 w-4" />
              Share
            </Button>
          </div>
        </div>
      </header>
    )
  }

  if (skin === "bold") {
    return (
      <header
        key="hero"
        className={cn(
          "border-4 border-[#facc15] bg-zinc-950 px-4 py-8 text-center sm:px-8",
          accentBorder,
          heroGapClass,
        )}
        style={s.heroShell}
      >
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-6">
          <div className="relative">
            <div
              className={cn(
                "absolute -inset-1 rotate-3 border-2 border-[#facc15]",
                accentBorder,
                avatarShapeClass,
              )}
              style={s.avatarRing}
            />
            <Avatar
              className={cn("relative border-2 border-white", accentBorder, av)}
              style={s.avatarRing}
            >
              <AvatarImage
                src={data.avatarUrl}
                className={cn("object-cover", c.heroImage)}
              />
              <AvatarFallback
                className={cn(
                  "bg-zinc-900 text-3xl font-black text-[#facc15]",
                  t.accentIcon,
                  avatarShapeClass,
                )}
                style={s.decorativeAccent}
              >
                {initial}
              </AvatarFallback>
            </Avatar>
          </div>
          <h1
            className={cn(
              "text-5xl font-black uppercase leading-none tracking-tight text-[#facc15] sm:text-6xl",
              t.accentIcon,
              customText,
            )}
            style={s.heading}
          >
            {eName}
          </h1>
          <div className="flex flex-wrap justify-center gap-2">
            <span className={t.badge} style={s.badge}>
              {eGenre}
            </span>
            <span className={t.badge} style={s.badge}>
              {eLocation}
            </span>
          </div>
          {statGrid}
          <div className="flex flex-wrap justify-center gap-3">
            <Button size="sm" className={t.btnPrimary} style={s.buttonPrimary}>
              <Mail className="mr-2 h-4 w-4" />
              Contact
            </Button>
            <Button size="sm" className={t.btnGhost} style={s.buttonGhost}>
              <Share2 className="mr-2 h-4 w-4" />
              Share
            </Button>
          </div>
        </div>
      </header>
    )
  }

  if (skin === "cinema") {
    return (
      <header key="hero" className={heroGapClass}>
        <div className="relative -mx-4 overflow-hidden sm:mx-0">
          <div className={cn("w-full", classicCoverHeightClass)}>
            {data.coverUrl ? (
              <img
                src={data.coverUrl}
                alt=""
                className={cn(
                  "h-full w-full object-cover opacity-70",
                  c.heroImage,
                )}
              />
            ) : (
              <div className="h-full w-full bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0c0c0e] via-[#0c0c0e]/40 to-transparent" />
            <div className="absolute inset-x-0 top-0 h-3 bg-black" />
            <div className="absolute inset-x-0 bottom-0 h-3 bg-black" />
          </div>
        </div>
        <div className="relative z-10 -mt-16 flex flex-col items-center gap-5 px-4 text-center">
          <div className="relative">
            <div
              className={cn(
                "absolute -inset-2 border border-zinc-500/50",
                accentBorder,
                avatarShapeClass,
              )}
              style={s.avatarRing}
            />
            <div
              className={cn(
                "absolute -inset-3 border border-zinc-700/40",
                accentBorder,
                avatarShapeClass,
              )}
              style={s.avatarRing}
            />
            <Avatar
              className={cn(
                "relative border border-zinc-400/40",
                accentBorder,
                av,
              )}
              style={s.avatarRing}
            >
              <AvatarImage
                src={data.avatarUrl}
                className={cn("object-cover", c.heroImage)}
              />
              <AvatarFallback
                className={cn(
                  "bg-zinc-900 text-2xl text-zinc-300",
                  accentBg,
                  customText,
                  avatarShapeClass,
                )}
                style={s.decorativeAccent}
              >
                {initial}
              </AvatarFallback>
            </Avatar>
          </div>
          <h1
            className={cn(
              "text-3xl font-light uppercase tracking-[0.35em] text-zinc-100 sm:text-4xl",
              customText,
            )}
            style={s.heading}
          >
            {eName}
          </h1>
          <div
            className={cn(
              "flex flex-wrap items-center justify-center gap-3 text-xs uppercase tracking-[0.25em] text-zinc-400",
              customSubtext,
            )}
            style={s.muted}
          >
            <span>{eGenre}</span>
            <span className="text-zinc-600">·</span>
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              {eLocation}
            </span>
          </div>
          {statGrid}
          <div className="flex flex-wrap justify-center gap-2">
            <Button size="sm" className={t.btnPrimary} style={s.buttonPrimary}>
              <Mail className="mr-2 h-4 w-4" />
              Contact
            </Button>
            <Button
              size="sm"
              variant="outline"
              className={t.btnGhost}
              style={s.buttonGhost}
            >
              <Share2 className="mr-2 h-4 w-4" />
              Share
            </Button>
          </div>
        </div>
      </header>
    )
  }

  if (skin === "gallery") {
    return (
      <header key="hero" className={cn("max-w-3xl", heroGapClass)}>
        <div className="space-y-8">
          <div className="flex items-start gap-6">
            <Avatar
              className={cn(
                "shrink-0 border border-neutral-300",
                accentBorder,
                av,
              )}
              style={s.avatarRing}
            >
              <AvatarImage
                src={data.avatarUrl}
                className={cn("object-cover", c.heroImage)}
              />
              <AvatarFallback
                className={cn(
                  "bg-neutral-200 text-2xl text-neutral-700",
                  accentBg,
                  customText,
                  avatarShapeClass,
                )}
                style={s.decorativeAccent}
              >
                {initial}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1 space-y-4 pt-1">
              <h1
                className={cn(
                  "text-4xl font-light tracking-tight text-neutral-900 sm:text-5xl md:text-6xl",
                  customText,
                )}
                style={s.heading}
              >
                {eName}
              </h1>
              <div
                className={cn("h-px w-16 bg-neutral-300", c.accentDivider)}
                style={s.divider}
              />
              <div
                className={cn(
                  "flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-neutral-600",
                  customSubtext,
                )}
                style={s.muted}
              >
                <span
                  className={cn(
                    "uppercase tracking-[0.2em] text-neutral-500",
                    customSubtext,
                  )}
                  style={s.label}
                >
                  {eGenre}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" />
                  {eLocation}
                </span>
              </div>
            </div>
          </div>
          {statGrid}
          <div className="flex flex-wrap gap-2">
            <Button size="sm" className={t.btnPrimary} style={s.buttonPrimary}>
              <Mail className="mr-2 h-4 w-4" />
              Contact
            </Button>
            <Button
              size="sm"
              variant="outline"
              className={t.btnGhost}
              style={s.buttonGhost}
            >
              <Share2 className="mr-2 h-4 w-4" />
              Share
            </Button>
          </div>
        </div>
      </header>
    )
  }

  if (skin === "luxe") {
    return (
      <header key="hero" className={cn("text-center", heroGapClass)}>
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-6">
          <div className="relative">
            <div
              className={cn(
                "absolute -inset-1 bg-gradient-to-br from-[#c9a962] via-[#e8d5a8] to-[#c9a962] p-[2px]",
                hasCustomAccent && "bg-[color:var(--epk-accent)] bg-none",
                avatarShapeClass,
              )}
              style={s.decorativeAccent}
            >
              <div
                className={cn(
                  "h-full w-full bg-[#0a1628]",
                  c.cardBg,
                  avatarShapeClass,
                )}
                style={s.card}
              />
            </div>
            <Avatar
              className={cn(
                "relative border-2 border-[#c9a962]/60",
                accentBorder,
                av,
              )}
              style={s.avatarRing}
            >
              <AvatarImage
                src={data.avatarUrl}
                className={cn("object-cover", c.heroImage)}
              />
              <AvatarFallback
                className={cn(
                  "bg-[#0d1c32] font-serif text-2xl text-[#e8d5a8]",
                  t.accentIcon,
                  avatarShapeClass,
                )}
                style={s.decorativeAccent}
              >
                {initial}
              </AvatarFallback>
            </Avatar>
          </div>
          <h1
            className={cn(
              "font-serif text-4xl font-semibold tracking-wide text-[#e8dcc8] sm:text-5xl",
              customText,
            )}
            style={s.heading}
          >
            {eName}
          </h1>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Badge className={t.badge} style={s.badge}>
              {eGenre}
            </Badge>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 text-sm text-[#b8a990]",
                customSubtext,
              )}
              style={s.muted}
            >
              <MapPin className="h-4 w-4 shrink-0" />
              {eLocation}
            </span>
          </div>
          {statGrid}
          <div className="flex flex-wrap justify-center gap-2">
            <Button size="sm" className={t.btnPrimary} style={s.buttonPrimary}>
              <Mail className="mr-2 h-4 w-4" />
              Contact
            </Button>
            <Button
              size="sm"
              variant="outline"
              className={t.btnGhost}
              style={s.buttonGhost}
            >
              <Share2 className="mr-2 h-4 w-4" />
              Share
            </Button>
          </div>
        </div>
      </header>
    )
  }

  if (skin === "poster") {
    return (
      <header
        key="hero"
        className={cn("relative overflow-hidden", heroGapClass)}
      >
        <div
          className={cn(
            "absolute -right-8 top-4 h-32 w-32 rotate-12 border-4 border-[#f07167]/30",
            accentBorder,
          )}
          style={s.avatarRing}
        />
        <div
          className={cn(
            "absolute -left-4 bottom-8 h-2 w-40 -rotate-6 bg-[#f07167]",
            c.accentDivider,
          )}
          style={s.divider}
        />
        <div
          className={cn(
            "relative flex flex-col gap-6 border-2 border-[#f07167] bg-[#1a0c0c] p-6 sm:flex-row sm:items-end sm:p-8",
            accentBorder,
            c.cardBg,
          )}
          style={s.heroShell}
        >
          <div className="relative shrink-0">
            <div
              className={cn(
                "absolute -inset-2 -rotate-2 border-2 border-[#faf3eb]/40",
                accentBorder,
                avatarShapeClass,
              )}
              style={s.avatarRing}
            />
            <Avatar
              className={cn(
                "relative border-2 border-[#f07167]",
                accentBorder,
                av,
              )}
              style={s.avatarRing}
            >
              <AvatarImage
                src={data.avatarUrl}
                className={cn("object-cover", c.heroImage)}
              />
              <AvatarFallback
                className={cn(
                  "bg-[#5c1a1a] text-2xl font-black text-[#f07167]",
                  t.accentIcon,
                  avatarShapeClass,
                )}
                style={s.decorativeAccent}
              >
                {initial}
              </AvatarFallback>
            </Avatar>
          </div>
          <div className="min-w-0 flex-1 space-y-4 text-left">
            <h1
              className={cn(
                "text-4xl font-black uppercase leading-[0.9] tracking-tight text-[#faf3eb] sm:text-5xl md:text-6xl",
                customText,
              )}
              style={s.heading}
            >
              {eName}
            </h1>
            <div className="flex flex-wrap items-center gap-2">
              <span className={cn(t.badge, "rotate-[-2deg]")} style={s.badge}>
                {eGenre}
              </span>
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 text-sm font-bold uppercase tracking-wide text-[#faf3eb]/80",
                  customSubtext,
                )}
                style={s.muted}
              >
                <MapPin className="h-4 w-4" />
                {eLocation}
              </span>
            </div>
            {statGrid}
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                className={t.btnPrimary}
                style={s.buttonPrimary}
              >
                <Mail className="mr-2 h-4 w-4" />
                Contact
              </Button>
              <Button size="sm" className={t.btnGhost} style={s.buttonGhost}>
                <Share2 className="mr-2 h-4 w-4" />
                Share
              </Button>
            </div>
          </div>
        </div>
      </header>
    )
  }

  if (skin === "coastal") {
    return (
      <header
        key="hero"
        className={cn(t.card, heroGapClass)}
        style={s.heroShell}
      >
        <div className="flex flex-col items-center gap-6 text-center sm:flex-row sm:text-left">
          <Avatar
            className={cn(
              "border-4 border-white shadow-md ring-2 ring-[#b8cfc4]",
              c.accentRing,
              av,
            )}
            style={s.avatarRing}
          >
            <AvatarImage
              src={data.avatarUrl}
              className={cn("object-cover", c.heroImage)}
            />
            <AvatarFallback
              className={cn(
                "bg-[#7ab8a8] text-2xl text-white",
                accentBg,
                avatarShapeClass,
              )}
              style={s.decorativeAccent}
            >
              {initial}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 space-y-3">
            <h1
              className={cn(
                "text-3xl font-semibold tracking-tight text-[#1a3a3a] sm:text-4xl",
                customText,
              )}
              style={s.heading}
            >
              {eName}
            </h1>
            <div className="flex flex-wrap items-center justify-center gap-3 sm:justify-start">
              <Badge className={t.badge} style={s.badge}>
                {eGenre}
              </Badge>
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 text-sm text-[#3d5c5c]",
                  customSubtext,
                )}
                style={s.muted}
              >
                <MapPin className="h-4 w-4 shrink-0" />
                {eLocation}
              </span>
            </div>
            {statGrid}
            <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
              <Button
                size="sm"
                className={t.btnPrimary}
                style={s.buttonPrimary}
              >
                <Mail className="mr-2 h-4 w-4" />
                Contact
              </Button>
              <Button
                size="sm"
                variant="outline"
                className={t.btnGhost}
                style={s.buttonGhost}
              >
                <Share2 className="mr-2 h-4 w-4" />
                Share
              </Button>
            </div>
          </div>
        </div>
      </header>
    )
  }

  // modern (default)
  return (
    <header
      key="hero"
      className={cn(
        "relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#090b16] shadow-[0_30px_100px_rgba(0,0,0,0.45)]",
        accentRing,
        heroGapClass,
        c.cardBg,
      )}
      style={s.heroShell}
    >
      <div className="absolute inset-0">
        {data.coverUrl ? (
          <img
            src={data.coverUrl}
            alt=""
            className={cn("h-full w-full object-cover opacity-45", c.heroImage)}
          />
        ) : (
          <div className="h-full w-full bg-[radial-gradient(circle_at_75%_20%,rgba(129,140,248,0.38),transparent_35%),linear-gradient(135deg,#10152d_0%,#07080f_62%)]" />
        )}
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(7,8,15,0.98)_0%,rgba(7,8,15,0.86)_48%,rgba(7,8,15,0.38)_100%)]" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#07080f] to-transparent" />
      </div>

      <div className="relative p-5 sm:p-8 lg:p-10">
        <div className="grid items-end gap-8 lg:grid-cols-[minmax(0,1fr)_17rem]">
          <div className="flex min-w-0 flex-col gap-6 sm:flex-row sm:items-end">
            <div className="relative shrink-0 self-center sm:self-auto">
              <div
                className={cn(
                  "absolute -inset-3 opacity-60 blur-2xl",
                  avatarShapeClass,
                  hasCustomAccent
                    ? "bg-[color:var(--epk-accent)]"
                    : "bg-gradient-to-br from-indigo-500 to-fuchsia-500",
                )}
                style={s.decorativeAccent}
              />
              <div
                className={cn(
                  "relative p-[3px]",
                  avatarShapeClass,
                  hasCustomAccent
                    ? "bg-[color:var(--epk-accent)]"
                    : accent === "neon"
                      ? "bg-gradient-to-br from-cyan-300 via-blue-500 to-violet-600"
                      : "bg-gradient-to-br from-indigo-300 via-violet-500 to-fuchsia-500",
                )}
                style={s.decorativeAccent}
              >
                <Avatar
                  className={cn("border-2 border-[#07080f]", accentBorder, av)}
                  style={s.avatarRing}
                >
                  <AvatarImage
                    src={data.avatarUrl}
                    className={cn("object-cover", c.heroImage)}
                  />
                  <AvatarFallback
                    className={cn(
                      "bg-indigo-950 text-3xl font-semibold text-white",
                      accentBg,
                      customText,
                      avatarShapeClass,
                    )}
                    style={s.decorativeAccent}
                  >
                    {initial}
                  </AvatarFallback>
                </Avatar>
              </div>
            </div>

            <div className="min-w-0 flex-1 space-y-5 text-center sm:text-left">
              <div className="space-y-3">
                <h1
                  className={cn(
                    "text-4xl font-semibold leading-[0.92] tracking-[-0.045em] text-white sm:text-6xl lg:text-7xl",
                    customText,
                  )}
                  style={s.heading}
                >
                  {eName}
                </h1>
                <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                  <Badge
                    variant="secondary"
                    className={t.badge}
                    style={s.badge}
                  >
                    {eGenre}
                  </Badge>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 text-sm text-white/65",
                      customSubtext,
                    )}
                    style={s.muted}
                  >
                    <MapPin className="h-4 w-4 shrink-0 opacity-70" />
                    {eLocation}
                  </span>
                </div>
              </div>

              {statGrid}

              <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
                <Button
                  type="button"
                  size="sm"
                  className={t.btnPrimary}
                  style={s.buttonPrimary}
                >
                  <Mail className="mr-2 h-4 w-4" />
                  Contact
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className={t.btnGhost}
                  style={s.buttonGhost}
                >
                  <Share2 className="mr-2 h-4 w-4" />
                  Share
                </Button>
              </div>
            </div>
          </div>

          <div className="hidden border-l border-white/10 pl-6 lg:block">
            <dl className="space-y-5">
              {[
                { label: "Format", value: "Live EPK", icon: Radio },
                { label: "Primary genre", value: eGenre, icon: Headphones },
                { label: "Based in", value: eLocation, icon: MapPin },
              ].map((item) => {
                const Icon = item.icon
                return (
                  <div key={item.label} className="flex gap-3">
                    <div
                      className={cn(
                        "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.06] text-indigo-200",
                        c.accentText,
                      )}
                      style={s.accentText}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <dt className="text-[10px] uppercase tracking-[0.2em] text-white/35">
                        {item.label}
                      </dt>
                      <dd className="mt-1 truncate text-sm text-white/80">
                        {item.value}
                      </dd>
                    </div>
                  </div>
                )
              })}
            </dl>
          </div>
        </div>
      </div>
    </header>
  )
}

function skeletonBar(
  className: string,
  t: EpkSkinTokens,
  c?: ResolvedEpkAppearance["color"],
) {
  return (
    <div
      className={cn(
        "rounded",
        c?.skeleton ?? (t.isLightSurface ? "bg-neutral-200/80" : "bg-white/10"),
        className,
      )}
    />
  )
}

function sectionCardClass(ctx: EpkSectionRenderCtx, sectionId: string) {
  const { skin, t, c } = ctx
  return cn(
    t.card,
    "relative",
    skin === "modern" &&
      "overflow-hidden shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-2xl",
    skin === "classic" &&
      "overflow-hidden shadow-[0_18px_55px_rgba(93,64,35,0.08)]",
    skin === "minimal" &&
      "!border-x-0 !border-b-0 !bg-transparent !px-0 shadow-none",
    skin === "bold" &&
      "shadow-[10px_10px_0_color-mix(in_srgb,var(--epk-accent,#facc15)_62%,transparent)]",
    skin === "cinema" && "overflow-hidden shadow-[0_30px_80px_rgba(0,0,0,0.4)]",
    skin === "gallery" &&
      "!border-x-0 !border-b-0 !bg-transparent !px-0 shadow-none",
    skin === "luxe" && "overflow-hidden shadow-[0_28px_85px_rgba(0,0,0,0.32)]",
    skin === "poster" &&
      "shadow-[8px_8px_0_color-mix(in_srgb,var(--epk-accent,#f07167)_42%,transparent)]",
    skin === "coastal" &&
      "overflow-hidden shadow-[0_24px_65px_rgba(45,106,90,0.11)]",
    skin === "scrapbook" &&
      "overflow-hidden shadow-[0_20px_60px_rgba(54,36,28,0.14)]",
    skin === "bandcard" && "shadow-[8px_8px_0_rgba(245,223,24,0.28)]",
    skin === "dossier" && "shadow-[7px_9px_0_rgba(0,0,0,0.12)]",
    skin === "pressgrid" && "shadow-none",
    skin === "redcolumn" && "shadow-none",
    skin === "checkerboard" && "shadow-[8px_8px_0_rgba(139,61,255,0.35)]",
    skin === "editorial" && "shadow-[0_28px_80px_rgba(0,0,0,0.28)]",
    skin === "whitespace" && "shadow-none",
    skin === "colorblock" && "shadow-none",
    skin === "sunburst" && "shadow-none",
    sectionId === "media" &&
      (skin === "gallery" || skin === "modern") &&
      "sm:p-8",
    c.cardBg,
  )
}

function sectionItemClass(ctx: EpkSectionRenderCtx, index = 0) {
  const { skin, t } = ctx
  return cn(
    t.cardMuted,
    "relative transition-[transform,background-color,border-color,box-shadow] duration-300",
    skin === "modern" &&
      "hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.075] hover:shadow-[0_16px_45px_rgba(0,0,0,0.22)]",
    skin === "classic" && "hover:border-amber-900/25 hover:bg-white",
    skin === "minimal" &&
      "!border-x-0 !border-t-0 !bg-transparent hover:translate-x-1",
    skin === "bold" && "hover:-translate-y-1 hover:translate-x-1",
    skin === "cinema" && "hover:border-white/20 hover:bg-white/[0.035]",
    skin === "gallery" &&
      "!border-x-0 !border-t-0 !bg-transparent hover:bg-neutral-50",
    skin === "luxe" &&
      "hover:-translate-y-0.5 hover:border-[#d8bb77]/35 hover:bg-white/[0.035]",
    skin === "poster" &&
      (index % 2 === 0 ? "sm:-rotate-[0.35deg]" : "sm:rotate-[0.35deg]"),
    skin === "poster" && "hover:rotate-0 hover:-translate-y-1",
    skin === "coastal" && "hover:-translate-y-0.5 hover:bg-white/85",
    skin === "scrapbook" && "hover:-translate-y-0.5 hover:bg-white",
    skin === "bandcard" && "hover:border-[#f5df18]/80 hover:bg-[#1d1d1d]",
    skin === "dossier" &&
      "hover:-translate-y-0.5 hover:shadow-[5px_5px_0_rgba(0,0,0,0.12)]",
    skin === "pressgrid" && "hover:border-black/35",
    skin === "redcolumn" && "hover:border-[#e11118]",
    skin === "checkerboard" && "hover:-translate-y-1 hover:border-[#b88cff]",
    skin === "editorial" && "hover:border-[#ff3542]/60 hover:bg-[#282828]",
    skin === "whitespace" && "hover:border-black/25",
    skin === "colorblock" && "hover:bg-white/[0.12]",
    skin === "sunburst" && "hover:-translate-y-0.5 hover:bg-[#f9d869]",
  )
}

function renderSectionHeader(
  ctx: EpkSectionRenderCtx,
  _sectionId: string,
  title: string,
  icon: React.ReactNode,
) {
  const { skin, t, c, s } = ctx

  if (skin === "classic") {
    return (
      <div className="mb-5 border-b border-stone-200 pb-4">
        <div className="flex items-end justify-between gap-4">
          <h2
            className={cn("font-serif text-2xl sm:text-3xl", t.heading)}
            style={s.heading}
          >
            {title}
          </h2>
          <div
            className={cn("mb-1 h-px w-14 bg-amber-800/50", c.accentDivider)}
            style={s.divider}
          />
        </div>
      </div>
    )
  }

  if (skin === "minimal") {
    return (
      <div className="mb-6 flex items-center gap-4">
        <h2 className={cn("shrink-0", t.heading)} style={s.heading}>
          {title}
        </h2>
        <div
          className={cn("h-px flex-1 bg-white/15", c.accentDivider)}
          style={s.divider}
        />
      </div>
    )
  }

  if (skin === "bold") {
    return (
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b-4 border-current pb-3">
        <div>
          <h2
            className={cn("text-3xl sm:text-4xl", t.heading)}
            style={s.heading}
          >
            {title}
          </h2>
        </div>
        <div
          className={cn(
            "flex h-11 w-11 rotate-3 items-center justify-center border-2 border-current bg-current text-black",
            t.accentIcon,
          )}
          style={s.decorativeAccent}
        >
          <span className="[&>svg]:h-5 [&>svg]:w-5 [&>svg]:text-black">
            {icon}
          </span>
        </div>
      </div>
    )
  }

  if (skin === "cinema") {
    return (
      <div className="mb-6 flex items-center gap-4 border-b border-white/10 pb-4">
        <div className="min-w-0">
          <h2 className={cn("truncate", t.heading)} style={s.heading}>
            {title}
          </h2>
        </div>
      </div>
    )
  }

  if (skin === "gallery") {
    return (
      <div className="mb-8 border-b border-neutral-200 pb-5">
        <div className="flex items-center justify-between gap-4">
          <h2 className={cn("text-sm", t.heading)} style={s.heading}>
            {title}
          </h2>
          <span
            className={cn("text-neutral-400", t.accentIcon)}
            style={s.accentText}
          >
            {icon}
          </span>
        </div>
      </div>
    )
  }

  if (skin === "luxe") {
    return (
      <div className="mb-6 text-center">
        <div className="mb-3 flex items-center justify-center gap-3">
          <div
            className={cn("h-px w-10 bg-[#c9a962]/45", c.accentDivider)}
            style={s.divider}
          />
          <div
            className={cn("h-px w-10 bg-[#c9a962]/45", c.accentDivider)}
            style={s.divider}
          />
        </div>
        <h2
          className={cn("font-serif text-2xl sm:text-3xl", t.heading)}
          style={s.heading}
        >
          {title}
        </h2>
      </div>
    )
  }

  if (skin === "poster") {
    return (
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b-2 border-current pb-4">
        <h2 className={cn("text-2xl sm:text-3xl", t.heading)} style={s.heading}>
          {title}
        </h2>
      </div>
    )
  }

  if (skin === "coastal") {
    return (
      <div className="mb-5 flex items-center gap-3">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#d4e8df]",
            c.accentSoftBg,
            t.accentIcon,
          )}
          style={s.decorativeAccent}
        >
          {icon}
        </div>
        <div>
          <h2 className={t.heading} style={s.heading}>
            {title}
          </h2>
        </div>
      </div>
    )
  }

  if (isReferenceEpkSkin(skin)) {
    const treatments: Record<
      EpkSkinId,
      { wrap: string; title: string; icon: string }
    > = {
      modern: { wrap: "", title: "", icon: "" },
      classic: { wrap: "", title: "", icon: "" },
      minimal: { wrap: "", title: "", icon: "" },
      bold: { wrap: "", title: "", icon: "" },
      cinema: { wrap: "", title: "", icon: "" },
      gallery: { wrap: "", title: "", icon: "" },
      luxe: { wrap: "", title: "", icon: "" },
      poster: { wrap: "", title: "", icon: "" },
      coastal: { wrap: "", title: "", icon: "" },
      scrapbook: {
        wrap: "border-b border-[#c9b8ae] pb-4",
        title: "font-serif text-3xl text-[#241d19]",
        icon: "rounded-full bg-[#dce8e2] text-[#47756a]",
      },
      bandcard: {
        wrap: "border-b-4 border-[#f5df18] pb-3",
        title: "text-3xl font-black uppercase text-white",
        icon: "rounded-none bg-[#f5df18] text-black",
      },
      dossier: {
        wrap: "border-b-2 border-black pb-3",
        title: "text-2xl font-black uppercase text-black",
        icon: "rounded-none border-2 border-black bg-transparent text-black",
      },
      pressgrid: {
        wrap: "border-b border-black pb-4",
        title: "text-3xl font-black uppercase text-black",
        icon: "rounded-none bg-black text-white",
      },
      redcolumn: {
        wrap: "border-b border-[#e11118] pb-4",
        title: "text-3xl font-black uppercase text-[#202020]",
        icon: "rounded-none bg-[#e11118] text-white",
      },
      checkerboard: {
        wrap: "border-b-2 border-[#8b3dff] pb-4",
        title: "text-3xl font-black uppercase text-white",
        icon: "rounded-none bg-[#8b3dff] text-white",
      },
      editorial: {
        wrap: "border-b border-white/15 pb-4",
        title: "text-3xl font-semibold text-white",
        icon: "rounded-none border border-[#ff3542] text-[#ff3542]",
      },
      whitespace: {
        wrap: "border-b border-black/15 pb-5",
        title: "text-3xl font-semibold text-black",
        icon: "rounded-full bg-[#e8f7fb] text-[#1688a5]",
      },
      colorblock: {
        wrap: "border-b border-white/40 pb-4",
        title: "text-3xl font-light text-white",
        icon: "rounded-none bg-black text-white",
      },
      sunburst: {
        wrap: "border-b-2 border-[#d02d20] pb-4",
        title: "text-3xl font-black text-[#d02d20]",
        icon: "rounded-none bg-[#d02d20] text-[#ffd85e]",
      },
    }
    const treatment = treatments[skin]
    return (
      <div
        className={cn(
          "mb-6 flex items-end justify-between gap-4",
          treatment.wrap,
        )}
      >
        <h2 className={treatment.title} style={s.heading}>
          {title}
        </h2>
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center",
            treatment.icon,
          )}
          style={s.decorativeAccent}
        >
          {icon}
        </div>
      </div>
    )
  }

  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06]",
            t.accentIcon,
            c.accentBorder,
          )}
          style={s.decorativeAccent}
        >
          {icon}
        </div>
        <div>
          <h2 className={t.heading} style={s.heading}>
            {title}
          </h2>
        </div>
      </div>
    </div>
  )
}

function musicLayoutClass(skin: EpkSkinId) {
  if (
    skin === "modern" ||
    skin === "bold" ||
    skin === "luxe" ||
    skin === "poster" ||
    skin === "bandcard" ||
    skin === "pressgrid" ||
    skin === "checkerboard" ||
    skin === "editorial" ||
    skin === "sunburst"
  ) {
    return "grid gap-3 md:grid-cols-2"
  }
  return "space-y-2"
}

function showLayoutClass(skin: EpkSkinId) {
  if (
    skin === "classic" ||
    skin === "minimal" ||
    skin === "cinema" ||
    skin === "gallery" ||
    skin === "scrapbook" ||
    skin === "dossier" ||
    skin === "redcolumn" ||
    skin === "whitespace"
  ) {
    return "space-y-3"
  }
  return "grid gap-3 sm:grid-cols-2"
}

function pressLayoutClass(skin: EpkSkinId) {
  if (
    skin === "modern" ||
    skin === "gallery" ||
    skin === "luxe" ||
    skin === "pressgrid" ||
    skin === "editorial" ||
    skin === "sunburst"
  ) {
    return "grid gap-3 md:grid-cols-2"
  }
  return "space-y-3"
}

function mediaGridClass(skin: EpkSkinId) {
  switch (skin) {
    case "modern":
      return "grid auto-rows-[130px] grid-cols-2 gap-3 sm:auto-rows-[160px] sm:grid-cols-4"
    case "cinema":
      return "grid grid-cols-1 gap-3 sm:grid-cols-2"
    case "gallery":
      return "grid auto-rows-[150px] grid-cols-2 gap-4 sm:auto-rows-[190px] sm:grid-cols-6"
    case "poster":
      return "grid auto-rows-[140px] grid-cols-2 gap-3 sm:grid-cols-3"
    case "scrapbook":
      return "grid auto-rows-[140px] grid-cols-2 gap-3 sm:grid-cols-4"
    case "pressgrid":
      return "grid auto-rows-[150px] grid-cols-2 gap-4 sm:grid-cols-4"
    case "checkerboard":
      return "grid auto-rows-[140px] grid-cols-2 gap-2 sm:grid-cols-3"
    case "editorial":
      return "grid auto-rows-[180px] grid-cols-2 gap-3 sm:grid-cols-4"
    case "whitespace":
      return "grid auto-rows-[160px] grid-cols-2 gap-5 sm:grid-cols-3"
    case "sunburst":
      return "grid auto-rows-[180px] grid-cols-2 gap-4 sm:grid-cols-3"
    default:
      return "grid grid-cols-2 gap-3 sm:grid-cols-3"
  }
}

function mediaTileClass(skin: EpkSkinId, index: number) {
  return cn(
    "relative overflow-hidden border",
    skin === "modern" && index === 0 && "col-span-2 row-span-2",
    skin === "modern" && index === 1 && "sm:col-span-2",
    skin === "cinema" && "aspect-video",
    skin === "gallery" && index === 0 && "col-span-2 row-span-2 sm:col-span-4",
    skin === "gallery" && index === 1 && "sm:col-span-2 sm:row-span-2",
    skin === "gallery" && index > 1 && "sm:col-span-2",
    skin === "poster" && index === 0 && "col-span-2 sm:row-span-2",
    skin === "poster" && index === 1 && "sm:col-span-1",
    skin === "scrapbook" && index === 0 && "col-span-2 row-span-2",
    skin === "pressgrid" && index === 0 && "col-span-2 row-span-2",
    skin === "editorial" && index === 0 && "col-span-2 row-span-2",
    skin === "sunburst" && index === 0 && "col-span-2 row-span-2",
    skin !== "modern" &&
      skin !== "cinema" &&
      skin !== "gallery" &&
      skin !== "poster" &&
      skin !== "scrapbook" &&
      skin !== "pressgrid" &&
      skin !== "checkerboard" &&
      skin !== "editorial" &&
      skin !== "whitespace" &&
      skin !== "sunburst" &&
      "aspect-square",
  )
}

export function renderEpkSection(
  sectionId: string,
  ctx: EpkSectionRenderCtx,
): React.ReactNode | null {
  const {
    data,
    skin,
    showPlaceholder,
    layout,
    t,
    c,
    s,
    ph,
    empty,
    mutedPh,
    hoveredTrack,
    setHoveredTrack,
    sectionGapClass: g,
  } = ctx

  if (sectionId === "hero") return renderHero(ctx)

  if (sectionId === "one-liner") {
    const value = data.bookingAssets?.oneLiner || ""
    const eOneLiner = ctx.editableField?.(
      "bookingAssets.oneLiner",
      value,
      "Your one-line pitch for bookers and festivals appears here.",
    ) ?? (
      <p
        className={cn(
          "text-center leading-relaxed sm:text-lg",
          t.subheading,
          skin === "classic" && "font-serif not-italic text-stone-800",
          mutedPh(value),
        )}
      >
        {ph(
          value,
          "Your one-line pitch for bookers and festivals appears here.",
        )}
      </p>
    )

    return (
      <section key="one-liner" className={cn(g, c.sectionDivider)}>
        <div
          className={cn(t.oneLinerWrap, "relative overflow-hidden")}
          style={s.card}
        >
          <Quote
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute -left-2 -top-3 h-16 w-16 opacity-[0.08]",
              t.accentIcon,
            )}
            style={s.accentText}
          />
          <div className="relative">{eOneLiner}</div>
        </div>
      </section>
    )
  }

  if (sectionId === "stats") {
    if (!shouldRenderStandaloneStats(layout)) return null
    return (
      <section key="stats" className={cn(g, c.sectionDivider)}>
        <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-3 sm:gap-4">
          {[
            { label: "Followers", value: data.stats.followers, icon: Users },
            {
              label: "Monthly listeners",
              value: data.stats.monthlyListeners,
              icon: Headphones,
            },
            {
              label: "Total streams",
              value: data.stats.totalStreams,
              icon: Disc3,
            },
          ].map((stat) => {
            const Icon = stat.icon
            return (
              <div
                key={stat.label}
                className={cn(
                  t.statCell,
                  "group relative overflow-hidden py-4",
                )}
                style={ctx.s.statCell}
              >
                <Icon
                  aria-hidden="true"
                  className={cn(
                    "absolute -right-2 -top-2 h-12 w-12 opacity-[0.07] transition-transform group-hover:scale-110",
                    t.accentIcon,
                  )}
                  style={ctx.s.accentText}
                />
                <div
                  className={cn(t.statValue, "relative text-xl")}
                  style={ctx.s.accentText}
                >
                  {formatEpkNumber(stat.value)}
                </div>
                <div className={cn(t.label, "relative")} style={ctx.s.label}>
                  {stat.label}
                </div>
              </div>
            )
          })}
        </div>
      </section>
    )
  }

  if (sectionId === "bio") {
    const eBio = ctx.editableField?.(
      "bio",
      data.bio ?? "",
      "Tell your story — bio, influences, and what makes your live show stand out.",
      { multiline: true },
    ) ?? (
      <p
        className={cn(
          t.subheading,
          "max-w-4xl whitespace-pre-line sm:text-base",
          mutedPh(data.bio ?? ""),
        )}
        style={s.body}
      >
        {ph(
          data.bio,
          "Tell your story — bio, influences, and what makes your live show stand out.",
        )}
      </p>
    )

    return (
      <section key="bio" className={cn(g, c.sectionDivider)}>
        <div className={sectionCardClass(ctx, "bio")} style={s.card}>
          {renderSectionHeader(
            ctx,
            "bio",
            "Biography",
            <Sparkles className="h-5 w-5" />,
          )}
          <div
            className={cn(
              skin === "classic" && "columns-1 gap-8 lg:columns-2",
              skin === "gallery" && "max-w-2xl pl-0 sm:pl-14",
            )}
          >
            {eBio}
          </div>
        </div>
      </section>
    )
  }

  if (sectionId === "music") {
    if (data.music.length === 0 && !showPlaceholder) return null
    return (
      <section key="music" className={cn(g, c.sectionDivider)}>
        <div className={sectionCardClass(ctx, "music")} style={s.card}>
          {renderSectionHeader(
            ctx,
            "music",
            "Selected music",
            <Music className="h-5 w-5" />,
          )}
          <div className={musicLayoutClass(skin)}>
            {data.music.length > 0
              ? data.music.map((track, index) => (
                  <div
                    key={track.id}
                    className={cn(
                      "group flex items-center gap-3 border px-3 py-3",
                      sectionItemClass(ctx, index),
                      skin === "modern" &&
                        index === 0 &&
                        data.music.length > 2 &&
                        "md:col-span-2",
                      hoveredTrack === track.id &&
                        skin === "modern" &&
                        "border-white/25 bg-white/[0.09]",
                    )}
                    style={s.mutedCard}
                    onMouseEnter={() => setHoveredTrack(track.id)}
                    onMouseLeave={() => setHoveredTrack(null)}
                  >
                    <div
                      className={cn(
                        "relative h-14 w-14 shrink-0 overflow-hidden",
                        t.trackArtFallback,
                      )}
                      style={s.trackArt}
                    >
                      {track.coverArt ? (
                        <img
                          src={track.coverArt}
                          alt={`${track.title || "Track"} cover artwork`}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <Disc3
                            className={cn(
                              "h-5 w-5",
                              c.mutedText ||
                                (t.isLightSurface
                                  ? "text-neutral-500"
                                  : "text-white/80"),
                            )}
                          />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div
                        className={cn("truncate", t.bodyStrong, c.bodyText)}
                        style={s.body}
                      >
                        {track.title}
                      </div>
                      <div
                        className={cn(
                          "mt-1 flex items-center gap-2 text-xs",
                          t.muted,
                        )}
                        style={s.muted}
                      >
                        <span className="font-mono tabular-nums">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{formatEpkNumber(track.streams)} streams</span>
                      </div>
                    </div>
                    {track.url ? (
                      <Button
                        asChild
                        size="sm"
                        className={cn("shrink-0", t.btnPrimary)}
                        style={s.buttonPrimary}
                      >
                        <a
                          href={track.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`Play ${track.title || "track"}`}
                          onClick={() =>
                            ctx.trackInteraction("music_click", {
                              id: track.id,
                              title: track.title,
                              platform: track.platform,
                            })
                          }
                        >
                          <Play className="h-4 w-4" />
                        </a>
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        className={cn("shrink-0", t.btnPrimary)}
                        style={s.buttonPrimary}
                        aria-label={`Play ${track.title || "track"}`}
                        disabled
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))
              : [0, 1, 2].map((index) => (
                  <div
                    key={index}
                    className={cn(
                      "flex items-center gap-3 border px-3 py-3",
                      t.dashed,
                      skin === "modern" && index === 0 && "md:col-span-2",
                    )}
                    style={s.mutedCard}
                  >
                    <div
                      className={cn(
                        "h-14 w-14 shrink-0",
                        t.isLightSurface ? "bg-neutral-200" : "bg-white/10",
                      )}
                    />
                    <div className="flex-1 space-y-2">
                      {skeletonBar("h-3 max-w-[10rem]", t, c)}
                      {skeletonBar("h-2 max-w-[6rem]", t, c)}
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className={cn(t.muted)}
                      disabled
                    >
                      <Play className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
          </div>
        </div>
      </section>
    )
  }

  if (sectionId === "shows") {
    if (data.upcomingShows.length === 0 && !showPlaceholder) return null
    return (
      <section key="shows" className={cn(g, c.sectionDivider)}>
        <div className={sectionCardClass(ctx, "shows")} style={s.card}>
          {renderSectionHeader(
            ctx,
            "shows",
            "Upcoming shows",
            <Calendar className="h-5 w-5" />,
          )}
          {data.upcomingShows.length > 0 ? (
            <div className={showLayoutClass(skin)}>
              {data.upcomingShows.map((show, index) => (
                <div
                  key={show.id}
                  className={cn(
                    "group border p-4",
                    sectionItemClass(ctx, index),
                    (skin === "classic" ||
                      skin === "minimal" ||
                      skin === "cinema" ||
                      skin === "gallery") &&
                      "grid gap-4 sm:grid-cols-[8rem_minmax(0,1fr)_auto] sm:items-center",
                  )}
                  style={s.mutedCard}
                >
                  <div
                    className={cn(
                      "flex items-center gap-2 text-xs",
                      t.muted,
                      (skin === "classic" ||
                        skin === "minimal" ||
                        skin === "cinema" ||
                        skin === "gallery") &&
                        "font-mono uppercase tracking-[0.12em]",
                    )}
                    style={s.muted}
                  >
                    <Clock3 className="h-3.5 w-3.5" />
                    {show.date ? formatSafeDate(show.date) : "Date TBA"}
                  </div>
                  <div className="min-w-0">
                    <div
                      className={cn("truncate", t.bodyStrong, c.bodyText)}
                      style={s.body}
                    >
                      {show.venue}
                    </div>
                    <div
                      className={cn(
                        "mt-1 flex items-center gap-1 text-xs",
                        t.muted,
                      )}
                      style={s.muted}
                    >
                      <MapPin className="h-3.5 w-3.5" />
                      <span className="truncate">{show.location}</span>
                    </div>
                  </div>
                  {show.ticketUrl ? (
                    <Button
                      asChild
                      size="sm"
                      className={cn(
                        "w-full sm:w-auto",
                        t.btnPrimary,
                        skin !== "classic" &&
                          skin !== "minimal" &&
                          skin !== "cinema" &&
                          skin !== "gallery" &&
                          "mt-2",
                      )}
                      style={s.buttonPrimary}
                    >
                      <a
                        href={show.ticketUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() =>
                          ctx.trackInteraction("ticket_click", {
                            id: show.id,
                            venue: show.venue,
                            date: show.date,
                          })
                        }
                      >
                        <Ticket className="mr-2 h-4 w-4" />
                        Tickets
                      </a>
                    </Button>
                  ) : (
                    <span className={cn("text-xs", t.muted)} style={s.muted}>
                      Details soon
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className={showLayoutClass(skin)}>
              {[0, 1].map((index) => (
                <div
                  key={index}
                  className={cn("border p-4", t.dashed)}
                  style={s.mutedCard}
                >
                  {skeletonBar("mb-2 h-4 max-w-[60%]", t, c)}
                  {skeletonBar("mb-1 h-3 max-w-[40%]", t, c)}
                  {skeletonBar("h-3 max-w-[33%]", t, c)}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    )
  }

  if (sectionId === "press") {
    if (data.press.length === 0 && !showPlaceholder) return null
    return (
      <section key="press" className={cn(g, c.sectionDivider)}>
        <div className={sectionCardClass(ctx, "press")} style={s.card}>
          {renderSectionHeader(
            ctx,
            "press",
            "Press coverage",
            <Newspaper className="h-5 w-5" />,
          )}
          {data.press.length > 0 ? (
            <ul className={pressLayoutClass(skin)}>
              {data.press.map((pressItem, index) => (
                <li
                  key={pressItem.id}
                  className={cn(
                    "group flex min-h-28 flex-col justify-between gap-4 border px-4 py-4",
                    sectionItemClass(ctx, index),
                  )}
                  style={s.mutedCard}
                >
                  <div>
                    <div
                      className={cn(
                        "mb-3 flex items-center justify-between gap-3",
                        t.label,
                      )}
                      style={s.label}
                    >
                      <span>{pressItem.outlet || "Press outlet"}</span>
                      <FileText className="h-4 w-4 opacity-60" />
                    </div>
                    <div
                      className={cn(t.bodyStrong, c.bodyText)}
                      style={s.body}
                    >
                      {pressItem.title}
                    </div>
                    <div
                      className={cn("mt-2 text-xs", t.muted)}
                      style={s.muted}
                    >
                      {pressItem.date}
                    </div>
                  </div>
                  {pressItem.url ? (
                    <a
                      href={pressItem.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        "inline-flex w-fit items-center gap-1 text-xs font-medium hover:underline",
                        t.link,
                      )}
                      style={s.accentText}
                      onClick={() =>
                        ctx.trackInteraction("press_click", {
                          id: pressItem.id,
                          title: pressItem.title,
                          outlet: pressItem.outlet,
                        })
                      }
                    >
                      Read coverage <ArrowUpRight className="h-3.5 w-3.5" />
                    </a>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <div className={pressLayoutClass(skin)}>
              {[0, 1].map((index) => (
                <div
                  key={index}
                  className={cn("border px-4 py-4", t.dashed)}
                  style={s.mutedCard}
                >
                  {skeletonBar("h-3 max-w-[66%]", t, c)}
                  {skeletonBar("mt-3 h-2 max-w-[33%]", t, c)}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    )
  }

  if (sectionId === "media") {
    if (data.photos.length === 0 && !showPlaceholder) return null
    const mediaFrame = cn(c.mediaFrame, c.mutedCardBg)
    const mediaEmpty = cn(c.mediaEmpty, c.mutedCardBg)
    const placeholderCount = skin === "cinema" ? 4 : 6

    return (
      <section key="media" className={cn(g, c.sectionDivider)}>
        <div className={sectionCardClass(ctx, "media")} style={s.card}>
          {renderSectionHeader(
            ctx,
            "media",
            "Press photography",
            <ImageIcon className="h-5 w-5" />,
          )}
          <div className={mediaGridClass(skin)}>
            {data.photos.length > 0
              ? data.photos.map((photo, index) => (
                  <figure
                    key={photo.id}
                    className={cn(
                      mediaTileClass(skin, index),
                      mediaFrame,
                      "group",
                    )}
                    style={s.mediaFrame}
                  >
                    {photo.url ? (
                      <img
                        src={photo.url}
                        alt={`Artist press photo ${index + 1}`}
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                      />
                    ) : null}
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/28 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                    <figcaption className="pointer-events-none absolute bottom-3 left-3 text-[9px] uppercase tracking-[0.2em] text-white opacity-0 transition-opacity group-hover:opacity-80">
                      Press photo {String(index + 1).padStart(2, "0")}
                    </figcaption>
                  </figure>
                ))
              : Array.from({ length: placeholderCount }, (_, index) => (
                  <div
                    key={index}
                    className={cn(mediaTileClass(skin, index), mediaEmpty)}
                    style={s.mediaFrame}
                  />
                ))}
          </div>
        </div>
      </section>
    )
  }

  if (sectionId === "contact") {
    const contactFields = [
      {
        label: "Email",
        field: "contact.email",
        value: data.contact.email,
        placeholder: "booking@you.com",
        icon: Mail,
      },
      {
        label: "Booking",
        field: "contact.bookingEmail",
        value: data.contact.bookingEmail,
        placeholder: "booking@you.com",
        icon: Ticket,
      },
      {
        label: "Phone",
        field: "contact.phone",
        value: data.contact.phone,
        placeholder: "+1 ···",
        icon: Radio,
      },
      {
        label: "Website",
        field: "contact.website",
        value: data.contact.website,
        placeholder: "https://…",
        icon: Globe,
      },
    ]

    return (
      <section key="contact" className={cn(g, c.sectionDivider)}>
        <div className={sectionCardClass(ctx, "contact")} style={s.card}>
          {renderSectionHeader(
            ctx,
            "contact",
            "Contact",
            <Mail className="h-5 w-5" />,
          )}
          <dl
            className={cn(
              "grid gap-3 text-sm sm:grid-cols-2",
              skin === "minimal" && "sm:grid-cols-1",
              skin === "gallery" && "sm:pl-14",
            )}
          >
            {contactFields.map((row, index) => {
              const Icon = row.icon
              return (
                <div
                  key={row.label}
                  className={cn(
                    "flex gap-3 border px-4 py-3",
                    sectionItemClass(ctx, index),
                  )}
                  style={s.mutedCard}
                >
                  <Icon
                    className={cn("mt-0.5 h-4 w-4 shrink-0", t.accentIcon)}
                    style={s.accentText}
                  />
                  <div className="min-w-0">
                    <dt className={t.label} style={s.label}>
                      {row.label}
                    </dt>
                    <dd
                      className={cn(
                        "mt-1 break-all",
                        c.bodyText,
                        t.isLightSurface
                          ? placeholderToneLight(
                              empty(row.value) && showPlaceholder,
                            )
                          : placeholderTone(
                              empty(row.value) && showPlaceholder,
                            ),
                      )}
                      style={
                        empty(row.value) && showPlaceholder
                          ? s.placeholder
                          : s.body
                      }
                    >
                      {ctx.editableField?.(
                        row.field,
                        row.value,
                        row.placeholder,
                      ) ?? ph(row.value, row.placeholder)}
                    </dd>
                  </div>
                </div>
              )
            })}
          </dl>
        </div>
      </section>
    )
  }

  if (sectionId === "social") {
    const links = data.social
    if (links.length === 0 && !showPlaceholder) return null
    return (
      <section key="social" className={cn(g, c.sectionDivider)}>
        <div className={sectionCardClass(ctx, "social")} style={s.card}>
          {renderSectionHeader(
            ctx,
            "social",
            "Social channels",
            <Globe className="h-5 w-5" />,
          )}
          {!links.length && showPlaceholder ? (
            <div className="flex flex-wrap gap-2">
              {["Instagram", "Spotify", "YouTube"].map((platform) => (
                <div
                  key={platform}
                  className={cn("border px-4 py-2 text-sm", t.dashed, t.muted)}
                  style={{ ...s.mutedCard, ...s.muted }}
                >
                  {platform}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {links.map((link) =>
                link.url ? (
                  <Button
                    asChild
                    key={link.id}
                    variant="outline"
                    size="sm"
                    className={cn(t.outlineBtn, "group")}
                    style={s.buttonGhost}
                  >
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() =>
                        ctx.trackInteraction("social_click", {
                          id: link.id,
                          platform: link.platform,
                          username: link.username,
                        })
                      }
                    >
                      {getSocialIcon(link.platform)}
                      <span className="ml-2">{link.platform}</span>
                      <ArrowUpRight className="ml-2 h-3.5 w-3.5 opacity-50 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                    </a>
                  </Button>
                ) : (
                  <Button
                    type="button"
                    key={link.id}
                    variant="outline"
                    size="sm"
                    className={cn(t.outlineBtn, "group")}
                    style={s.buttonGhost}
                    disabled
                  >
                    {getSocialIcon(link.platform)}
                    <span className="ml-2">{link.platform}</span>
                    <ArrowUpRight className="ml-2 h-3.5 w-3.5 opacity-50" />
                  </Button>
                ),
              )}
            </div>
          )}
        </div>
      </section>
    )
  }

  if (sectionId === "booking") {
    const hasTechRider = Boolean(data.bookingAssets.techRiderUrl)
    const hasStagePlot = Boolean(data.bookingAssets.stagePlotUrl)

    return (
      <section key="booking" className={cn(g, c.sectionDivider)}>
        <div className={sectionCardClass(ctx, "booking")} style={s.card}>
          {renderSectionHeader(
            ctx,
            "booking",
            "Booking assets",
            <Link2 className="h-5 w-5" />,
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              {
                label: "Technical rider",
                available: hasTechRider,
                href: data.bookingAssets.techRiderUrl,
                type: "tech_rider",
                icon: FileText,
              },
              {
                label: "Stage plot",
                available: hasStagePlot,
                href: data.bookingAssets.stagePlotUrl,
                type: "stage_plot",
                icon: Download,
              },
            ].map((asset, index) => {
              const Icon = asset.icon
              return (
                <div
                  key={asset.label}
                  className={cn(
                    "flex items-center justify-between gap-3 border p-4",
                    sectionItemClass(ctx, index),
                  )}
                  style={s.mutedCard}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center border",
                        t.dashed,
                        t.accentIcon,
                      )}
                      style={s.decorativeAccent}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div
                        className={cn(t.bodyStrong, c.bodyText)}
                        style={s.body}
                      >
                        {asset.label}
                      </div>
                      <div className={cn("text-xs", t.muted)} style={s.muted}>
                        {asset.available
                          ? "Ready to download"
                          : "Not uploaded yet"}
                      </div>
                    </div>
                  </div>
                  {asset.available && asset.href ? (
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className={t.outlineBtn}
                      style={s.buttonGhost}
                    >
                      <a
                        href={asset.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() =>
                          ctx.trackInteraction("booking_asset_click", {
                            assetType: asset.type,
                            label: asset.label,
                          })
                        }
                      >
                        <Download className="h-4 w-4" />
                        <span className="sr-only">Download {asset.label}</span>
                      </a>
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className={cn(t.outlineBtn, "opacity-45")}
                      style={s.buttonGhost}
                      disabled
                    >
                      <Download className="h-4 w-4" />
                      <span className="sr-only">Download {asset.label}</span>
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </section>
    )
  }

  return null
}

function EpkPageChrome({
  skin,
  color,
  styles,
}: {
  skin: EpkSkinId
  color?: ResolvedEpkAppearance["color"]
  styles?: ResolvedEpkAppearance["styles"]
}) {
  const effectOverlay = color?.pageEffectClass ? (
    <div
      className={cn(
        "pointer-events-none absolute inset-0",
        color.pageEffectClass,
      )}
    />
  ) : null

  if (skin === "modern") {
    return (
      <>
        {effectOverlay}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.28]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
          }}
        />
        <div
          className={cn(
            "pointer-events-none absolute -left-32 top-10 h-96 w-96 rounded-full bg-indigo-600/24 blur-[110px]",
            color?.accentSoftBg,
          )}
          style={styles?.decorativeAccent}
        />
        <div
          className={cn(
            "pointer-events-none absolute -right-36 top-1/3 h-[28rem] w-[28rem] rounded-full bg-fuchsia-600/16 blur-[130px]",
            color?.accentSoftBg,
          )}
          style={styles?.decorativeAccent}
        />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-white/[0.035] to-transparent" />
      </>
    )
  }

  if (skin === "classic") {
    return (
      <>
        {effectOverlay}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.24]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(120,83,45,0.08) 1px, transparent 1px)",
            backgroundSize: "100% 32px",
          }}
        />
        <div className="pointer-events-none absolute left-[6%] top-0 h-full w-px bg-amber-900/10" />
        <div className="pointer-events-none absolute right-[6%] top-0 h-full w-px bg-amber-900/10" />
      </>
    )
  }

  if (skin === "minimal") {
    return (
      <>
        {effectOverlay}
        <div className="pointer-events-none absolute left-6 top-0 h-full w-px bg-white/[0.045] sm:left-12" />
        <div className="pointer-events-none absolute right-6 top-0 h-full w-px bg-white/[0.045] sm:right-12" />
        <div className="pointer-events-none absolute left-1/2 top-0 h-28 w-px bg-gradient-to-b from-white/20 to-transparent" />
      </>
    )
  }

  if (skin === "bold") {
    return (
      <>
        {effectOverlay}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-3 bg-[repeating-linear-gradient(135deg,#facc15_0,#facc15_12px,#0a0a0a_12px,#0a0a0a_24px)]" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-3 bg-[repeating-linear-gradient(135deg,#facc15_0,#facc15_12px,#0a0a0a_12px,#0a0a0a_24px)]" />
        <div className="pointer-events-none absolute -right-24 top-28 h-72 w-72 rotate-12 border-[24px] border-[#facc15]/[0.045]" />
      </>
    )
  }

  if (skin === "cinema") {
    return (
      <>
        {effectOverlay}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,rgba(0,0,0,0.75)_100%)]" />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 30%, white 0.5px, transparent 0.7px), radial-gradient(circle at 75% 60%, white 0.5px, transparent 0.7px)",
            backgroundSize: "7px 7px, 11px 11px",
          }}
        />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-5 bg-black" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-5 bg-black" />
        <div
          className={cn(
            "pointer-events-none absolute inset-x-0 top-5 h-px bg-zinc-700/60",
            color?.accentDivider,
          )}
          style={styles?.divider}
        />
      </>
    )
  }

  if (skin === "gallery") {
    return (
      <>
        {effectOverlay}
        <div className="pointer-events-none absolute right-4 top-10 select-none text-[10rem] font-extralight leading-none tracking-[-0.08em] text-neutral-900/[0.025] sm:right-12 sm:text-[16rem]">
          EPK
        </div>
        <div className="pointer-events-none absolute left-0 top-36 h-px w-1/3 bg-neutral-200" />
      </>
    )
  }

  if (skin === "luxe") {
    return (
      <>
        {effectOverlay}
        <div className="pointer-events-none absolute inset-4 border border-[#c9a962]/10 sm:inset-8" />
        <div
          className={cn(
            "pointer-events-none absolute -left-24 top-16 h-80 w-80 rounded-full bg-[#c9a962]/10 blur-[110px]",
            color?.accentSoftBg,
          )}
          style={styles?.decorativeAccent}
        />
        <div
          className={cn(
            "pointer-events-none absolute -right-20 bottom-24 h-96 w-96 rounded-full bg-[#8f2d56]/12 blur-[130px]",
            color?.accentSoftBg,
          )}
          style={styles?.decorativeAccent}
        />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-white/[0.025] to-transparent" />
      </>
    )
  }

  if (skin === "poster") {
    return (
      <>
        {effectOverlay}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: `repeating-linear-gradient(-12deg, transparent, transparent 24px, ${
              color?.hasCustomAccent ? "var(--epk-accent)" : "#f07167"
            } 24px, ${color?.hasCustomAccent ? "var(--epk-accent)" : "#f07167"} 25px)`,
          }}
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "radial-gradient(circle, #faf3eb 1px, transparent 1px)",
            backgroundSize: "8px 8px",
          }}
        />
        <div className="pointer-events-none absolute -left-16 top-24 h-40 w-40 -rotate-12 border-[14px] border-[#f07167]/10" />
      </>
    )
  }

  if (skin === "coastal") {
    return (
      <>
        {effectOverlay}
        <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-[44%_56%_60%_40%] bg-[#b8d8ca]/35 blur-2xl" />
        <div className="pointer-events-none absolute -right-20 top-1/3 h-80 w-80 rounded-[58%_42%_38%_62%] bg-[#f4c9a8]/24 blur-3xl" />
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-48 opacity-[0.22]"
          style={{
            backgroundImage:
              "repeating-radial-gradient(ellipse at 50% 120%, transparent 0, transparent 22px, rgba(45,106,90,0.22) 23px, transparent 24px)",
          }}
        />
      </>
    )
  }

  if (isReferenceEpkSkin(skin)) {
    const common = <>{effectOverlay}</>
    if (skin === "scrapbook")
      return (
        <>
          {common}
          <div className="pointer-events-none absolute -left-40 -top-36 h-96 w-96 rounded-full bg-[#d08156]/45" />
          <div className="pointer-events-none absolute -right-40 top-24 h-96 w-96 rounded-full bg-[#78978e]/40" />
        </>
      )
    if (skin === "bandcard")
      return (
        <>
          {common}
          <div className="pointer-events-none absolute inset-y-0 left-0 w-3 bg-[#f5df18]" />
        </>
      )
    if (skin === "dossier")
      return (
        <>
          {common}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(0deg,transparent,transparent 3px,#000 4px)",
            }}
          />
        </>
      )
    if (skin === "pressgrid")
      return (
        <>
          {common}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-2 bg-[#f04b32]" />
        </>
      )
    if (skin === "redcolumn")
      return (
        <>
          {common}
          <div className="pointer-events-none absolute inset-y-0 left-0 w-4 bg-[#e11118]" />
        </>
      )
    if (skin === "checkerboard")
      return (
        <>
          {common}
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-8 opacity-70"
            style={{
              backgroundColor: "#8b3dff",
              backgroundImage:
                "linear-gradient(45deg,#050505 25%,transparent 25%),linear-gradient(-45deg,#050505 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#050505 75%),linear-gradient(-45deg,transparent 75%,#050505 75%)",
              backgroundSize: "24px 24px",
              backgroundPosition: "0 0,0 12px,12px -12px,-12px 0",
            }}
          />
        </>
      )
    if (skin === "editorial")
      return (
        <>
          {common}
          <div className="pointer-events-none absolute -right-32 top-20 h-96 w-96 rounded-full bg-[#ff3542]/10 blur-3xl" />
        </>
      )
    if (skin === "whitespace")
      return (
        <>
          {common}
          <div className="pointer-events-none absolute right-0 top-0 h-full w-px bg-black/10" />
        </>
      )
    if (skin === "colorblock")
      return (
        <>
          {common}
          <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full border border-white/20" />
        </>
      )
    return (
      <>
        {common}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-3 bg-[#d02d20]" />
      </>
    )
  }

  return effectOverlay
}

function EpkCreatedWithFooter({ t }: { t: EpkSkinTokens }) {
  const logoVariant = t.isLightSurface ? "light" : "white"

  return (
    <footer
      className={cn(
        "mt-12 flex items-center justify-center gap-2 text-[11px] font-medium",
        t.isLightSurface ? "text-neutral-500" : "text-white/45",
      )}
    >
      <span>Created with</span>
      <TourifyLogo
        variant={logoVariant}
        size="sm"
        className={cn(
          "h-4 w-auto",
          t.isLightSurface ? "opacity-70" : "opacity-55",
        )}
      />
    </footer>
  )
}

function contentMaxWidth(
  skin: EpkSkinId,
  appearanceWidthClass?: string,
): string {
  if (appearanceWidthClass) return appearanceWidthClass
  if (skin === "classic" || skin === "minimal") return "max-w-5xl"
  if (skin === "gallery") return "max-w-5xl"
  if (skin === "dossier" || skin === "bandcard") return "max-w-4xl"
  if (isReferenceEpkSkin(skin)) return "max-w-6xl"
  return "max-w-6xl"
}

function EpkSectionStack({
  data,
  fontClass,
  showPlaceholder,
  trackingEnabled = false,
  skin,
  resolvedAppearance,
}: EpkTemplateProps & { skin: EpkSkinId }) {
  const [hoveredTrack, setHoveredTrack] = useState<string | null>(null)
  const resolved =
    resolvedAppearance ??
    resolveEpkAppearanceForRender({
      skin,
      appearance: data.epkAppearance ?? getDefaultEpkAppearance(data.template),
    })
  const ctx = createEpkRenderCtx(
    data,
    skin,
    showPlaceholder,
    hoveredTrack,
    setHoveredTrack,
    undefined,
    resolved,
    trackingEnabled,
  )
  const { layout, t } = ctx
  const needsOverflow =
    skin === "modern" ||
    skin === "cinema" ||
    skin === "luxe" ||
    skin === "poster" ||
    isReferenceEpkSkin(skin)

  return (
    <div
      className={cn(
        t.page,
        fontClass,
        resolved.wrapperClassName,
        "relative",
        needsOverflow && "overflow-hidden",
      )}
      style={{ ...resolved.rootStyle, ...resolved.styles.page }}
    >
      <EpkPageChrome
        skin={skin}
        color={resolved.color}
        styles={resolved.styles}
      />
      <div
        className={cn(
          "relative mx-auto px-4 pb-16 pt-10 sm:px-6 lg:px-8",
          contentMaxWidth(skin, resolved.contentMaxWidthClass),
        )}
      >
        {layout.sectionOrder.map((sectionId) => {
          if (!isSectionVisible(sectionId, layout)) return null
          return (
            <React.Fragment key={sectionId}>
              {renderEpkSection(sectionId, ctx)}
            </React.Fragment>
          )
        })}
        <EpkCreatedWithFooter t={t} />
      </div>
    </div>
  )
}

export { EpkPageChrome, contentMaxWidth }

export function ModernEpkTemplate(props: EpkTemplateProps) {
  return <EpkSectionStack {...props} skin="modern" />
}

export function ClassicEpkTemplate(props: EpkTemplateProps) {
  return <EpkSectionStack {...props} skin="classic" />
}

export function MinimalEpkTemplate(props: EpkTemplateProps) {
  return <EpkSectionStack {...props} skin="minimal" />
}

export function BoldEpkTemplate(props: EpkTemplateProps) {
  return <EpkSectionStack {...props} skin="bold" />
}

export function CinemaEpkTemplate(props: EpkTemplateProps) {
  return <EpkSectionStack {...props} skin="cinema" />
}

export function GalleryEpkTemplate(props: EpkTemplateProps) {
  return <EpkSectionStack {...props} skin="gallery" />
}

export function LuxeEpkTemplate(props: EpkTemplateProps) {
  return <EpkSectionStack {...props} skin="luxe" />
}

export function PosterEpkTemplate(props: EpkTemplateProps) {
  return <EpkSectionStack {...props} skin="poster" />
}

export function CoastalEpkTemplate(props: EpkTemplateProps) {
  return <EpkSectionStack {...props} skin="coastal" />
}

export function ScrapbookEpkTemplate(props: EpkTemplateProps) {
  return <EpkSectionStack {...props} skin="scrapbook" />
}

export function BandCardEpkTemplate(props: EpkTemplateProps) {
  return <EpkSectionStack {...props} skin="bandcard" />
}

export function DossierEpkTemplate(props: EpkTemplateProps) {
  return <EpkSectionStack {...props} skin="dossier" />
}

export function PressGridEpkTemplate(props: EpkTemplateProps) {
  return <EpkSectionStack {...props} skin="pressgrid" />
}

export function RedColumnEpkTemplate(props: EpkTemplateProps) {
  return <EpkSectionStack {...props} skin="redcolumn" />
}

export function CheckerboardEpkTemplate(props: EpkTemplateProps) {
  return <EpkSectionStack {...props} skin="checkerboard" />
}

export function EditorialEpkTemplate(props: EpkTemplateProps) {
  return <EpkSectionStack {...props} skin="editorial" />
}

export function WhitespaceEpkTemplate(props: EpkTemplateProps) {
  return <EpkSectionStack {...props} skin="whitespace" />
}

export function ColorBlockEpkTemplate(props: EpkTemplateProps) {
  return <EpkSectionStack {...props} skin="colorblock" />
}

export function SunburstEpkTemplate(props: EpkTemplateProps) {
  return <EpkSectionStack {...props} skin="sunburst" />
}
