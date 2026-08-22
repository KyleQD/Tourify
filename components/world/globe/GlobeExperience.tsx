"use client"

/**
 * WorldGlobeExperience — the interactive Discover globe shell.
 *
 * Layout: full-bleed holographic globe (custom Three.js scene) + neon search +
 * place side panel. Mobile collapses the panel into a bottom sheet. A
 * non-WebGL fallback renders the same content as an accessible card grid.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Disc3, Globe2, MapPin, Radio, Search, Sparkles, X } from "lucide-react"

import type { GlobePlace } from "@/lib/world/globe/types"
import { cn } from "@/lib/utils"

interface PanelPayload {
  overview?: { musicalIdentity?: string | null }
  sections?: {
    fromHere?: { items?: Array<{ data?: { name?: string }; confidence?: number }> }
    historyHere?: {
      timeline?: Array<{ start?: string | null; data?: { name?: string } }>
      instruments?: Array<{ data?: { name?: string } }>
      soundSignatures?: Array<{ data?: { name?: string } }>
    }
    radio?: { status?: string; message?: string | null }
  }
  provenance?: { sourceRefs?: unknown[] }
}

function supportsWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas")
    return !!(window.WebGLRenderingContext && (canvas.getContext("webgl2") || canvas.getContext("webgl")))
  } catch {
    return false
  }
}

const COUNT_CHIPS: Array<{ key: keyof GlobePlace["counts"]; label: string; icon: typeof Disc3 }> = [
  { key: "artists", label: "Artists", icon: Sparkles },
  { key: "recordings", label: "Recordings", icon: Disc3 },
  { key: "milestones", label: "Milestones", icon: MapPin },
  { key: "genresAndScenes", label: "Genres", icon: Globe2 },
  { key: "instruments", label: "Instruments", icon: Radio },
  { key: "landmarks", label: "Landmarks", icon: MapPin },
]

export function WorldGlobeExperience({ places }: { places: GlobePlace[] }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<{ setSelected(k: string | null): void; focusPlace(k: string): void; dispose(): void } | null>(null)
  const cacheRef = useRef(new Map<string, PanelPayload>())

  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [panel, setPanel] = useState<PanelPayload | null>(null)
  const [panelLoading, setPanelLoading] = useState(false)
  const [query, setQuery] = useState("")
  const [webglFailed, setWebglFailed] = useState(false)

  const selectedPlace = useMemo(
    () => places.find((place) => place.key === selectedKey) ?? null,
    [places, selectedKey],
  )

  const selectPlace = useCallback((key: string | null, focus = true) => {
    setSelectedKey(key)
    if (!key) {
      setPanel(null)
      sceneRef.current?.setSelected(null)
      window.history.replaceState(null, "", "/discover/world")
      return
    }
    if (focus) sceneRef.current?.focusPlace(key)
    sceneRef.current?.setSelected(key)
    window.history.replaceState(null, "", `/discover/world?place=${key}`)
  }, [])

  // Boot the Three.js scene once.
  useEffect(() => {
    if (!supportsWebGL()) {
      setWebglFailed(true)
      return
    }
    let disposed = false
    const boot = async () => {
      const [{ WorldGlobeScene }] = await Promise.all([import("./globe-scene")])
      if (disposed || !containerRef.current) return
      sceneRef.current = new WorldGlobeScene(containerRef.current, places, {
        onSelect: (key) => selectPlace(key),
      })
    }
    void boot()
    return () => {
      disposed = true
      sceneRef.current?.dispose()
      sceneRef.current = null
    }
  }, [places, selectPlace])

  // Deep link ?place=…
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const wanted = params.get("place")
    if (wanted && places.some((place) => place.key === wanted)) {
      selectPlace(wanted, true)
    }
  }, [])

  // Panel data loading.
  useEffect(() => {
    if (!selectedKey) {
      setPanel(null)
      return
    }
    const cached = cacheRef.current.get(selectedKey)
    if (cached) {
      setPanel(cached)
      return
    }
    let cancelled = false
    setPanelLoading(true)
    fetch(`/api/world/pilot/${selectedKey}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: PanelPayload | null) => {
        if (cancelled || !payload) return
        cacheRef.current.set(selectedKey, payload)
        setPanel(payload)
      })
      .finally(() => !cancelled && setPanelLoading(false))
    return () => {
      cancelled = true
    }
  }, [selectedKey])

  // Keyboard: Escape closes, arrows cycle.
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") selectPlace(null, false)
      if ((event.key === "ArrowRight" || event.key === "ArrowLeft") && places.length > 0) {
        const index = places.findIndex((place) => place.key === selectedKey)
        const delta = event.key === "ArrowRight" ? 1 : -1
        const next = places[(index + delta + places.length) % places.length] ?? places[0]
        selectPlace(next.key)
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [places, selectedKey, selectPlace])

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return []
    return places.filter(
      (place) =>
        place.name.toLowerCase().includes(needle) ||
        place.countryName.toLowerCase().includes(needle),
    )
  }, [places, query])

  const counts = selectedPlace?.counts

  return (
    <div className="relative min-h-[72vh] w-full overflow-hidden rounded-2xl border border-white/10 bg-[#05060f] shadow-[0_0_80px_-20px_rgba(140,92,255,0.45)]">
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(1100px_at_70%_-10%,rgba(90,60,220,0.28),transparent_60%),radial-gradient(800px_at_15%_110%,rgba(40,180,255,0.16),transparent_55%)]" />

      {/* Canvas / fallback */}
      <div ref={containerRef} className="absolute inset-0" aria-hidden={webglFailed} />
      {webglFailed && (
        <div className="relative z-10 grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3">
          {places.map((place) => (
            <button
              key={place.key}
              type="button"
              onClick={() => selectPlace(place.key, false)}
              className="rounded-xl border border-white/10 bg-white/[0.04] p-5 text-left transition hover:border-violet-400/40 hover:bg-white/[0.07]"
            >
              <p className="text-lg font-semibold text-white">{place.name}</p>
              <p className="mt-1 text-sm text-slate-400">{place.countryName}</p>
              <p className="mt-3 line-clamp-2 text-sm text-violet-200/80">{place.musicalIdentity}</p>
            </button>
          ))}
        </div>
      )}

      {/* Title chip */}
      <div className="pointer-events-none absolute left-5 top-5 z-10 flex items-center gap-2 rounded-full border border-violet-400/25 bg-black/40 px-4 py-2 backdrop-blur-md">
        <Globe2 className="h-4 w-4 text-cyan-300" />
        <span className="text-xs font-semibold tracking-[0.22em] text-violet-100">WORLD OF MUSIC</span>
      </div>

      {/* Search */}
      <div className="absolute right-5 top-5 z-20 w-[240px]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-violet-300/70" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search a place…"
            className="w-full rounded-full border border-white/10 bg-black/45 py-2.5 pl-9 pr-9 text-sm text-violet-50 placeholder:text-slate-500 backdrop-blur-md focus:border-cyan-300/40 focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        {filtered.length > 0 && query && (
          <ul className="mt-2 overflow-hidden rounded-xl border border-white/10 bg-[#0a0d24]/95 backdrop-blur-md">
            {filtered.map((place) => (
              <li key={place.key}>
                <button
                  type="button"
                  onClick={() => {
                    selectPlace(place.key)
                    setQuery("")
                  }}
                  className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm text-violet-100 hover:bg-violet-500/15"
                >
                  <span>{place.name}</span>
                  <span className="text-xs text-slate-400">{place.countryName}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Hint */}
      <div className="pointer-events-none absolute bottom-4 left-5 z-10 hidden items-center gap-2 text-xs text-slate-400 sm:flex">
        <Radio className="h-3.5 w-3.5 animate-pulse text-cyan-300/80" />
        Drag to orbit · Click a glowing city to explore its sound
      </div>

      {/* Side panel / bottom sheet */}
      <AnimatePresence>
        {selectedPlace && (
          <motion.aside
            key="panel"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 40 }}
            transition={{ type: "spring", stiffness: 260, damping: 30 }}
            className="absolute inset-x-3 bottom-3 z-30 max-h-[62%] overflow-y-auto rounded-2xl border border-violet-400/20 bg-[#0a0d24]/92 p-5 backdrop-blur-xl md:inset-y-auto md:right-5 md:top-5 md:bottom-5 md:left-auto md:w-[380px]"
          >
            <button
              type="button"
              onClick={() => selectPlace(null, false)}
              className="absolute right-4 top-4 text-slate-400 transition hover:text-white"
              aria-label="Close panel"
            >
              <X className="h-4 w-4" />
            </button>

            <p className="text-xs font-medium uppercase tracking-[0.18em] text-cyan-300/80">
              {selectedPlace.countryName}
            </p>
            <h2 className="mt-1 bg-gradient-to-r from-violet-200 via-white to-cyan-200 bg-clip-text text-2xl font-bold text-transparent">
              {selectedPlace.name}
            </h2>

            {panelLoading && !panel ? (
              <div className="mt-4 space-y-2">
                {[0, 1, 2].map((row) => (
                  <div key={row} className="h-3 w-full animate-pulse rounded-full bg-white/10" />
                ))}
              </div>
            ) : (
              panel?.overview?.musicalIdentity && (
                <p className="mt-3 border-l-2 border-violet-400/40 pl-3 text-sm italic leading-relaxed text-violet-100/85">
                  “{panel.overview.musicalIdentity}”
                </p>
              )
            )}

            {counts && (
              <div className="mt-4 flex flex-wrap gap-2">
                {COUNT_CHIPS.map(({ key, label, icon: Icon }) =>
                  counts[key] > 0 ? (
                    <span
                      key={key}
                      className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-xs text-slate-200"
                    >
                      <Icon className="h-3 w-3 text-cyan-300/80" />
                      {counts[key]} {label}
                    </span>
                  ) : null,
                )}
              </div>
            )}

            {panel?.sections?.fromHere?.items && panel.sections.fromHere.items.length > 0 && (
              <section className="mt-5">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">From here</h3>
                <ul className="mt-2 space-y-1.5">
                  {panel.sections.fromHere.items.slice(0, 6).map((item, index) => (
                    <li key={index} className="flex items-center justify-between text-sm text-slate-200">
                      <span className="truncate">{item.data?.name}</span>
                      <span className="ml-2 shrink-0 text-xs text-slate-500">
                        {item.confidence != null ? `${Math.round(item.confidence * 100)}%` : null}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {panel?.sections?.historyHere?.timeline && panel.sections.historyHere.timeline.length > 0 && (
              <section className="mt-5">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">History</h3>
                <ol className="mt-2 space-y-1.5">
                  {panel.sections.historyHere.timeline.slice(0, 5).map((entry, index) => (
                    <li key={index} className="flex gap-3 text-sm text-slate-200">
                      <span className="w-10 shrink-0 font-mono text-xs text-cyan-300/80">{entry.start ?? "—"}</span>
                      <span className="truncate">{entry.data?.name}</span>
                    </li>
                  ))}
                </ol>
              </section>
            )}

            {panel?.sections?.radio?.status && (
              <div className="mt-5 flex items-center gap-2 rounded-lg border border-cyan-300/15 bg-cyan-300/[0.06] px-3 py-2 text-xs text-cyan-100/80">
                <Radio className="h-3.5 w-3.5 shrink-0" />
                {panel.sections.radio.message ?? "Station directory staged — playback unlocks after rights review."}
              </div>
            )}

            {panel?.provenance?.sourceRefs && (
              <p className="mt-4 text-[11px] text-slate-500">
                {panel.provenance.sourceRefs.length} reviewed source
                {panel.provenance.sourceRefs.length === 1 ? "" : "s"} behind these facts.
              </p>
            )}
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Screen-reader friendly selection list */}
      <ul className="sr-only">
        {places.map((place) => (
          <li key={place.key}>
            <button type="button" onClick={() => selectPlace(place.key)}>
              {`Explore ${place.name}, ${place.countryName}`}
            </button>
          </li>
        ))}
      </ul>
      <span className={cn("hidden")} aria-hidden />
    </div>
  )
}
