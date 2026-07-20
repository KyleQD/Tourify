import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

export interface MusicCertificationUpsellCardProps {
  trackId: string
  disabled?: boolean
}

export function MusicCertificationUpsellCard({
  trackId,
  disabled = false,
}: MusicCertificationUpsellCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Certify your music</CardTitle>
        <CardDescription>
          Add source evidence and request a review for a public Human-Created credential.
          Certification is optional and does not replace copyright registration.
        </CardDescription>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        Your current upload remains labeled Artist submitted until an active certificate is issued.
      </CardContent>
      <CardFooter>
        <Button asChild disabled={disabled}>
          <Link href={`/artist/music/certification/${trackId}`}>Review certification options</Link>
        </Button>
      </CardFooter>
    </Card>
  )
}
