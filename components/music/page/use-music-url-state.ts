"use client"

import { useCallback } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

export type MusicSection = "home" | "library" | "discover" | "playlists" | "audius"

export const MUSIC_SECTIONS: MusicSection[] = [
  "home",
  "library",
  "discover",
  "playlists",
  "audius",
]

/**
 * URL-backed state for the Music page.
 *
 * Uses shallow client-side replacement so navigation between sections never
 * triggers a server round-trip and, critically, never unmounts the page —
 * global player playback is preserved across section changes and refresh.
 */
export function useMusicUrlState() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const setParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString())
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "") params.delete(key)
        else params.set(key, value)
      }
      const qs = params.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    },
    [router, pathname, searchParams]
  )

  const rawSection = searchParams.get("section")
  const section: MusicSection = MUSIC_SECTIONS.includes(rawSection as MusicSection)
    ? (rawSection as MusicSection)
    : "home"

  return {
    section,
    query: searchParams.get("q") ?? "",
    genre: searchParams.get("genre") ?? "All",
    sort: searchParams.get("sort") ?? "recent",
    filter: searchParams.get("filter") ?? "all",
    view: (searchParams.get("view") ?? "list") as "list" | "grid",
    playlistId: searchParams.get("playlist"),
    setParams,
  }
}
