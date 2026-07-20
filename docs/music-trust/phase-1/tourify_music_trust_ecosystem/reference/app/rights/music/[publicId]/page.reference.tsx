import { notFound } from "next/navigation"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export interface PublicMusicVerificationPageProps {
  params: Promise<{ publicId: string }>
}

export default async function PublicMusicVerificationPage({
  params,
}: PublicMusicVerificationPageProps) {
  const { publicId } = await params

  // Replace with the repository's server-side data access pattern.
  const record = null as null | {
    trackTitle: string
    artistName: string
    recordedAt: string
    status: string
    manifestHash: string
  }

  if (!record || !publicId) notFound()

  return (
    <main className="mx-auto max-w-3xl p-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <CardTitle>{record.trackTitle}</CardTitle>
            <Badge variant="secondary">Origin recorded</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{record.artistName}</p>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p>Recorded by Tourify on {record.recordedAt}.</p>
          <p className="break-all font-mono text-xs">Manifest: {record.manifestHash}</p>
          <p className="text-muted-foreground">
            This record documents a file, metadata, and artist declaration. It is not a government copyright registration and does not independently adjudicate ownership.
          </p>
        </CardContent>
      </Card>
    </main>
  )
}
