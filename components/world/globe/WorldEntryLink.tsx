/**
 * Server component: entry chip linking Discover → the World globe.
 * Renders nothing unless the preview gate is on, so the existing Discover
 * experience is untouched by default (roadmap Phase 4 rule).
 */
import Link from "next/link"
import { Globe2 } from "lucide-react"

export function WorldEntryLink() {
  if (process.env.WORLD_MUSIC_SEED_PREVIEW_ENABLED !== "true") return null
  return (
    <div className="mx-auto w-full max-w-7xl px-4 pb-2">
      <Link
        href="/discover/world"
        className="group inline-flex items-center gap-3 rounded-full border border-violet-400/30 bg-gradient-to-r from-violet-600/20 via-fuchsia-600/10 to-cyan-500/15 px-5 py-2.5 text-sm font-medium text-violet-100 shadow-[0_0_24px_-8px_rgba(160,107,255,0.6)] transition hover:border-cyan-300/40 hover:text-white"
      >
        <Globe2 className="h-4 w-4 text-cyan-300 transition group-hover:rotate-45" />
        Explore the World of Music globe
        <span aria-hidden className="text-cyan-300 transition group-hover:translate-x-0.5">→</span>
      </Link>
    </div>
  )
}
