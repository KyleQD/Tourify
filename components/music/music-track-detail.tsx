"use client"

import Link from "next/link"
import { useState, type FormEvent } from "react"
import {
  ArrowLeft,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Download,
  ExternalLink,
  Heart,
  MessageCircle,
  Music2,
  Play,
  Share2,
  ShoppingBag,
  Tag,
} from "lucide-react"
import { toast } from "sonner"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { MusicComment } from "@/components/music/music-comment"
import { MusicPlayer } from "@/components/music/music-player"
import { MusicShareDialog } from "@/components/music/music-share-dialog"
import { TrackCoverImage } from "@/components/jukebox/track-cover-image"
import { useJukeboxOptional, type JukeboxTrack } from "@/contexts/jukebox-context"
import { getMusicTrackPath } from "@/lib/music/routes"
import type { PublicTrackPageData } from "@/lib/music/public-track"

function formatDuration(value?: number | null) {
  if (!value) return "0:00"
  return `${Math.floor(value / 60)}:${String(Math.floor(value % 60)).padStart(2, "0")}`
}

function formatDate(value?: string | null) {
  if (!value) return null
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value))
}

function toJukeboxTrack(track: any, artistName: string): JukeboxTrack {
  return {
    id: track.id,
    title: track.title,
    artist_name: artistName,
    artist_id: track.user_id,
    duration: track.duration || undefined,
    file_url: `/api/music/stream?trackId=${encodeURIComponent(track.id)}`,
    cover_art_url: track.cover_art_url || undefined,
    genre: track.genre || undefined,
    is_public: true,
  }
}

function Stat({ icon: Icon, label, value }: { icon: typeof Clock3; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.045] px-3 py-2">
      <Icon className="h-4 w-4 text-violet-300" />
      <span className="text-xs text-slate-400">{label}</span>
      <span className="text-sm font-medium text-white">{value}</span>
    </div>
  )
}

export function MusicTrackDetail({ data }: { data: PublicTrackPageData }) {
  const { track, artist, relatedTracks, upcomingEvents, listing } = data
  const jukebox = useJukeboxOptional()
  const [showShare, setShowShare] = useState(false)
  const [comment, setComment] = useState("")
  const [commenting, setCommenting] = useState(false)

  const playRelated = (related: any) => {
    if (!jukebox) return
    jukebox.play(toJukeboxTrack(related, artist.name))
  }

  const createPost = async (selected: { id: string; title: string }, note?: string) => {
    const response = await fetch("/api/music/share", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ musicId: selected.id, createPost: true, content: note?.trim() || `Check out “${selected.title}”` }),
    })
    const body = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(body?.error?.message || body?.error || "Failed to share track")
    toast.success("Shared to your feed")
  }

  const submitComment = async (event: FormEvent) => {
    event.preventDefault()
    if (!comment.trim()) return
    setCommenting(true)
    try {
      const response = await fetch("/api/music/comment", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ musicId: track.id, content: comment.trim() }),
      })
      if (!response.ok) throw new Error("Please sign in to comment")
      setComment("")
      toast.success("Comment added")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add comment")
    } finally {
      setCommenting(false)
    }
  }

  const download = async () => {
    const response = await fetch(`/api/music/download?trackId=${encodeURIComponent(track.id)}`, { credentials: "include" })
    const body = await response.json().catch(() => ({}))
    if (!response.ok || !body.url) {
      toast.error(body?.error || "Download unavailable")
      return
    }
    window.open(body.url, "_blank", "noopener,noreferrer")
  }

  const playerTrack = {
    id: track.id,
    title: track.title,
    description: track.description,
    type: track.type,
    genre: track.genre,
    duration: track.duration,
    file_url: `/api/music/stream?trackId=${encodeURIComponent(track.id)}`,
    cover_art_url: track.cover_art_url,
    artist_name: artist.name,
    artist_id: artist.userId,
    tags: track.tags || [],
    is_featured: Boolean(track.is_featured),
    is_public: true,
    stats: {
      plays: Number(track.stats?.plays || 0),
      likes: Number(track.stats?.likes || 0),
      comments: Number(track.stats?.comments || 0),
      shares: Number(track.stats?.shares || 0),
    },
    created_at: track.created_at,
    updated_at: track.updated_at,
  }

  const stats = track.stats || {}
  const externalLinks = [
    ["Spotify", track.spotify_url],
    ["Apple Music", track.apple_music_url],
    ["SoundCloud", track.soundcloud_url],
    ["YouTube", track.youtube_url],
  ].filter(([, url]) => Boolean(url))

  return (
    <main className="min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-[#160d2b] to-slate-950 text-white">
      <div className="pointer-events-none fixed inset-0 opacity-50" aria-hidden="true">
        <div className="absolute -left-32 top-20 h-96 w-96 rounded-full bg-violet-600/15 blur-3xl" />
        <div className="absolute right-0 top-1/3 h-80 w-80 rounded-full bg-fuchsia-600/10 blur-3xl" />
      </div>
      <div className="relative mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
        <Link href="/music" className="mb-6 inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Back to music
        </Link>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-8">
          <section className="space-y-6">
            <Card className="relative overflow-hidden border-white/10 bg-slate-900/70 shadow-2xl shadow-violet-950/20 backdrop-blur-xl">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-400" />
              <div className="grid gap-7 p-5 sm:p-7 md:grid-cols-[240px_minmax(0,1fr)] md:p-8 lg:grid-cols-[300px_minmax(0,1fr)]">
                <div className="relative aspect-square overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-violet-950 to-slate-900 shadow-2xl shadow-black/30">
                  {track.cover_art_url ? <TrackCoverImage trackId={track.id} src={track.cover_art_url} alt={track.title} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center"><Music2 className="h-20 w-20 text-violet-300/40" /></div>}
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                </div>

                <div className="flex min-w-0 flex-col justify-center">
                  <div className="mb-4 flex flex-wrap items-center gap-2">
                    <Badge className="border-violet-400/30 bg-violet-500/15 text-violet-200" variant="outline">{track.type || "Track"}</Badge>
                    {track.moderation_status === "approved" && <span className="inline-flex items-center gap-1 text-xs text-emerald-300"><CheckCircle2 className="h-3.5 w-3.5" /> Verified release</span>}
                  </div>
                  <h1 className="max-w-2xl text-3xl font-bold tracking-tight text-white sm:text-5xl">{track.title}</h1>
                  <div className="mt-4 flex items-center gap-3">
                    <Avatar className="h-10 w-10 border border-white/15"><AvatarImage src={artist.avatarUrl || ""} alt={artist.name} /><AvatarFallback className="bg-violet-500/20 text-violet-100">{artist.name.slice(0, 1).toUpperCase()}</AvatarFallback></Avatar>
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Performed by</p>
                      {artist.profilePath ? <Link href={artist.profilePath} className="font-semibold text-violet-200 hover:text-white">{artist.name}</Link> : <span className="font-semibold">{artist.name}</span>}
                    </div>
                  </div>
                  <div className="mt-6 flex flex-wrap gap-2">
                    {track.genre && <Stat icon={Tag} label="Genre" value={track.genre} />}
                    <Stat icon={Clock3} label="Length" value={formatDuration(track.duration)} />
                    {track.release_date && <Stat icon={CalendarDays} label="Released" value={formatDate(track.release_date) || "—"} />}
                  </div>
                  <div className="mt-7 flex flex-wrap gap-2">
                    <Button onClick={() => setShowShare(true)} className="bg-gradient-to-r from-violet-600 to-fuchsia-600 shadow-lg shadow-violet-900/30 hover:from-violet-500 hover:to-fuchsia-500"><Share2 className="mr-2 h-4 w-4" /> Share</Button>
                    {listing && track.access_mode === "paid" && <Button asChild variant="secondary" className="border-white/10 bg-white/10 text-white hover:bg-white/15"><Link href={`/marketplace/listings/${listing.id}`}><ShoppingBag className="mr-2 h-4 w-4" /> Buy track</Link></Button>}
                    {track.allow_downloads && <Button variant="outline" className="border-white/15 bg-white/5 text-white hover:bg-white/10" onClick={download}><Download className="mr-2 h-4 w-4" /> Download</Button>}
                  </div>
                  {externalLinks.length > 0 && <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2">{externalLinks.map(([label, url]) => <a key={label} href={String(url)} target="_blank" rel="noreferrer" className="inline-flex items-center text-sm text-slate-400 transition hover:text-violet-200">{label}<ExternalLink className="ml-1 h-3 w-3" /></a>)}</div>}
                </div>
              </div>
              <div className="border-t border-white/10 bg-black/10 p-5 sm:p-7"><MusicPlayer track={playerTrack} /></div>
            </Card>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat icon={Play} label="Plays" value={Number(stats.plays || 0).toLocaleString()} />
              <Stat icon={Heart} label="Likes" value={Number(stats.likes || 0).toLocaleString()} />
              <Stat icon={MessageCircle} label="Comments" value={Number(stats.comments || 0).toLocaleString()} />
              <Stat icon={BarChart3} label="Shares" value={Number(stats.shares || 0).toLocaleString()} />
            </div>

            {track.description && <Card className="border-white/10 bg-slate-900/60 backdrop-blur-xl"><CardHeader><CardTitle className="text-xl">About this track</CardTitle></CardHeader><CardContent><p className="whitespace-pre-wrap leading-7 text-slate-300">{track.description}</p>{track.tags?.length ? <div className="mt-5 flex flex-wrap gap-2">{track.tags.map((tag: string) => <Badge key={tag} variant="outline" className="border-white/15 bg-white/[0.04] text-slate-300">#{tag}</Badge>)}</div> : null}</CardContent></Card>}

            <Card className="border-white/10 bg-slate-900/60 backdrop-blur-xl"><CardHeader><CardTitle className="flex items-center gap-2 text-xl"><MessageCircle className="h-5 w-5 text-violet-300" /> Join the conversation</CardTitle></CardHeader><CardContent className="space-y-5"><form onSubmit={submitComment} className="flex flex-col gap-2 sm:flex-row"><Input value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Say something about this track…" className="border-white/10 bg-slate-950/70 text-white placeholder:text-slate-500" /><Button type="submit" disabled={commenting || !comment.trim()} className="bg-violet-600 hover:bg-violet-500">{commenting ? "Posting…" : "Post comment"}</Button></form><MusicComment musicId={track.id} /></CardContent></Card>

            {relatedTracks.length > 0 && <section><div className="mb-4 flex items-end justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-300">Keep listening</p><h2 className="mt-1 text-2xl font-bold">Related music</h2></div></div><div className="grid gap-3 sm:grid-cols-2">{relatedTracks.map((related: any) => <Card key={related.id} className="border-white/10 bg-slate-900/60 transition hover:border-violet-400/30"><CardContent className="flex items-center gap-3 p-3"><Link href={getMusicTrackPath(related.id) || "/music"} className="flex min-w-0 flex-1 items-center gap-3"><div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl bg-slate-800">{related.cover_art_url ? <TrackCoverImage trackId={related.id} src={related.cover_art_url} alt={related.title} className="h-full w-full object-cover" /> : <Music2 className="m-4 h-6 w-6 text-slate-500" />}</div><div className="min-w-0"><p className="truncate font-medium">{related.title}</p><p className="truncate text-xs text-slate-400">{related.genre || artist.name}</p></div></Link><Button type="button" variant="ghost" size="icon" onClick={() => playRelated(related)} aria-label={`Play ${related.title}`}><Play className="h-4 w-4" /></Button></CardContent></Card>)}</div></section>}
          </section>

          <aside className="space-y-6">
            <Card className="border-white/10 bg-slate-900/60 backdrop-blur-xl"><CardHeader><CardTitle className="text-lg">About the artist</CardTitle></CardHeader><CardContent className="space-y-4"><div className="flex items-center gap-3"><Avatar className="h-14 w-14 border border-white/15"><AvatarImage src={artist.avatarUrl || ""} alt={artist.name} /><AvatarFallback className="bg-violet-500/20 text-violet-100">{artist.name.slice(0, 1).toUpperCase()}</AvatarFallback></Avatar><div className="min-w-0"><p className="truncate font-semibold">{artist.name}</p>{artist.profilePath && <Link href={artist.profilePath} className="text-sm text-violet-300 hover:text-white">View artist profile</Link>}</div></div><div className="rounded-xl border border-violet-400/15 bg-violet-500/[0.06] p-3 text-sm text-slate-300">Discover more releases, updates, and live dates from this artist.</div></CardContent></Card>
            {upcomingEvents.length > 0 && <Card className="border-white/10 bg-slate-900/60 backdrop-blur-xl"><CardHeader><CardTitle className="flex items-center gap-2 text-lg"><CalendarDays className="h-5 w-5 text-violet-300" /> Upcoming events</CardTitle></CardHeader><CardContent className="space-y-3">{upcomingEvents.map((event) => <div key={event.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3"><Link href={`/events/${event.slug || event.id}`} className="font-medium hover:text-violet-300">{event.title}</Link><p className="mt-1 text-xs text-slate-400">{event.eventDate}{event.venueName ? ` · ${event.venueName}` : ""}</p>{event.ticketUrl && <a href={event.ticketUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center text-xs text-violet-300">Tickets <ExternalLink className="ml-1 h-3 w-3" /></a>}</div>)}</CardContent></Card>}
            <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-violet-500/15 to-fuchsia-500/5 p-5"><p className="text-sm font-semibold">Own or manage this release?</p><p className="mt-1 text-sm leading-6 text-slate-400">Track performance, audience response, and profile placements from your artist dashboard.</p><Link href="/artist/music/analytics" className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-violet-200 hover:text-white">View analytics <BarChart3 className="h-4 w-4" /></Link></div>
          </aside>
        </div>
      </div>
      <MusicShareDialog open={showShare} onOpenChange={setShowShare} track={{ id: track.id, title: track.title }} onSharePost={createPost} />
    </main>
  )
}

