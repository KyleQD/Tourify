import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

export function MusicCertificationUpsellCard({ trackId, disabled = false }: { trackId: string; disabled?: boolean }) {
  return <Card>
    <CardHeader><CardTitle>Certify your music</CardTitle><CardDescription>Add source evidence and request review for a Human-Created credential. Certification is optional and does not replace copyright registration.</CardDescription></CardHeader>
    <CardContent className="text-sm text-muted-foreground">Your upload remains labeled Artist submitted until an active certificate is issued.</CardContent>
    <CardFooter><Button asChild disabled={disabled}><Link href={`/artist/music/certification/${trackId}`}>Review certification options</Link></Button></CardFooter>
  </Card>
}
