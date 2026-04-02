import { getPublicArtistProfileDTO } from "@/lib/public-artist/get-public-artist-profile"
import { PublicArtistPage } from "@/components/public-artist/public-artist-page"

export default async function ArtistPublicProfilePage({
  params
}: {
  params: Promise<{ username: string }>
}) {
  const { username } = await params
  const dto = await getPublicArtistProfileDTO({ username })

  if (!dto) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-slate-950 to-black flex items-center justify-center px-4">
        <div className="text-center max-w-md w-full">
          <div className="text-purple-300 text-sm">Artist profile not found.</div>
        </div>
      </div>
    )
  }

  return <PublicArtistPage dto={dto} />
}