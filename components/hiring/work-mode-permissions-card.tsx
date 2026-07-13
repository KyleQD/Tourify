import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getWorkModePermissionLabels } from "@/lib/hiring/work-mode-permissions"
import type { WorkModePermissions } from "@/types/hiring-roster-work-mode"

interface WorkModePermissionsCardProps {
  permissions?: WorkModePermissions | null
  status?: string | null
}

export function WorkModePermissionsCard({ permissions, status }: WorkModePermissionsCardProps) {
  const labels = permissions ? getWorkModePermissionLabels(permissions) : []

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base">Work Mode Access</CardTitle>
          {status ? <Badge variant="outline">{status}</Badge> : null}
        </div>
      </CardHeader>
      <CardContent>
        {labels.length ? (
          <div className="flex flex-wrap gap-2">
            {labels.map((label: string) => (
              <Badge key={label} variant="secondary">
                {label}
              </Badge>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No Work Mode assignment is active for this staff member yet.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
