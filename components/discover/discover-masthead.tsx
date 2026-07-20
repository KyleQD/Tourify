"use client"

import type { FormEvent } from "react"
import { Loader2, MapPin, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SurfaceHero, SurfaceInput } from "@/components/surface/surface-primitives"
import { DiscoverRotatingWords } from "@/components/discover/discover-rotating-words"

export type DiscoverSectionId =
  | "artists"
  | "venues"
  | "events"
  | "tours"
  | "songs"
  | "albums"

const SECTION_CHIPS: Array<{ id: DiscoverSectionId; label: string }> = [
  { id: "artists", label: "New Artists" },
  { id: "venues", label: "Venues" },
  { id: "events", label: "Events" },
  { id: "tours", label: "Tours" },
  { id: "songs", label: "Top Songs" },
  { id: "albums", label: "Albums" },
]

const GLASS_INPUT_CLASS =
  "h-11 rounded-full border border-white/15 bg-white/5 pl-11 text-slate-100 shadow-inner backdrop-blur-xl placeholder:text-slate-500 focus-visible:ring-white/20"

export function DiscoverMasthead({
  searchQuery,
  locationInput,
  appliedLocation,
  isLocating,
  onSearchQueryChange,
  onLocationInputChange,
  onSearchSubmit,
  onApplyLocation,
  onClearLocation,
  onUseCurrentLocation,
  onScrollToSection,
}: {
  searchQuery: string
  locationInput: string
  appliedLocation: string
  isLocating: boolean
  onSearchQueryChange: (value: string) => void
  onLocationInputChange: (value: string) => void
  onSearchSubmit: (event: FormEvent) => void
  onApplyLocation: () => void
  onClearLocation: () => void
  onUseCurrentLocation: () => void
  onScrollToSection: (id: DiscoverSectionId) => void
}) {
  return (
    <SurfaceHero className="space-y-5 rounded-3xl border border-white/10 bg-gradient-to-br from-slate-950 via-slate-950 to-slate-900/80 p-6 md:p-8">
      <h1 className="flex flex-wrap items-center gap-x-3 gap-y-1 text-3xl font-semibold tracking-tight md:text-4xl">
        <span className="text-white">Discover</span>
        <DiscoverRotatingWords />
      </h1>

      <form onSubmit={onSearchSubmit} className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <SurfaceInput
            value={searchQuery}
            onChange={(event) => onSearchQueryChange(event.target.value)}
            placeholder="Search artists, people, venues…"
            className={GLASS_INPUT_CLASS}
          />
        </div>
        <Button type="submit" className="h-11 rounded-full px-6">
          Search
        </Button>
      </form>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <MapPin className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <SurfaceInput
              value={locationInput}
              onChange={(event) => onLocationInputChange(event.target.value)}
              placeholder="City or region"
              className={GLASS_INPUT_CLASS}
            />
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-full border-white/20"
              onClick={onApplyLocation}
            >
              Apply
            </Button>
            <Button
              type="button"
              variant="outline"
              className="rounded-full border-white/20"
              onClick={onUseCurrentLocation}
              disabled={isLocating}
            >
              {isLocating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Near me"}
            </Button>
            {appliedLocation ? (
              <Button
                type="button"
                variant="ghost"
                className="rounded-full text-slate-300"
                onClick={onClearLocation}
              >
                Clear
              </Button>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {SECTION_CHIPS.map((chip) => (
            <Button
              key={chip.id}
              type="button"
              size="sm"
              variant="outline"
              className="rounded-full border-white/15 bg-white/5 text-slate-200 hover:bg-white/10"
              onClick={() => onScrollToSection(chip.id)}
            >
              {chip.label}
            </Button>
          ))}
        </div>
      </div>

      {appliedLocation ? (
        <p className="text-xs text-slate-400">
          Showing scene near <span className="text-slate-200">{appliedLocation}</span>
        </p>
      ) : null}
    </SurfaceHero>
  )
}
