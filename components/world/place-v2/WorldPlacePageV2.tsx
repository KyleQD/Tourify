"use client"
import { WorldListenHere } from "@/components/world/listen/WorldListenHere"

/**
 * P11 — Complete Detroit Regional Experience (reference implementation).
 * Twelve sections composing the finished regional contract. Works entirely
 * without the globe (P11-T12): this IS the conventional accessible page.
 */
import { useState } from "react"
import {
  Calendar, ChevronDown, Disc3, Globe2, Landmark,
  Link2, MapPin, Mic2, Music2, Newspaper, Radio, Sparkles,
} from "lucide-react"

import type { WorldPlaceResponseV2 } from "@/lib/world/place-api-v2/compose"

function SectionShell({ icon: Icon, title, children, accent = "violet" }: {
  icon: React.ElementType; title: string; children: React.ReactNode;
  accent?: "violet" | "cyan" | "amber" | "emerald"
}) {
  const accents = { violet: "text-violet-300", cyan: "text-cyan-300", amber: "text-amber-300", emerald: "text-emerald-300" }
  return (
    <section className="mt-8">
      <h2 className={`mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider ${accents[accent]}`}>
        <Icon className="h-4 w-4" /> {title}
      </h2>
      {children}
    </section>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <p className="rounded-lg border border-dashed border-white/10 bg-white/[0.02] px-4 py-3 text-sm text-slate-500">
      {message}
    </p>
  )
}

function ItemList({ items }: { items: Array<{ primary: string; secondary?: string | null }> }) {
  if (!items.length) return null
  return (
    <ul className="space-y-1">
      {items.map((item, i) => (
        <li key={i} className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm text-slate-200 hover:bg-white/[0.04]">
          <span className="truncate">{item.primary}</span>
          {item.secondary && <span className="ml-2 shrink-0 text-xs text-slate-500">{item.secondary}</span>}
        </li>
      ))}
    </ul>
  )
}

function HistoricBadge() {
  return (
    <span className="ml-2 rounded-full border border-amber-300/25 px-2 py-0.5 text-[10px] uppercase tracking-wider text-amber-200/80">Historic</span>
  )
}

export function WorldPlacePageV2({
  data,
  listen = null,
  listenLoading = false,
}: {
  data: WorldPlaceResponseV2
  /** P16 - live listening data; absent keeps the rights-review placeholder. */
  listen?: import("@/components/world/listen/WorldListenHere").ListenHereData | null
  listenLoading?: boolean
}) {
  const [expandedSection, setExpandedSection] = useState<string | null>(null)
  const toggle = (key: string) => setExpandedSection((prev) => (prev === key ? null : prev === key ? null : (prev === key ? null : key)))
  const toggleSafe = (key: string) => setExpandedSection((prev) => (prev === key ? null : key))
  void toggle
  const has = (items: unknown[] | undefined) => (items?.length ?? 0) > 0

  return (
    <article className="mx-auto max-w-4xl px-4 pb-20">
      <header className="mb-8 mt-6 text-center">
        <nav aria-label="Breadcrumb" className="mb-2 text-xs text-slate-500">
          {data.identity.canonicalPath.split("/").map((seg, i, arr) => (
            <span key={i}>{i > 0 && <span className="mx-1">›</span>}<span>{seg}</span></span>
          ))}
        </nav>
        <h1 className="bg-gradient-to-r from-violet-200 via-white to-cyan-200 bg-clip-text text-4xl font-extrabold tracking-tight text-transparent">
          {data.identity.name}
        </h1>
        <p className="mt-1 text-sm text-slate-400">{data.identity.countryName}</p>
        <div className="mt-4 flex items-center justify-center gap-3">
          <button type="button" disabled className="rounded-full border border-violet-400/30 bg-violet-500/15 px-5 py-2 text-sm font-medium text-violet-100 opacity-50">Follow</button>
          <button type="button" disabled className="rounded-full border border-cyan-300/30 bg-cyan-500/10 px-5 py-2 text-sm font-medium text-cyan-100 opacity-50">Listen</button>
        </div>
      </header>

      <SectionShell icon={Sparkles} title="Popular Now" accent="cyan">
        {data.popular.items.length > 0 ? (
          <>
            <div className="mb-2 flex gap-2">
              {["7d","30d","1y"].map(w => (
                <span key={w} className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-0.5 text-xs text-slate-400">{w}</span>
              ))}
            </div>
            <ItemList items={data.popular.items.map(item => ({ primary: item.name, secondary: `${Math.round(item.score)}%` }))} />
          </>
        ) : (
          <EmptyState message="Popular Now requires live Tourify activity signals." />
        )}
      </SectionShell>

      <SectionShell icon={Mic2} title="Genres & Scenes">
        {has(data.genresScenes?.items) ? (
          <div className="flex flex-wrap gap-2">
            {data.genresScenes.items.map(item => (
              <span key={item.id} className="rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-sm text-violet-200">
                {item.name}<HistoricBadge />
              </span>
            ))}
          </div>
        ) : <EmptyState message="No curated genres or scenes yet." />}
      </SectionShell>

      <SectionShell icon={Music2} title="Artists">
        {has(data.artists?.items) ? (
          <>
            <HistoricBadge />
            <ItemList items={data.artists.items.map(a => ({ primary: a.name }))} />
          </>
        ) : <EmptyState message="Curated historical artists appear here." />}
      </SectionShell>

      <SectionShell icon={Disc3} title="Music">
        {has(data.music?.items) ? (
          <ItemList items={data.music.items.map(m => ({ primary: m.title, secondary: m.artistName || null }))} />
        ) : <EmptyState message="Important recordings appear here." />}
      </SectionShell>

      <SectionShell icon={Calendar} title="Happening Here">
        <EmptyState message="Live events require Tourify operational data." />
      </SectionShell>

      <SectionShell icon={Landmark} title="Venues">
        <EmptyState message="Active venues come from Tourify venue projections." />
      </SectionShell>

      <SectionShell icon={Radio} title="Listen Here" accent="emerald">
        {listen ? (
          <WorldListenHere data={listen} loading={listenLoading} />
        ) : (
          <div className="rounded-lg border border-emerald-300/15 bg-emerald-300/[0.06] p-3 text-xs text-emerald-100/80">
            Radio and guided listening unlock after rights review. Playback remains rights-resolved.
          </div>
        )}
      </SectionShell>

      <SectionShell icon={Landmark} title="History" accent="amber">
        {has(data.history?.items) ? (
          <ol className="relative space-y-3 border-l border-amber-300/20 pl-5">
            {data.history.items.map((item, i) => (
              <li key={i} className="relative">
                <span className="absolute -left-[26px] top-1 h-2.5 w-2.5 rounded-full border-2 border-amber-300/40 bg-[#0a0d24]" />
                <span className="font-mono text-xs text-amber-200/70">{item.year ?? "\u2014"}</span>
                <span className="ml-2 text-sm text-slate-200">{item.name}</span>
              </li>
            ))}
          </ol>
        ) : <EmptyState message="Historical milestones appear here from curated claims." />}
      </SectionShell>

      <SectionShell icon={Newspaper} title="Tourify Here">
        <EmptyState message="Geographically projected Tourify content arrives with P9 signal activation." />
      </SectionShell>

      <section className="mt-8">
        <button type="button" onClick={() => toggleSafe("sources")}
          className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-slate-400 hover:text-white">
          <Link2 className="h-4 w-4" /> Sources & Provenance
          <ChevronDown className={`h-4 w-4 transition ${expandedSection === "sources" ? "rotate-180" : ""}`} />
        </button>
        {expandedSection === "sources" && (
          <div className="mt-3 space-y-1.5">
            {data.sources.items.map(source => (
              <div key={source.key} className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm text-slate-300">
                <span>{source.name}</span>
                <code className="rounded bg-black/40 px-1.5 py-0.5 text-[10px] text-slate-500">{source.key}</code>
              </div>
            ))}
            <p className="mt-2 text-xs text-slate-500">
              Trust: {data.trust.claimsWithEvidence}/{data.trust.totalClaims} claims have evidence · {data.trust.sourcesCount} sources
            </p>
          </div>
        )}
      </section>

      <footer className="mt-12 flex items-center justify-center gap-2 text-[11px] text-slate-600">
        <Globe2 className="h-3 w-3" />
        World of Music · schema {data.schemaVersion} · ETag {data.cache.etag.slice(0, 12)}
      </footer>
    </article>
  )
}
