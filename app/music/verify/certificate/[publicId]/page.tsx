import { PublicMusicVerification } from "@/components/music/public-music-verification"

export default async function CertificateVerificationPage({ params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params
  return <PublicMusicVerification kind="certificate" publicId={publicId} />
}
