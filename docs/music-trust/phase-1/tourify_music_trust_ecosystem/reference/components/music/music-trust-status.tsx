import { Badge } from "@/components/ui/badge"
import { deriveMusicTrustDisplay } from "@/lib/music/music-trust"
import type { MusicCertificationStatus, MusicOriginStatus } from "@/lib/music/music-trust"

export interface MusicTrustStatusProps {
  originStatus: MusicOriginStatus
  certificationStatus: MusicCertificationStatus
  certificationLevel: number
}

export function MusicTrustStatus({
  originStatus,
  certificationStatus,
  certificationLevel,
}: MusicTrustStatusProps) {
  const display = deriveMusicTrustDisplay({
    originStatus,
    certificationStatus,
    certificationLevel,
  })

  return (
    <Badge variant={display.showCertificationBadge ? "default" : "secondary"}>
      {display.label}
    </Badge>
  )
}
