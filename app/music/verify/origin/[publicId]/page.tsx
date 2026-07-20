import { PublicMusicVerification } from "@/components/music/public-music-verification"

export default async function OriginVerificationPage({ params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params
  return <PublicMusicVerification kind="origin" publicId={publicId} />
}
