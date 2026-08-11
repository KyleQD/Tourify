import { Suspense } from "react"
import { Loader2 } from "lucide-react"
import { MusicPageClient } from "@/components/music/page/music-page-client"

export const metadata = {
  title: "Your Music · Tourify",
  description: "Listen, save, and build playlists across Tourify and Audius.",
}

export default function MusicPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center" aria-busy="true">
          <Loader2 className="h-8 w-8 animate-spin text-slate-600" />
        </div>
      }
    >
      <MusicPageClient />
    </Suspense>
  )
}
