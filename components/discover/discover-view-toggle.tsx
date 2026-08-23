"use client"

/**
 * P12 — Discover mode toggle (feed | world) + state preservation.
 * Jukebox persists because the provider lives above this component.
 */
import { Suspense, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"

import { WorldGlobeExperience } from "@/components/world/globe/GlobeExperience"
import type { GlobePlace } from "@/lib/world/globe/types"
import type { ReactNode } from "react"

export function DiscoverViewToggle({
  places,
  children,
}: {
  places: GlobePlace[]
  children: ReactNode
}) {
  const searchParams = useSearchParams()
  const [view, setView] = useState<"feed" | "world">("feed")

  useEffect(() => {
    if (searchParams.get("view") === "world") setView("world")
  }, [searchParams])

  function switchTo(target: "feed" | "world") {
    setView(target)
    const url = new URL(window.location.href)
    if (target === "world") url.searchParams.set("view", "world")
    else {
      url.searchParams.delete("view")
      url.searchParams.delete("place")
    }
    window.history.replaceState(null, "", url.toString())
  }

  if (view === "feed") {
    return (
      <div className="relative">
        <ModeToggle active="feed" onSwitch={switchTo} />
        {children}
      </div>
    )
  }

  return (
    <div className="relative">
      <ModeToggle active="world" onSwitch={switchTo} />
      <Suspense fallback={<p className="p-8 text-center text-slate-400">Loading globe…</p>}>
        <WorldGlobeExperience places={places} />
      </Suspense>
    </div>
  )
}

function ModeToggle({ active, onSwitch }: { active: string; onSwitch: (v: "feed" | "world") => void }) {
  return (
    <div className="mx-auto mb-4 flex w-fit gap-1 rounded-full border border-white/10 bg-white/[0.04] p-1">
      {(["feed", "world"] as const).map(mode => (
        <button
          key={mode}
          type="button"
          onClick={() => onSwitch(mode)}
          className={
            active === mode
              ? "rounded-full bg-violet-500/25 px-4 py-1.5 text-sm font-medium text-white transition"
              : "rounded-full px-4 py-1.5 text-sm font-medium text-slate-400 transition hover:text-slate-200"
          }
        >
          {mode === "world" ? "\u{1F30D} World" : "Feed"}
        </button>
      ))}
    </div>
  )
}
