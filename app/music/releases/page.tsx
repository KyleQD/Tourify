import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft, ArrowRight, Disc3, Music2 } from "lucide-react"
import { TrackCoverImage } from "@/components/jukebox/track-cover-image"
import { listPublicReleases } from "@/lib/music/public-catalog-detail"
import { getArtistPublicProfilePath } from "@/lib/utils/public-profile-routes"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Browse Releases | Tourify Music",
  description: "Discover independently released albums, EPs and mixtapes on Tourify.",
}

export default async function MusicReleasesPage() {
  const releases = await listPublicReleases(36)
  return <main className="min-h-screen bg-[#080913] px-4 py-8 text-white sm:px-8">
    <div className="mx-auto max-w-6xl space-y-8">
      <Link href="/music/discover" className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-violet-200"><ArrowLeft className="h-3.5 w-3.5" /> Back to Music Discovery</Link>
      <header className="space-y-3 rounded-[28px] border border-white/10 bg-gradient-to-r from-[#26164d] via-[#17182e] to-[#090c17] p-6 sm:p-9">
        <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-fuchsia-300"><Disc3 className="h-4 w-4" /> Tourify Discography</p>
        <h1 className="text-3xl font-black sm:text-5xl">Albums, EPs & mixtapes<span className="text-violet-400">.</span></h1>
        <p className="max-w-2xl text-sm leading-relaxed text-slate-300">Get closer to the music artists have published. Every release here comes from the public, approved catalog.</p>
      </header>
      {releases.length ? <section aria-label="Browse published releases" className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {releases.map((release) => {
          const artist = release.artistHandle ? getArtistPublicProfilePath(release.artistHandle) : null
          return <article key={release.id} className="group min-w-0 rounded-2xl border border-white/10 bg-white/[0.035] p-3 transition hover:border-violet-400/30 hover:bg-white/[0.065]">
            <Link href={"/music/releases/" + encodeURIComponent(release.id)} aria-label={"Explore " + release.title + " by " + release.artistName} className="block">
              <TrackCoverImage src={release.artworkUrl} trackId={release.id} alt={release.title + " cover art"} className="aspect-square w-full rounded-xl" iconClassName="h-10 w-10" />
              <span className="mt-3 block text-[10px] font-bold uppercase tracking-[0.16em] text-violet-300">{release.kind}</span>
              <strong className="mt-1 block truncate text-sm text-white">{release.title}</strong>
            </Link>
            {artist ? <Link href={artist} className="mt-1 inline-flex max-w-full items-center gap-1 truncate text-xs text-slate-400 hover:text-violet-200">{release.artistName}</Link> :
              <p className="mt-1 truncate text-xs text-slate-400">{release.artistName}</p>}
            <Link href={"/music/releases/" + encodeURIComponent(release.id)} className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-violet-200 hover:text-white">Explore release <ArrowRight className="h-3 w-3" /></Link>
          </article>
        })}
      </section> : <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-white/15 bg-white/[0.035] px-4 py-16 text-center">
        <Music2 className="h-10 w-10 text-violet-300" />
        <h2 className="text-lg font-bold">Releases are on their way</h2>
        <p className="max-w-sm text-sm text-slate-400">There aren't any publicly available, approved album or EP uploads in this catalog selection yet.</p>
      </div>}
      <footer className="border-t border-white/10 pt-5 text-xs text-slate-400">
        Release labels are artist-provided. Individual tracklists will appear when the catalog supports verified release associations.
      </footer>
    </div>
  </main>
}
