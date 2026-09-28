"use client"

import { Globe, Headphones, Library, ListMusic, Music2 } from "lucide-react"
import { cn } from "@/lib/utils"
import type { MusicSection } from "./use-music-url-state"

const SECTION_META: Record<
  MusicSection,
  { label: string; icon: React.ComponentType<{ className?: string }> }
> = {
  home: { label: "Home", icon: Headphones },
  library: { label: "Library", icon: Library },
  discover: { label: "Discover", icon: Globe },
  playlists: { label: "Playlists", icon: ListMusic },
  audius: { label: "Audius", icon: Music2 },
}

export function MusicPrimaryNav({
  section,
  audiusEnabled,
  counts,
  onSelect,
}: {
  section: MusicSection
  audiusEnabled: boolean
  counts?: Partial<Record<MusicSection, number>>
  onSelect: (section: MusicSection) => void
}) {
  const sections = (Object.keys(SECTION_META) as MusicSection[]).filter(
    (s) => s !== "audius" || audiusEnabled
  )

  return (
    <nav aria-label="Music sections" className="-mx-1 overflow-x-auto scrollbar-hide">
      <ul role="list" className="flex gap-1 px-1 min-w-max">
        {sections.map((s) => {
          const meta = SECTION_META[s]
          const Icon = meta.icon
          const active = s === section
          const count = counts?.[s]
          return (
            <li key={s}>
              <button
                type="button"
                onClick={() => onSelect(s)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-4 h-10 text-sm font-medium transition-colors whitespace-nowrap",
                  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-400",
                  active
                    ? "bg-purple-600 text-white"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                )}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {meta.label}
                {typeof count === "number" && count > 0 && (
                  <span
                    className={cn(
                      "rounded-full px-1.5 text-[10px] font-bold",
                      active ? "bg-white/20" : "bg-white/10"
                    )}
                  >
                    {count}
                  </span>
                )}
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
