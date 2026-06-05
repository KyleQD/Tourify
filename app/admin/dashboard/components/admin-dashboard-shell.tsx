import type React from "react"
import { Suspense } from "react"
import { OptimizedSidebar } from "./optimized-sidebar"
import { Breadcrumbs } from "./breadcrumbs"
import { AdminDashboardProvider } from "../contexts/admin-dashboard-context"
import { EnhancedNotificationCenter } from "@/components/notifications/enhanced-notification-center"
import { EnhancedGlobalSearch } from "@/components/admin/enhanced-global-search"

function AdminSidebarFallback() {
  return (
    <>
      <div
        className="fixed top-4 left-4 z-[100] ml-2 mt-2 h-9 w-9 rounded-md border border-slate-700 bg-slate-800/80 md:hidden"
        aria-busy
        aria-label="Loading navigation"
      />
      <div
        className="hidden h-screen w-16 shrink-0 border-r border-slate-800/50 bg-slate-950/95 backdrop-blur-sm md:block"
        aria-hidden
      />
    </>
  )
}

export function AdminDashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <AdminDashboardProvider>
      <div className="min-h-screen bg-black flex relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-black via-slate-950 to-purple-950/30 pointer-events-none" />
        <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-purple-600/[0.04] rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-blue-600/[0.04] rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 right-0 w-[400px] h-[400px] bg-cyan-600/[0.03] rounded-full blur-3xl pointer-events-none" />
        <Suspense fallback={<AdminSidebarFallback />}>
          <OptimizedSidebar />
        </Suspense>
        <div className="flex-1 flex flex-col relative z-10 min-w-0">
          {/* Top bar: breadcrumbs + notification bell */}
          <header className="border-b border-slate-800/50 bg-slate-950/60 backdrop-blur-sm px-4 sm:px-6 py-2.5 flex items-center justify-between shrink-0">
            <Breadcrumbs />
            <div className="flex items-center gap-2 shrink-0 ml-4">
              <Suspense>
                <EnhancedGlobalSearch />
              </Suspense>
              <Suspense>
                <EnhancedNotificationCenter />
              </Suspense>
            </div>
          </header>
          <main id="main-content" className="flex-1 overflow-auto">
            <div className="p-4 sm:p-6">
              {children}
            </div>
          </main>
        </div>
      </div>
    </AdminDashboardProvider>
  )
}
