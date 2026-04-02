"use client"

import { useAuth } from '@/contexts/auth-context'
import { useArtist } from '@/contexts/artist-context'
import { useMultiAccount } from '@/hooks/use-multi-account'
import { supabase } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function AuthDebugger() {
  const { user: authUser, session: authSession, loading: authLoading } = useAuth()
  const { user: artistUser, profile: artistProfile, isLoading: artistLoading } = useArtist()
  const { currentAccount, userAccounts, isLoading: accountLoading } = useMultiAccount()
  const [sessionInfo, setSessionInfo] = useState<any>(null)

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        setSessionInfo({
          session: session ? {
            user_id: session.user?.id,
            email: session.user?.email,
            expires_at: session.expires_at,
            access_token: session.access_token ? 'Present' : 'Missing',
            refresh_token: session.refresh_token ? 'Present' : 'Missing'
          } : null,
          error: error?.message
        })
      } catch (err) {
        setSessionInfo({
          session: null,
          error: err instanceof Error ? err.message : 'Unknown error'
        })
      }
    }

    checkSession()
  }, [])

  return (
    <Card className="mb-4 bg-slate-900/50 border-slate-700/50">
      <CardHeader>
        <CardTitle className="text-yellow-400">🔍 Auth Debug Info</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div>
          <h4 className="font-semibold text-white mb-2">Auth Context</h4>
          <ul className="space-y-1 text-gray-300">
            <li>Loading: {authLoading ? '✅ Yes' : '❌ No'}</li>
            <li>User: {authUser ? `✅ ${authUser.id}` : '❌ None'}</li>
            <li>Session: {authSession ? '✅ Present' : '❌ Missing'}</li>
            <li>Email: {authUser?.email || '❌ None'}</li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold text-white mb-2">Artist Context</h4>
          <ul className="space-y-1 text-gray-300">
            <li>Loading: {artistLoading ? '✅ Yes' : '❌ No'}</li>
            <li>User: {artistUser ? `✅ ${artistUser.id}` : '❌ None'}</li>
            <li>Profile: {artistProfile ? `✅ ${artistProfile.artist_name || 'Unnamed'}` : '❌ None'}</li>
            <li>Match: {authUser?.id === artistUser?.id ? '✅ Users match' : '❌ Users do not match'}</li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold text-white mb-2">Multi Account</h4>
          <ul className="space-y-1 text-gray-300">
            <li>Loading: {accountLoading ? '✅ Yes' : '❌ No'}</li>
            <li>Current Account: {currentAccount ? `✅ ${currentAccount.account_type}` : '❌ None'}</li>
            <li>Total Accounts: {userAccounts.length}</li>
            <li>Artist Account: {userAccounts.find(acc => acc.account_type === 'artist') ? '✅ Present' : '❌ Missing'}</li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold text-white mb-2">Supabase Session</h4>
          <ul className="space-y-1 text-gray-300">
            <li>Session: {sessionInfo?.session ? '✅ Present' : '❌ Missing'}</li>
            <li>User ID: {sessionInfo?.session?.user_id || '❌ None'}</li>
            <li>Access Token: {sessionInfo?.session?.access_token || '❌ Missing'}</li>
            <li>Expires At: {sessionInfo?.session?.expires_at ? new Intl.DateTimeFormat("en-US", {
              year: "numeric",
              month: "numeric",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            }).format(new Date(sessionInfo.session.expires_at * 1000)) : '❌ None'}</li>
            {sessionInfo?.error && <li className="text-red-400">Error: {sessionInfo.error}</li>}
          </ul>
        </div>

        <div className="p-3 bg-blue-950/50 border border-blue-700/50 rounded">
          <p className="text-blue-300 text-xs">
            💡 <strong>Debug Tip:</strong> If any of these values show as missing or mismatched, 
            that's likely the source of your authentication error. Try refreshing the page or logging out and back in.
          </p>
        </div>
      </CardContent>
    </Card>
  )
} 