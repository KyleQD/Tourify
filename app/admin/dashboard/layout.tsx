import type React from "react"
import { OptimizedSidebar } from "./components/optimized-sidebar"
import { Breadcrumbs } from "./components/breadcrumbs"
import { AdminDashboardProvider } from "./contexts/admin-dashboard-context"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AdminDashboardProvider>
      <div className="min-h-screen bg-black flex relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-black via-slate-950 to-purple-950/30 pointer-events-none" />
        <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-purple-600/[0.04] rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-blue-600/[0.04] rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 right-0 w-[400px] h-[400px] bg-cyan-600/[0.03] rounded-full blur-3xl pointer-events-none" />
        <OptimizedSidebar />
        <div className="flex-1 flex flex-col relative z-10">
          <main className="flex-1 overflow-auto">
            <div className="p-4 sm:p-6">
              <Breadcrumbs />
              {children}
            </div>
          </main>
        </div>
      </div>
    </AdminDashboardProvider>
  )
}
