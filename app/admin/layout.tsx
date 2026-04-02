"use client"

// Prevent prerendering since this layout requires MultiAccountProvider context
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMultiAccount } from '@/hooks/use-multi-account'
import { Card } from '@/components/ui/card'
import { Loader2, Shield, AlertTriangle } from 'lucide-react'
import { EnhancedNotificationCenter } from '@/components/notifications/enhanced-notification-center'
import { AccountRouteGuard } from '@/components/account/account-route-guard'
import './globals.css'

interface AdminLayoutProps {
  children: React.ReactNode
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { currentAccount, accounts, isLoading, error } = useMultiAccount()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const isInAdminContext = currentAccount?.account_type === 'admin'
  const hasAdminAccounts = accounts?.some(acc => acc.account_type === 'admin') || false
  const hasAdminAccess = isInAdminContext || hasAdminAccounts

  if (!mounted || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-slate-950 to-black text-white flex items-center justify-center relative overflow-hidden">
        <div className="absolute top-20 left-20 w-96 h-96 bg-purple-500/[0.04] rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-20 right-20 w-80 h-80 bg-blue-500/[0.04] rounded-full blur-3xl pointer-events-none" />
        <Card className="rounded-sm bg-slate-900/60 border-slate-700/50 backdrop-blur-sm p-8 text-center max-w-md relative z-10">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-purple-400" />
          <h2 className="text-xl font-semibold text-white mb-2">Loading Event & Tour Management</h2>
          <p className="text-slate-400">Setting up your dashboard...</p>
        </Card>
      </div>
    )
  }

  if (error && !hasAdminAccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-slate-950 to-black text-white flex items-center justify-center relative overflow-hidden">
        <div className="absolute top-20 left-20 w-96 h-96 bg-purple-500/[0.04] rounded-full blur-3xl pointer-events-none" />
        <Card className="rounded-sm bg-slate-900/60 border-red-700/40 backdrop-blur-sm text-center max-w-md relative z-10">
          <AlertTriangle className="h-8 w-8 mx-auto mb-4 text-red-500" />
          <h2 className="text-xl font-semibold text-white mb-2">Authentication Error</h2>
          <p className="text-slate-400 mb-4">{error}</p>
          <button onClick={() => router.push('/login')} className="admin-btn-futuristic px-4 py-2">Sign In</button>
        </Card>
      </div>
    )
  }

  if (!hasAdminAccess && !isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-slate-950 to-black text-white flex items-center justify-center relative overflow-hidden">
        <div className="absolute top-20 left-20 w-96 h-96 bg-purple-500/[0.04] rounded-full blur-3xl pointer-events-none" />
        <Card className="rounded-sm bg-slate-900/60 border-amber-700/40 backdrop-blur-sm text-center max-w-md relative z-10">
          <Shield className="h-8 w-8 mx-auto mb-4 text-amber-500" />
          <h2 className="text-xl font-semibold text-white mb-2">Admin Access Required</h2>
          <p className="text-slate-400 mb-4">You need an organizer account to access this area.</p>
          <button onClick={() => router.push('/create?type=admin')} className="admin-btn-futuristic px-4 py-2">Create Organizer Account</button>
        </Card>
      </div>
    )
  }

  return (
    <div className="text-white">
      <AccountRouteGuard />
      {children}
      <EnhancedNotificationCenter />
    </div>
  )
} 