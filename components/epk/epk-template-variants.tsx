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
import {
  Calendar,
  Download,
  ExternalLink,
  Globe,
  Image as ImageIcon,
  Link2,
  Mail,
  MapPin,
  Music,
  Newspaper,
  Play,
  Share2,
  Sparkles,
} from "lucide-react"
import { EPK_SKIN_TOKENS, type EpkSkinId, type EpkSkinTokens } from "@/lib/epk/epk-skin-tokens"
import {
  getDefaultEpkAppearance,
  resolveEpkAppearanceForRender,
  type ResolvedEpkAppearance,
} from "@/lib/epk/epk-appearance"

export interface EpkTemplateProps {
  data: EPKData
  fontClass: string
  showPlaceholder: boolean
  /** When set, reused instead of resolving from data.epkAppearance (e.g. builder + overlay). */
  resolvedAppearance?: ResolvedEpkAppearance
}

export interface EpkSectionRenderCtx {
  data: EPKData
  skin: EpkSkinId
  showPlaceholder: boolean
  layout: EPKData["layout"]
  t: EpkSkinTokens
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
  /** When provided, simple text fields become inline-editable in builder mode. */
  editableField?: (
    field: string,
    value: string,
    placeholder: string,
    opts?: { multiline?: boolean; className?: string }
  ) => React.ReactNode
}

export function createEpkRenderCtx(
  data: EPKData,
  skin: EpkSkinId,
  showPlaceholder: boolean,
  hoveredTrack: string | null,
  setHoveredTrack: (id: string | null) => void,
  editableField?: EpkSectionRenderCtx["editableField"],
  resolvedAppearance?: ResolvedEpkAppearance
): EpkSectionRenderCtx {
  const resolved =
    resolvedAppearance ??
    resolveEpkAppearanceForRender({
      skin,
      appearance: data.epkAppearance ?? getDefaultEpkAppearance(data.template),
    })
  const t = resolved.mergedTokens
  const layout = normalizeEpkLayout(data.layout)
  const accent = accentFromEditorTemplate(data.template)
  const ph = (v: string, p: string) => displayOrPlaceholder(v, p, showPlaceholder)
  const empty = (v: string) => !v?.trim()
  const name = ph(data.artistName, "Artist name")
  const initial = (data.artistName?.trim()?.[0] || "?").toUpperCase()
  const mutedPh = (v: string) =>
    skin === "classic" ? placeholderToneLight(empty(v)) : placeholderTone(empty(v))
  const accentRing =
    accent === "neon"
      ? "ring-cyan-400/40 shadow-[0_0_40px_-10px_rgba(34,211,238,0.45)]"
      : accent === "sunset"
        ? "ring-orange-400/30 shadow-[0_0_40px_-10px_rgba(251,146,60,0.35)]"
        : "ring-indigo-400/25"
  const minimalAccent =
    accent === "black"
      ? "border-emerald-500/40 text-emerald-300/90"
      : accent === "neon"
        ? "border-cyan-400/40 text-cyan-200/90"
        : "border-white/20 text-white/80"

  return {
    data,
    skin,
    showPlaceholder,
    layout,
    t,
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
    editableField,
  }
}

function renderStatGrid(ctx: EpkSectionRenderCtx) {
  const { data, skin, t, layout, minimalAccent } = ctx
  if (!statsBelongInHero(layout)) return null
  return (
    <div className="grid grid-cols-3 gap-3 pt-2 sm:gap-4">
      {[
        { k: "followers", label: "Followers", v: data.stats.followers },
        { k: "monthly", label: "Monthly listeners", v: data.stats.monthlyListeners },
        { k: "streams", label: "Streams", v: data.stats.totalStreams },
      ].map((s) => (
        <div
          key={s.k}
          className={cn(
            "rounded-xl border px-3 py-3 text-center",
            skin === "classic" && "border-stone-200 bg-amber-50/50 text-stone-900",
            skin === "minimal" && cn("border-white/10 bg-white/[0.04]", minimalAccent),
            skin === "bold" && "border-2 border-[#facc15] bg-zinc-950 text-white",
            skin === "modern" && "border-white/10 bg-white/5 text-white"
          )}
        >
          <div className={cn("text-lg font-semibold tabular-nums sm:text-xl", skin === "bold" && "text-[#facc15]")}>
            {formatEpkNumber(s.v)}
          </div>
          <div className={cn(
            "text-[11px] uppercase tracking-wide",
            skin === "classic" && "text-stone-500",
            skin === "minimal" && "text-white/45",
            skin === "bold" && "text-white/80",
            skin === "modern" && "text-white/45"
          )}>
            {s.label}
          </div>
        </div>
      ))}
    </div>
  )
}

function renderHero(ctx: EpkSectionRenderCtx): React.ReactNode {
  const {
    data,
    skin,
    showPlaceholder,
    t,
    accent,
    ph,
    empty,
    name,
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
  const eName = editableField?.("artistName", data.artistName, "Artist name") ?? (
    <span className={cn(empty(data.artistName) && showPlaceholder && (skin === "classic" ? "italic text-stone-400" : "italic opacity-60"))}>{name}</span>
  )
  const eGenre = editableField?.("genre", data.genre, "Genre") ?? ph(data.genre, "Genre")
  const eLocation = editableField?.("location", data.location, "City, region") ?? ph(data.location, "City, region")

  if (skin === "classic") {
    return (
      <header key="hero" className={heroGapClass}>
        <div className={cn("relative -mx-4 overflow-hidden rounded-xl sm:mx-0", classicCoverHeightClass)}>
          {data.coverUrl ? (
            <img src={data.coverUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-amber-200/50 to-rose-200/40" />
          )}
          <div
            className={cn(
              "absolute inset-0 bg-gradient-to-t to-transparent",
              classicCoverOverlayFromClass
            )}
          />
        </div>
        <div className={cn("relative z-10 -mt-14 mx-auto max-w-4xl", t.card)}>
          <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:items-end sm:text-left">
            <Avatar className={cn("border-4 border-white shadow-lg", av)}>
              <AvatarImage src={data.avatarUrl} className="object-cover" />
              <AvatarFallback
                className={cn("bg-amber-800 text-2xl text-white", avatarShapeClass)}
              >
                {initial}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1 space-y-3">
              <h1 className="font-serif text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl">{eName}</h1>
              <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <Badge className={t.badge}>{eGenre}</Badge>
                <span className="inline-flex items-center gap-1.5 text-sm text-stone-600"><MapPin className="h-4 w-4 shrink-0" />{eLocation}</span>
              </div>
              {statGrid}
              <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
                <Button size="sm" className={t.btnPrimary}><Mail className="mr-2 h-4 w-4" />Contact</Button>
                <Button size="sm" variant="outline" className={t.btnGhost}><Share2 className="mr-2 h-4 w-4" />Share</Button>
              </div>
            </div>
          </div>
        </div>
      </header>
    )
  }

  if (skin === "minimal") {
    return (
      <header key="hero" className={cn("px-4 py-10 text-center", heroGapClass, minimalAccent)}>
        <div className="mx-auto max-w-xl space-y-6">
          <div className="relative mx-auto w-fit">
            <div
              className={cn("absolute inset-0 scale-110 border border-white/10", avatarShapeClass)}
            />
            <Avatar className={cn("relative border border-white/20", av)}>
              <AvatarImage src={data.avatarUrl} className="object-cover" />
              <AvatarFallback
                className={cn("bg-transparent text-2xl text-white", avatarShapeClass)}
              >
                {initial}
              </AvatarFallback>
            </Avatar>
          </div>
          <h1 className="text-4xl font-light tracking-tight sm:text-5xl">{eName}</h1>
          <p className="text-sm font-light uppercase tracking-[0.35em] text-white/55">{eGenre}</p>
          <p className="text-sm text-white/45">{eLocation}</p>
          {statGrid}
          <div className="flex justify-center gap-3">
            <Button size="sm" className={t.btnPrimary}><Mail className="mr-2 h-4 w-4" />Contact</Button>
            <Button size="sm" className={t.btnGhost}><Share2 className="mr-2 h-4 w-4" />Share</Button>
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
          heroGapClass
        )}
      >
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-6">
          <div className="relative">
            <div className={cn("absolute -inset-1 rotate-3 border-2 border-[#facc15]", avatarShapeClass)} />
            <Avatar className={cn("relative border-2 border-white", av)}>
              <AvatarImage src={data.avatarUrl} className="object-cover" />
              <AvatarFallback
                className={cn("bg-zinc-900 text-3xl font-black text-[#facc15]", avatarShapeClass)}
              >
                {initial}
              </AvatarFallback>
            </Avatar>
          </div>
          <h1 className="text-5xl font-black uppercase leading-none tracking-tight text-[#facc15] sm:text-6xl">{eName}</h1>
          <div className="flex flex-wrap justify-center gap-2">
            <span className={t.badge}>{eGenre}</span>
            <span className={t.badge}>{eLocation}</span>
          </div>
          {statGrid}
          <div className="flex flex-wrap justify-center gap-3">
            <Button size="sm" className={t.btnPrimary}><Mail className="mr-2 h-4 w-4" />Contact</Button>
            <Button size="sm" className={t.btnGhost}><Share2 className="mr-2 h-4 w-4" />Share</Button>
          </div>
        </div>
      </header>
    )
  }

  return (
    <header
      key="hero"
      className={cn(
        "rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.08] to-white/[0.02] p-6 sm:p-8",
        accentRing,
        heroGapClass
      )}
    >
      <div className="flex flex-col items-center gap-6 text-center lg:flex-row lg:items-start lg:text-left">
        <div className="relative shrink-0">
          <div
            className={cn(
              "p-[3px]",
              avatarShapeClass,
              accent === "neon"
                ? "bg-gradient-to-br from-cyan-400 to-blue-600"
                : "bg-gradient-to-br from-indigo-400 to-fuchsia-500"
            )}
          >
            <Avatar className={cn("border-2 border-[#07080f]", av)}>
              <AvatarImage src={data.avatarUrl} className="object-cover" />
              <AvatarFallback
                className={cn("bg-indigo-900 text-2xl text-white", avatarShapeClass)}
              >
                {initial}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
        <div className="min-w-0 flex-1 space-y-4">
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">{eName}</h1>
          <div className="flex flex-wrap items-center justify-center gap-2 lg:justify-start">
            <Badge variant="secondary" className="rounded-lg border border-white/15 bg-white/10 px-3 py-1 text-sm font-normal text-white/90">{eGenre}</Badge>
            <span className="inline-flex items-center gap-1.5 text-sm text-white/65"><MapPin className="h-4 w-4 shrink-0 opacity-70" />{eLocation}</span>
          </div>
          {statGrid}
          <div className="flex flex-wrap justify-center gap-2 lg:justify-start">
            <Button size="sm" className="rounded-xl bg-indigo-500 text-white hover:bg-indigo-400"><Mail className="mr-2 h-4 w-4" />Contact</Button>
            <Button size="sm" variant="outline" className="rounded-xl border-white/20 bg-transparent text-white hover:bg-white/10"><Share2 className="mr-2 h-4 w-4" />Share</Button>
          </div>
        </div>
      </div>
    </header>
  )
}

export function renderEpkSection(
  sectionId: string,
  ctx: EpkSectionRenderCtx
): React.ReactNode | null {
  const {
    data,
    skin,
    showPlaceholder,
    layout,
    t,
    ph,
    empty,
    mutedPh,
    hoveredTrack,
    setHoveredTrack,
    sectionGapClass: g,
  } = ctx

  if (sectionId === "hero") return renderHero(ctx)

  if (sectionId === "one-liner") {
    const eOneLiner = ctx.editableField?.("bookingAssets.oneLiner", data.bookingAssets?.oneLiner || "", "Your one-line pitch for bookers and festivals appears here.") ?? (
      <p className={cn("text-center leading-relaxed sm:text-lg", t.subheading, skin === "classic" && "font-serif not-italic text-stone-800", mutedPh(data.bookingAssets?.oneLiner || ""))}>
        {ph(data.bookingAssets?.oneLiner || "", "Your one-line pitch for bookers and festivals appears here.")}
      </p>
    )
    return (
      <section key="one-liner" className={g}>
        <div className={t.oneLinerWrap}>{eOneLiner}</div>
      </section>
    )
  }

  if (sectionId === "stats") {
    if (!shouldRenderStandaloneStats(layout)) return null
    return (
      <section key="stats" className={g}>
        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          {[
            { label: "Followers", v: data.stats.followers },
            { label: "Monthly listeners", v: data.stats.monthlyListeners },
            { label: "Streams", v: data.stats.totalStreams },
          ].map((s) => (
            <div key={s.label} className={cn(t.cardMuted, "px-3 py-4 text-center")}>
              <div className={cn("text-xl font-semibold tabular-nums", skin === "bold" && "text-[#facc15]")}>{formatEpkNumber(s.v)}</div>
              <div className={cn("text-[11px] uppercase tracking-wide", skin === "classic" && "text-stone-500", skin === "minimal" && "text-white/45", skin === "bold" && "text-white/75", skin === "modern" && "text-white/45")}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>
    )
  }

  if (sectionId === "bio") {
    const eBio = ctx.editableField?.("bio", data.bio ?? "", "Tell your story — bio, influences, and what makes your live show stand out.", { multiline: true }) ?? (
      <p className={cn(t.subheading, "sm:text-base", mutedPh(data.bio ?? ""))}>{ph(data.bio, "Tell your story — bio, influences, and what makes your live show stand out.")}</p>
    )
    return (
      <section key="bio" className={g}>
        <div className={t.card}>
          <h2 className={cn("mb-3 flex items-center gap-2", t.heading)}><Sparkles className={cn("h-5 w-5", t.accentIcon)} />Biography</h2>
          {eBio}
        </div>
      </section>
    )
  }

  if (sectionId === "music") {
    if (data.music.length === 0 && !showPlaceholder) return null
    return (
      <section key="music" className={g}>
        <div className={t.card}>
          <h2 className={cn("mb-4 flex items-center gap-2", t.heading)}><Music className={cn("h-5 w-5", t.accentIcon)} />Music</h2>
          <div className="space-y-2">
            {data.music.length > 0
              ? data.music.map((track) => (
                  <div key={track.id} className={cn("flex items-center gap-3 rounded-xl border px-3 py-3 transition-colors", t.cardMuted, hoveredTrack === track.id && skin === "modern" && "bg-white/10")} onMouseEnter={() => setHoveredTrack(track.id)} onMouseLeave={() => setHoveredTrack(null)}>
                    <div className={cn("h-12 w-12 shrink-0 overflow-hidden rounded-lg", skin === "bold" ? "bg-zinc-800" : "bg-gradient-to-br from-indigo-600 to-violet-600")}>
                      {track.coverArt ? <img src={track.coverArt} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center"><Music className={cn("h-5 w-5", skin === "classic" ? "text-white" : "text-white/80")} /></div>}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className={cn("truncate font-medium", skin === "classic" && "text-stone-900", skin === "bold" && "font-black uppercase text-white")}>{track.title}</div>
                      <div className={cn("text-xs", skin === "classic" && "text-stone-500", skin === "minimal" && "text-white/45", skin === "bold" && "text-[#facc15]", skin === "modern" && "text-white/50")}>{formatEpkNumber(track.streams)} streams</div>
                    </div>
                    <Button size="sm" className={cn("shrink-0", skin === "bold" ? t.btnPrimary : "bg-white/10 hover:bg-white/20 text-white")}><Play className="h-4 w-4" /></Button>
                  </div>
                ))
              : [0, 1, 2].map((i) => (
                  <div key={i} className={cn("flex items-center gap-3 rounded-xl px-3 py-3", t.dashed)}>
                    <div className="h-12 w-12 shrink-0 rounded-lg bg-white/10" />
                    <div className="flex-1 space-y-2"><div className="h-3 max-w-[10rem] rounded bg-white/10" /><div className="h-2 max-w-[6rem] rounded bg-white/5" /></div>
                    <Button size="sm" variant="ghost" className="text-white/40" disabled><Play className="h-4 w-4" /></Button>
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
      <section key="shows" className={g}>
        <div className={t.card}>
          <h2 className={cn("mb-4 flex items-center gap-2", t.heading)}><Calendar className={cn("h-5 w-5", t.accentIcon)} />Upcoming shows</h2>
          {data.upcomingShows.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {data.upcomingShows.map((show) => (
                <div key={show.id} className={cn("rounded-xl border p-4", t.cardMuted)}>
                  <div className={cn("font-medium", skin === "classic" && "text-stone-900", skin === "bold" && "font-black uppercase text-[#facc15]")}>{show.venue}</div>
                  <div className={cn("mt-1 flex items-center gap-1 text-xs", skin === "classic" && "text-stone-600", skin === "minimal" && "text-white/45", skin === "bold" && "text-white", skin === "modern" && "text-white/55")}><MapPin className="h-3.5 w-3.5" />{show.location}</div>
                  <div className={cn("mt-1 text-xs", skin === "classic" && "text-stone-500", skin === "minimal" && "text-white/35", skin === "bold" && "text-white/70", skin === "modern" && "text-white/45")}>{show.date ? formatSafeDate(show.date) : "—"}</div>
                  {show.ticketUrl ? <Button size="sm" className={cn("mt-3 w-full", t.btnPrimary)}>Tickets</Button> : null}
                </div>
              ))}
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {[0, 1].map((i) => (<div key={i} className={cn("rounded-xl p-4", t.dashed)}><div className="mb-2 h-4 max-w-[60%] rounded bg-white/10" /><div className="mb-1 h-3 max-w-[40%] rounded bg-white/5" /><div className="h-3 max-w-[33%] rounded bg-white/5" /></div>))}
            </div>
          )}
        </div>
      </section>
    )
  }

  if (sectionId === "press") {
    if (data.press.length === 0 && !showPlaceholder) return null
    return (
      <section key="press" className={g}>
        <div className={t.card}>
          <h2 className={cn("mb-4 flex items-center gap-2", t.heading)}><Newspaper className={cn("h-5 w-5", t.accentIcon)} />Press</h2>
          {data.press.length > 0 ? (
            <ul className="space-y-3">
              {data.press.map((p) => (
                <li key={p.id} className={cn("flex flex-col gap-1 rounded-xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between", t.cardMuted)}>
                  <div>
                    <div className={cn("font-medium", skin === "classic" && "text-stone-900", skin === "bold" && "font-bold uppercase text-white")}>{p.title}</div>
                    <div className={cn("text-xs", skin === "classic" && "text-stone-500", skin === "minimal" && "text-white/45", skin === "bold" && "text-[#facc15]", skin === "modern" && "text-white/50")}>{p.outlet} · {p.date}</div>
                  </div>
                  {p.url ? <a href={p.url} className={cn("inline-flex items-center gap-1 text-xs hover:underline", skin === "classic" && "text-amber-800", skin === "bold" && "text-[#facc15]", skin === "modern" && "text-indigo-300")}>Read <ExternalLink className="h-3 w-3" /></a> : null}
                </li>
              ))}
            </ul>
          ) : (
            <div className="space-y-3">
              {[0, 1].map((i) => (<div key={i} className={cn("rounded-xl px-4 py-3", t.dashed)}><div className="h-3 max-w-[66%] rounded bg-white/10" /><div className="mt-2 h-2 max-w-[33%] rounded bg-white/5" /></div>))}
            </div>
          )}
        </div>
      </section>
    )
  }

  if (sectionId === "media") {
    if (data.photos.length === 0 && !showPlaceholder) return null
    return (
      <section key="media" className={g}>
        <div className={t.card}>
          <h2 className={cn("mb-4 flex items-center gap-2", t.heading)}><ImageIcon className={cn("h-5 w-5", t.accentIcon)} />Photos</h2>
          {data.photos.length > 0 ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {data.photos.map((p) => (<div key={p.id} className="aspect-square overflow-hidden rounded-lg border border-white/10 bg-white/5">{p.url ? <img src={p.url} alt="" className="h-full w-full object-cover" /> : null}</div>))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {[0, 1, 2, 3, 4, 5].map((i) => (<div key={i} className="aspect-square rounded-lg border border-dashed border-white/15 bg-white/[0.04]" />))}
            </div>
          )}
        </div>
      </section>
    )
  }

  if (sectionId === "contact") {
    const contactFields = [
      { label: "Email", field: "contact.email", value: data.contact.email, ph: "booking@you.com" },
      { label: "Booking", field: "contact.bookingEmail", value: data.contact.bookingEmail, ph: "booking@you.com" },
      { label: "Phone", field: "contact.phone", value: data.contact.phone, ph: "+1 ···" },
      { label: "Web", field: "contact.website", value: data.contact.website, ph: "https://…" },
    ]
    return (
      <section key="contact" className={g}>
        <div className={t.card}>
          <h2 className={cn("mb-4", t.heading)}>Contact</h2>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            {contactFields.map((row) => (
              <div key={row.label} className={cn("rounded-lg border px-3 py-2", t.cardMuted)}>
                <dt className={cn("text-[11px] uppercase tracking-wide", skin === "classic" && "text-stone-500", skin === "minimal" && "text-white/40", skin === "bold" && "text-white/60", skin === "modern" && "text-white/45")}>{row.label}</dt>
                <dd className={cn("mt-0.5 break-all", skin === "classic" ? placeholderToneLight(empty(row.value) && showPlaceholder) : placeholderTone(empty(row.value) && showPlaceholder))}>
                  {ctx.editableField?.(row.field, row.value, row.ph) ?? ph(row.value, row.ph)}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
    )
  }

  if (sectionId === "social") {
    const links = data.social
    if (links.length === 0 && !showPlaceholder) return null
    return (
      <section key="social" className={g}>
        <div className={t.card}>
          <h2 className={cn("mb-4 flex items-center gap-2", t.heading)}><Globe className={cn("h-5 w-5", t.accentIcon)} />Social</h2>
          {!links.length && showPlaceholder ? (
            <div className="flex flex-wrap gap-2">
              {["Instagram", "Spotify", "YouTube"].map((p) => (<div key={p} className={cn("rounded-lg border px-4 py-2 text-sm", t.dashed, skin === "classic" && "text-stone-400")}>{p}</div>))}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {links.map((link) => (
                <Button key={link.id} variant="outline" size="sm" className={cn(skin === "classic" && "border-stone-300 bg-white text-stone-800 hover:bg-stone-50", skin === "minimal" && t.btnGhost, skin === "bold" && t.btnGhost, skin === "modern" && "border-white/20 bg-white/[0.04] text-white hover:bg-white/10")}>
                  {getSocialIcon(link.platform)}<span className="ml-2">{link.platform}</span>
                </Button>
              ))}
            </div>
          )}
        </div>
      </section>
    )
  }

  if (sectionId === "booking") {
    return (
      <section key="booking" className={g}>
        <div className={t.card}>
          <h2 className={cn("mb-4 flex items-center gap-2", t.heading)}><Link2 className={cn("h-5 w-5", t.accentIcon)} />Booking assets</h2>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" size="sm" className={cn(skin === "classic" && "border-stone-300", skin === "modern" && "border-white/20", !data.bookingAssets.techRiderUrl && "pointer-events-none opacity-50")}><Download className="mr-2 h-4 w-4" />Tech rider</Button>
            <Button variant="outline" size="sm" className={cn(skin === "classic" && "border-stone-300", skin === "modern" && "border-white/20", !data.bookingAssets.stagePlotUrl && "pointer-events-none opacity-50")}><Download className="mr-2 h-4 w-4" />Stage plot</Button>
          </div>
          {showPlaceholder && !data.bookingAssets.techRiderUrl && (
            <p className={cn("mt-3 text-xs", skin === "classic" && "text-stone-500", skin === "modern" && "text-white/40")}>
              Upload tech rider and stage plot in EPK settings — buttons activate when URLs are set.
            </p>
          )}
        </div>
      </section>
    )
  }

  return null
}

function EpkSectionStack({
  data,
  fontClass,
  showPlaceholder,
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
    resolved
  )
  const { layout, t } = ctx

  return (
    <div
      className={cn(t.page, fontClass, resolved.wrapperClassName, skin === "modern" && "overflow-hidden")}
      style={resolved.rootStyle}
    >
      {skin === "modern" && (
        <>
          <div className="pointer-events-none absolute inset-0 opacity-[0.35]" style={{ backgroundImage: `linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)`, backgroundSize: "48px 48px" }} />
          <div className="pointer-events-none absolute -left-32 top-20 h-72 w-72 rounded-full bg-indigo-600/25 blur-3xl" />
          <div className="pointer-events-none absolute -right-24 bottom-32 h-80 w-80 rounded-full bg-violet-600/20 blur-3xl" />
        </>
      )}
      <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-10 sm:px-6 lg:px-8">
        {layout.sectionOrder.map((sectionId) => {
          if (!isSectionVisible(sectionId, layout)) return null
          return <React.Fragment key={sectionId}>{renderEpkSection(sectionId, ctx)}</React.Fragment>
        })}
      </div>
    </div>
  )
}

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
