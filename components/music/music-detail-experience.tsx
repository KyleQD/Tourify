"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, ArrowRight, Disc3, Heart, ListPlus, LockKeyhole, Music2, Pause, Play, Share2 } from "lucide-react"
import { toast } from "sonner"
import { useJukeboxOptional, type JukeboxTrack } from "@/contexts/jukebox-context"
import { TrackCoverImage } from "@/components/jukebox/track-cover-image"
import { getArtistPublicProfilePath } from "@/lib/utils/public-profile-routes"
import type { PublicMusicItem } from "@/lib/music/public-catalog-detail"


function isReleaseKind(kind: PublicMusicItem["kind"]): boolean {
  return kind === "album" || kind === "ep" || kind === "mixtape"
}

function trackFromItem(item: PublicMusicItem): JukeboxTrack {
  return {
    id: item.id,
    title: item.title,
    artist_name: item.artistName,
    artist_id: item.ownerUserId || undefined,
    duration: item.duration ?? undefined,
    cover_art_url: item.artworkUrl ?? undefined,
    genre: item.genre ?? undefined,
    tags: item.tags,
    access_mode: item.accessMode,
    is_public: true,
    file_url: "/api/music/stream?trackId=" + encodeURIComponent(item.id),
  }
}

function readableReleaseDate(date: string | null): string | null {
  if (!date || !/^\d{4}-\d\d-\d\d/.test(date)) return null
  const d = new Date(date + (date.length === 10 ? "T00:00:00Z" : ""))
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" })
}

function MetadataPill({ children }: { children: React.ReactNode }) {
  return <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs text-slate-200">{children}</span>
}

export function MusicDetailExperience({
  item, related,
}: {
  item: PublicMusicItem
  related: PublicMusicItem[]
}) {
  const ctx = useJukeboxOptional()
  const [saving, setSaving] = useState(false)
  const current = ctx?.state.currentTrack?.id === item.id
  const playing = Boolean(current && ctx?.state.isPlaying)
  const artistHref = item.artistHandle ? getArtistPublicProfilePath(item.artistHandle) : null
  const release = isReleaseKind(item.kind)
  const releaseDate = readableReleaseDate(item.releaseDate)

  function togglePlay() {
    if (!ctx || !item.hasStream) return
    if (current) ctx.togglePlayPause()
    else ctx.play(trackFromItem(item), { source: release ? "music-release-detail" : "music-track-detail" })
  }

  async function saveToLibrary() {
    if (saving) return
    setSaving(true)
    try {
      const response = await fetch("/api/music/library", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ musicId: item.id }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) {
        toast.error(response.status === 401 ? "Sign in to save this music" : result?.error?.message || "Couldn't save this music")
      } else {
        toast.success("Saved to your library")
      }
    } catch {
      toast.error("Couldn't reach your library")
    } finally {
      setSaving(false)
    }
  }

  async function shareMusic() {
    try {
      await navigator.clipboard.writeText(window.location.href)
      toast.success("Music link copied")
    } catch {
      toast.error("This browser couldn't copy the music link")
    }
  }

  return (
    <main className="min-h-screen bg-[#080913] pb-28 text-white">
      <div className="mx-auto max-w-6xl space-y-9 px-4 py-7 sm:px-7 sm:py-10">
        <nav aria-label="Music breadcrumbs" className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
          <Link href="/music/discover" className="inline-flex items-center gap-1 hover:text-violet-200"><ArrowLeft className="h-3.5 w-3.5" />Music Discovery</Link>
          <span aria-hidden="true">/</span>
          {release && <><Link href="/music/releases" className="hover:text-violet-200">Releases</Link><span aria-hidden="true">/</span></>}
          <span className="max-w-64 truncate font-semibold text-slate-200" aria-current="page">{item.title}</span>
        </nav>

        <section className="relative overflow-hidden rounded-[30px] border border-violet-300/15 bg-gradient-to-br from-[#312354] via-[#16182e] to-[#0c101f] p-5 sm:p-9">
          <div className="pointer-events-none absolute -right-24 -top-28 h-80 w-80 rounded-full bg-fuchsia-500/20 blur-[75px]" aria-hidden="true" />
          <div className="relative grid items-end gap-7 md:grid-cols-[minmax(200px,300px)_1fr]">
            <div className="aspect-square overflow-hidden rounded-[24px] border border-white/15 bg-slate-800 p-2 shadow-2xl shadow-black/40">
              <TrackCoverImage src={item.artworkUrl} trackId={item.id} alt={item.title + " cover art"} className="h-full w-full rounded-[18px]" iconClassName="h-16 w-16" />
            </div>
            <div className="min-w-0 space-y-3">
              <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-fuchsia-200">
                <Disc3 className="h-4 w-4" />{release ? item.kind.toUpperCase() + " release" : "Music • " + (item.kind === "single" ? "Single" : "Track")}
              </p>
              <h1 className="break-words text-3xl font-black tracking-tight sm:text-5xl">{item.title}</h1>
              {artistHref ? <Link href={artistHref} className="inline-flex items-center gap-1.5 text-lg font-semibold text-violet-200 hover:text-white">
                {item.artistName}<ArrowRight className="h-4 w-4" />
              </Link> : <p className="text-lg font-semibold text-violet-200">{item.artistName}</p>}
              <div className="flex flex-wrap gap-2">
                {item.genre && <MetadataPill>{item.genre}</MetadataPill>}
                {releaseDate && <MetadataPill>{releaseDate}</MetadataPill>}
                {item.accessMode === "paid" && <MetadataPill><LockKeyhole className="mr-1 h-3 w-3" />Entitlement required</MetadataPill>}
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                <button type="button" disabled={!item.hasStream || !ctx} onClick={togglePlay}
                  className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-40">
                  {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  {playing ? "Pause" : item.accessMode === "paid" ? "Listen if eligible" : "Play now"}
                </button>
                <button type="button" onClick={saveToLibrary} disabled={saving}
                  className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-3 text-xs font-semibold hover:bg-white/20 disabled:opacity-40"><Heart className="h-4 w-4" />Save</button>
                <button type="button" onClick={() => ctx?.addToQueue(trackFromItem(item))}
                  disabled={!ctx || !item.hasStream} className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-3 text-xs font-semibold hover:bg-white/20 disabled:opacity-40">
                  <ListPlus className="h-4 w-4" />Queue
                </button>
                <button type="button" onClick={shareMusic}
                  className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-3 text-xs font-semibold hover:bg-white/20"><Share2 className="h-4 w-4" />Share</button>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-400">
                Listening uses Tourify's authorized music stream. Availability and previews depend on the artist's settings and your account.
              </p>
            </div>
          </div>
        </section>

        <div className="grid gap-6 md:grid-cols-[minmax(0,1.55fr)_minmax(240px,1fr)]">
          <section className="space-y-4 rounded-[26px] border border-white/10 bg-[#101424] p-5 sm:p-7">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-300">Go a little deeper</p>
            <h2 className="text-2xl font-bold">{release ? "Inside this release" : "Behind this track"}</h2>
            {item.description ? <p className="whitespace-pre-line text-sm leading-7 text-slate-300">{item.description}</p> :
              <p className="text-sm leading-7 text-slate-400">The artist hasn't added a public description for this music yet.</p>}
            {release && (
              <div className="rounded-2xl border border-violet-400/15 bg-violet-500/5 p-4">
                <h3 className="text-sm font-semibold">Release credits & tracklist</h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-400">This release has been published as a {item.kind.toUpperCase()} upload. Individual tracklist and contributor credits will appear when the artist associates them with this release; we won't guess which songs belong to it.</p>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <Link href={"/music/discover?artistId=" + encodeURIComponent(item.ownerUserId)}
                className="inline-flex items-center gap-1 rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-2 text-xs font-semibold text-violet-200 hover:bg-violet-500/20">Explore this artist's music <ArrowRight className="h-3.5 w-3.5" /></Link>
              {item.genre && <Link href={"/music/discover?genre=" + encodeURIComponent(item.genre)}
                className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-white/10">Explore {item.genre}</Link>}
            </div>
          </section>
          <aside className="space-y-3 rounded-[26px] border border-white/10 bg-[#101424] p-5 sm:p-7">
            <h2 className="text-lg font-bold">Keep exploring</h2>
            {artistHref && <Link href={artistHref} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-3 text-sm font-medium hover:bg-white/10">
              <span>Meet {item.artistName}</span><ArrowRight className="h-4 w-4 text-violet-300" />
            </Link>}
            <Link href="/music/discover" className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-3 text-sm font-medium hover:bg-white/10">
              <span>More music discovery</span><ArrowRight className="h-4 w-4 text-violet-300" />
            </Link>
            <Link href="/music/releases" className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-3 text-sm font-medium hover:bg-white/10">
              <span>Browse releases</span><ArrowRight className="h-4 w-4 text-violet-300" />
            </Link>
            <Link href="/discover" className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-3 text-sm font-medium hover:bg-white/10">
              <span>Find artists & shows</span><ArrowRight className="h-4 w-4 text-violet-300" />
            </Link>
          </aside>
        </div>

        {related.length > 0 && (
          <section className="space-y-4" aria-label="More music by this artist">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-fuchsia-300">Your next listen</p>
              <h2 className="text-2xl font-bold">More by {item.artistName}</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((next) => (
                <Link key={next.id} href={isReleaseKind(next.kind) ? "/music/releases/" + encodeURIComponent(next.id) : "/music/tracks/" + encodeURIComponent(next.id)}
                  className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3 transition hover:border-violet-400/40 hover:bg-white/[0.07]">
                  <TrackCoverImage src={next.artworkUrl} trackId={next.id} alt="" className="h-14 w-14 rounded-xl" iconClassName="h-6 w-6" />
                  <span className="min-w-0 flex-1"><strong className="block truncate text-sm">{next.title}</strong><span className="block truncate text-xs text-slate-400">{next.genre || next.kind}</span></span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-violet-300 transition group-hover:translate-x-0.5" />
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  )
}
