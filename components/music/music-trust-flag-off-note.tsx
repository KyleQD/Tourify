import { Badge } from "@/components/ui/badge"

interface MusicTrustFlagOffNoteProps {
  enabled?: boolean
  /** Extra staging hint shown under the badge when the surface is flag-off. */
  showStagingHint?: boolean
}

/**
 * Consistent flag-off empty-state chrome for music-trust readiness shells.
 * Production keeps ~180 flags default-off; staging enablement is documented in
 * docs/audits/MUSIC_TRUST_STAGING.md.
 */
export function MusicTrustFlagOffNote({
  enabled = false,
  showStagingHint = true,
}: MusicTrustFlagOffNoteProps) {
  return (
    <div className="space-y-1">
      <div className="flex flex-wrap gap-2">
        <Badge variant={enabled ? "default" : "secondary"}>
          {enabled ? "Flag enabled" : "Flag off"}
        </Badge>
        <Badge variant="outline">Sandbox / readiness only</Badge>
      </div>
      {!enabled && showStagingHint ? (
        <p className="text-xs text-muted-foreground">
          This surface stays unavailable until the matching feature flags are enabled for the
          environment. See docs/audits/MUSIC_TRUST_STAGING.md for the staging matrix — do not flip
          all flags on in production.
        </p>
      ) : null}
    </div>
  )
}
