import { Badge } from "@/components/ui/badge"
import { deriveMusicTrustDisplay, type MusicCertificationStatus, type MusicOriginStatus } from "@/lib/music/music-trust"

export function MusicTrustStatus({ originStatus = "not_recorded", certificationStatus = "not_requested", certificationLevel = 0 }: {
  originStatus?: MusicOriginStatus
  certificationStatus?: MusicCertificationStatus
  certificationLevel?: number
}) {
  const display = deriveMusicTrustDisplay({ originStatus, certificationStatus, certificationLevel })
  return <Badge variant={display.showCertificationBadge ? "default" : "secondary"}>{display.label}</Badge>
}
