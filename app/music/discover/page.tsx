import { Suspense } from "react"
import { MusicDiscoveryHub } from "@/components/music/music-discovery-hub"

export const metadata = {
  title: "Discover Music | Tourify Jukebox",
  description: "Discover songs, independent artists, genres and music scenes. Keep listening with the Tourify Jukebox.",
}

export default function MusicDiscoverPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-[70vh] items-center justify-center bg-[#080913] p-8 text-sm text-slate-400" role="status">
        Opening the music discovery room…
      </div>
    }>
      <MusicDiscoveryHub />
    </Suspense>
  )
}
