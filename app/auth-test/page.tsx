"use client"

// Prevent prerendering since this page requires auth context
export const dynamic = 'force-dynamic'

import { useAuth } from "@/contexts/auth-context"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"

export default function AuthTestPage() {
  const { user, session, loading, isAuthenticated } = useAuth()
  const [cookies, setCookies] = useState<string>('')
  const [manualSession, setManualSession] = useState<any>(null)
  const router = useRouter()

  useEffect(() => {
    // Get document cookies
    setCookies(document.cookie)
    
    // Try to get session manually
    const getSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession()
      setManualSession({ session, error })
    }
    
    getSession()
  }, [])

  const testDashboardAccess = () => {
    router.push('/dashboard')
  }

  const refreshAuth = async () => {
    const { data, error } = await supabase.auth.refreshSession()
    console.log('Refresh result:', data, error)
    setManualSession({ session: data.session, error })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        <Card className="bg-white/10 backdrop-blur-xl border border-white/20">
          <CardHeader>
            <CardTitle className="text-white">Auth Debug Information</CardTitle>
            <CardDescription className="text-gray-300">
              Current authentication state details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            
            {/* Auth Context State */}
            <div className="space-y-2">
              <h3 className="font-semibold text-white">Auth Context:</h3>
              <div className="text-sm text-gray-300 space-y-1 bg-black/20 p-3 rounded">
                <div>Loading: {loading.toString()}</div>
                <div>Is Authenticated: {isAuthenticated.toString()}</div>
                <div>User ID: {user?.id || 'null'}</div>
                <div>User Email: {user?.email || 'null'}</div>
                <div>Session Exists: {(!!session).toString()}</div>
                <div>Session Expires: {session?.expires_at ? new Date(session.expires_at * 1000).toISOString() : 'null'}</div>
              </div>
            </div>

            {/* Manual Session Check */}
            <div className="space-y-2">
              <h3 className="font-semibold text-white">Manual Session Check:</h3>
              <div className="text-sm text-gray-300 space-y-1 bg-black/20 p-3 rounded">
                <div>Session: {manualSession?.session ? 'Found' : 'None'}</div>
                <div>Error: {manualSession?.error?.message || 'None'}</div>
                <div>Access Token: {manualSession?.session?.access_token ? 'Present' : 'Missing'}</div>
                <div>Refresh Token: {manualSession?.session?.refresh_token ? 'Present' : 'Missing'}</div>
              </div>
            </div>

            {/* Cookies */}
            <div className="space-y-2">
              <h3 className="font-semibold text-white">Auth Cookies:</h3>
              <div className="text-xs text-gray-300 bg-black/20 p-3 rounded break-all">
                {cookies || 'No cookies found'}
              </div>
            </div>

            {/* Actions */}
            <div className="flex space-x-4">
              <Button 
                onClick={testDashboardAccess}
                className="bg-purple-600 hover:bg-purple-700"
              >
                Test Dashboard Access
              </Button>
              
              <Button 
                onClick={refreshAuth}
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10"
              >
                Refresh Session
              </Button>

              <Button 
                onClick={() => window.location.reload()}
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10"
              >
                Reload Page
              </Button>
            </div>

            {/* Instructions */}
            <div className="mt-6 p-4 bg-blue-500/20 border border-blue-500/50 rounded">
              <h4 className="font-semibold text-blue-200 mb-2">Debug Steps:</h4>
              <ol className="text-sm text-blue-200 space-y-1">
                <li>1. Try logging in from another tab</li>
                <li>2. Come back to this page and check if auth state updated</li>
                <li>3. Click "Test Dashboard Access" to see if middleware allows access</li>
                <li>4. Check browser console for middleware logs</li>
              </ol>
            </div>
            
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 