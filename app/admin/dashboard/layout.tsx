import type React from "react"
import { AdminDashboardShell } from "./components/admin-dashboard-shell"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <AdminDashboardShell>{children}</AdminDashboardShell>
}
