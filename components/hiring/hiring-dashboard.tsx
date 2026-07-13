import type { HiringDashboardProps } from "@/types/hiring-dashboard"
import { HiringDashboardShell } from "./hiring-dashboard-shell"

export function HiringDashboard({ employer, initialTab = "overview" }: HiringDashboardProps) {
  return <HiringDashboardShell employer={employer} initialTab={initialTab} />
}
