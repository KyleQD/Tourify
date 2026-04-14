import type React from "react"
import { AdminDashboardShell } from "../dashboard/components/admin-dashboard-shell"

export default function AdminDashboardShellLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <AdminDashboardShell>{children}</AdminDashboardShell>
}
