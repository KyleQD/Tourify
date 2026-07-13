"use client"

import type React from "react"
import dynamic from "next/dynamic"
import { Suspense } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { LogOut, MessageSquare, Settings, User } from "lucide-react"
import { OptimizedSidebar } from "./optimized-sidebar"
import { Breadcrumbs } from "./breadcrumbs"
import { AdminDashboardProvider } from "../contexts/admin-dashboard-context"
import { CompactAccountSwitcher } from "@/components/compact-account-switcher"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useAuth } from "@/contexts/auth-context"
import { useMultiAccount } from "@/hooks/use-multi-account"

const EnhancedNotificationCenter = dynamic(
  () =>
    import("@/components/notifications/enhanced-notification-center").then((mod) => ({
      default: mod.EnhancedNotificationCenter,
    })),
  { ssr: false, loading: () => <div className="h-9 w-9 rounded-md bg-slate-800/60" aria-hidden /> }
)

const EnhancedGlobalSearch = dynamic(
  () =>
    import("@/components/admin/enhanced-global-search").then((mod) => ({
      default: mod.EnhancedGlobalSearch,
    })),
  { ssr: false, loading: () => <div className="h-9 w-40 rounded-md bg-slate-800/60" aria-hidden /> }
)

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

function AdminShellAccountMenu() {
  const router = useRouter()
  const { user, signOut } = useAuth()
  const { currentAccount } = useMultiAccount()
  const displayName =
    currentAccount?.profile_data?.display_name ||
    currentAccount?.profile_data?.organization_name ||
    currentAccount?.profile_data?.full_name ||
    user?.email ||
    "Account"
  const avatarUrl =
    currentAccount?.profile_data?.avatar_url ||
    currentAccount?.profile_data?.logo_url ||
    undefined
  const initial = String(displayName).charAt(0).toUpperCase() || "A"

  async function handleSignOut() {
    try {
      await signOut()
      router.push("/login")
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="relative h-9 w-9 rounded-full ring-1 ring-slate-700 hover:ring-cyan-400/40"
          aria-label="Account menu"
        >
          <Avatar className="h-9 w-9">
            <AvatarImage src={avatarUrl} alt={displayName} />
            <AvatarFallback className="bg-slate-800 text-slate-200">{initial}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 border-slate-700 bg-slate-900 text-slate-100">
        <DropdownMenuLabel className="space-y-0.5">
          <p className="truncate text-sm font-medium">{displayName}</p>
          <p className="truncate text-xs text-slate-400">{user?.email}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-slate-700" />
        <DropdownMenuItem
          className="cursor-pointer focus:bg-slate-800"
          onClick={() => router.push("/profile")}
        >
          <User className="mr-2 h-4 w-4" />
          Profile
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer focus:bg-slate-800"
          onClick={() => router.push("/settings")}
        >
          <Settings className="mr-2 h-4 w-4" />
          Settings
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-slate-700" />
        <DropdownMenuItem
          className="cursor-pointer text-red-300 focus:bg-slate-800 focus:text-red-200"
          onClick={() => void handleSignOut()}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function AdminDashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <AdminDashboardProvider>
      {/* pt-16 clears sticky global Nav (h-16) from AppChrome */}
      <div className="min-h-[calc(100vh-4rem)] h-[calc(100vh-4rem)] bg-black flex relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-black via-slate-950 to-purple-950/30 pointer-events-none" />
        <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-purple-600/[0.04] rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-blue-600/[0.04] rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 right-0 w-[400px] h-[400px] bg-cyan-600/[0.03] rounded-full blur-3xl pointer-events-none" />
        <Suspense fallback={<AdminSidebarFallback />}>
          <OptimizedSidebar />
        </Suspense>
        <div className="flex-1 flex flex-col relative z-10 min-w-0 min-h-0">
          <header className="border-b border-slate-800/50 bg-slate-950/60 backdrop-blur-sm px-4 sm:px-6 py-2.5 flex items-center justify-between shrink-0 gap-3">
            <Breadcrumbs />
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-2">
              <Suspense>
                <EnhancedGlobalSearch />
              </Suspense>
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="h-9 w-9 p-0 text-slate-300 hover:bg-slate-800/70 hover:text-white"
                aria-label="Messages"
              >
                <Link href="/admin/dashboard/communications">
                  <MessageSquare className="h-4 w-4" />
                </Link>
              </Button>
              <Suspense>
                <EnhancedNotificationCenter />
              </Suspense>
              <CompactAccountSwitcher />
              <AdminShellAccountMenu />
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
