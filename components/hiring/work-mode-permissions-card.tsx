import { detailSurfacePattern } from "@/components/dashboard/detail-surface-pattern"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getWorkModePermissionLabels } from "@/lib/hiring/work-mode-permissions"
import { cn } from "@/lib/utils"
import type { WorkModePermissions } from "@/types/hiring-roster-work-mode"

interface WorkModePermissionsCardProps {
  permissions?: WorkModePermissions | null
  status?: string | null
}

export function WorkModePermissionsCard({ permissions, status }: WorkModePermissionsCardProps) {
  const labels = permissions ? getWorkModePermissionLabels(permissions) : []

  return (
    <Card className={cn(detailSurfacePattern.panel, "border-white/10 bg-transparent shadow-none")}>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className={cn("text-base", detailSurfacePattern.title)}>Work Mode Access</CardTitle>
          {status ? <Badge className={detailSurfacePattern.badgeOutline}>{status}</Badge> : null}
        </div>
      </CardHeader>
      <CardContent>
        {labels.length ? (
          <div className="flex flex-wrap gap-2">
            {labels.map((label: string) => (
              <Badge key={label} className={detailSurfacePattern.badgeSoft}>
                {label}
              </Badge>
            ))}
          </div>
        ) : (
          <p className={detailSurfacePattern.subtleText}>
            No Work Mode assignment is active for this staff member yet.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
