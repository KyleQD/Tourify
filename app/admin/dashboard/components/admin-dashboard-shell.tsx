"use client"

import type React from "react"
import { Suspense } from "react"
import { OptimizedSidebar } from "./optimized-sidebar"
import { AdminDashboardProvider } from "../contexts/admin-dashboard-context"
import { AdminActingContextBar } from "./admin-acting-context-bar"

function AdminSidebarFallback() {
  return (
    <>
      <div
        className="fixed top-20 left-4 z-[100] ml-2 mt-2 h-9 w-9 rounded-md border border-slate-700 bg-slate-800/80 md:hidden"
        aria-busy
        aria-label="Loading navigation"
      />
      <div
        className="hidden h-[calc(100vh-4rem)] w-16 shrink-0 border-r border-slate-800/50 bg-slate-950/95 backdrop-blur-sm md:block"
        aria-hidden
      />
    </>
  )
}

export function AdminDashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <AdminDashboardProvider>
      {/* Height accounts for sticky global Nav (h-16) from AppChrome */}
      <div className="relative flex h-[calc(100vh-4rem)] min-h-[calc(100vh-4rem)] w-full min-w-0 overflow-hidden bg-black">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-black via-slate-950 to-purple-950/30" />
        <div className="pointer-events-none absolute top-0 right-1/4 h-[600px] w-[600px] rounded-full bg-purple-600/[0.04] blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-1/4 h-[500px] w-[500px] rounded-full bg-blue-600/[0.04] blur-3xl" />
        <div className="pointer-events-none absolute top-1/2 right-0 h-[400px] w-[400px] rounded-full bg-cyan-600/[0.03] blur-3xl" />
        <Suspense fallback={<AdminSidebarFallback />}>
          <OptimizedSidebar />
        </Suspense>
        <div className="relative z-10 flex min-h-0 min-w-0 flex-1 flex-col">
          <main id="main-content" className="min-w-0 flex-1 overflow-auto">
            <div className="p-4 sm:p-6">
              <AdminActingContextBar />
              {children}
            </div>
          </main>
        </div>
      </div>
    </AdminDashboardProvider>
  )
}
