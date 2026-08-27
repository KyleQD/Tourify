import type { HiringDashboardProps } from "@/types/hiring-dashboard"
import { HiringDashboardShell } from "./hiring-dashboard-shell"

export function HiringDashboard(props: HiringDashboardProps) {
  return <HiringDashboardShell {...props} />
}
