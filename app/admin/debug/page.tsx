"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"
import { User, CircleCheck, CircleX, Loader2, Bug, RefreshCw, Database } from "lucide-react"
import Link from "next/link"

export default function DebugPage() {
  const [loading, setLoading] = useState(true)
  const [authData, setAuthData] = useState<any>(null)
  const [onboardingData, setOnboardingData] = useState<any>(null)
  const [profileData, setProfileData] = useState<any>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const fetchData = async () => {
    setLoading(true)
    setErrorMessage(null)
    
    try {
      // Get session info
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) {
        throw new Error(`Session error: ${sessionError.message}`)
      }
      
      setAuthData({
        authenticated: !!session,
        userId: session?.user?.id || null,
        email: session?.user?.email || null,
        lastSignIn: session?.user?.last_sign_in_at || null,
        providerType: session?.user?.app_metadata?.provider || "none"
      })
      
      // If authenticated, check onboarding and profile
      if (session?.user?.id) {
        // Check onboarding status
        try {
          const { data: onboarding, error: onboardingError } = await supabase
            .from('onboarding')
            .select('*')
            .eq('user_id', session.user.id)
            .maybeSingle()
            
          if (onboardingError && !onboardingError.message.includes("does not exist")) {
            console.error("Onboarding check error:", onboardingError)
          }
          
          setOnboardingData({
            exists: !!onboarding,
            data: onboarding || null,
            error: onboardingError ? onboardingError.message : null,
            tableExists: !onboardingError || !onboardingError.message.includes("does not exist")
          })
        } catch (err) {
          console.error("Onboarding check exception:", err)
          setOnboardingData({
            exists: false,
            data: null,
            error: err instanceof Error ? err.message : String(err),
            tableExists: false
          })
        }
        
        // Check profile status
        try {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .maybeSingle()
            
          if (profileError && !profileError.message.includes("does not exist")) {
            console.error("Profile check error:", profileError)
          }
          
          setProfileData({
            exists: !!profile,
            data: profile || null,
            error: profileError ? profileError.message : null,
            tableExists: !profileError || !profileError.message.includes("does not exist")
          })
        } catch (err) {
          console.error("Profile check exception:", err)
          setProfileData({
            exists: false,
            data: null,
            error: err instanceof Error ? err.message : String(err),
            tableExists: false
          })
        }
      }
    } catch (err) {
      console.error("Debug page error:", err)
      setErrorMessage(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }
  
  const createOnboardingRecord = async () => {
    if (!authData?.userId) {
      setErrorMessage("Not authenticated")
      return
    }
    
    try {
      const { error } = await supabase
        .from('onboarding')
        .insert({
          user_id: authData.userId,
          role: "Debug User",
          purpose: "Testing",
          on_tour: false,
          completed: true
        })
        
      if (error) throw error
      
      await fetchData()
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : String(err))
    }
  }
  
  const resetOnboarding = async () => {
    if (!authData?.userId || !onboardingData?.exists) {
      setErrorMessage("No onboarding record to reset")
      return
    }
    
    try {
      const { error } = await supabase
        .from('onboarding')
        .delete()
        .eq('user_id', authData.userId)
        
      if (error) throw error
      
      await fetchData()
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : String(err))
    }
  }
  
  // Fetch data on mount
  useEffect(() => {
    fetchData()
  }, [])
  
  // Check if tables are missing and we need migrations
  const needsMigrations = (!onboardingData?.tableExists || !profileData?.tableExists) && !loading

  return (
    <div className="min-h-screen bg-slate-900 text-white p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <Bug className="h-6 w-6 text-purple-500" />
            <h1 className="text-2xl font-bold">Authentication & Onboarding Debug</h1>
          </div>
          <Button 
            onClick={fetchData} 
            variant="outline" 
            className="border-slate-700 bg-slate-800 hover:bg-slate-700"
            disabled={loading}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            <span className="ml-2">Refresh</span>
          </Button>
        </div>
        
        {errorMessage && (
          <div className="mb-4 p-3 bg-red-900/30 border border-red-800 rounded-md text-red-300">
            {errorMessage}
          </div>
        )}
        
        {needsMigrations && (
          <div className="mb-6 p-4 bg-amber-900/20 border border-amber-800 rounded-md flex items-start">
            <Database className="h-5 w-5 text-amber-500 mt-0.5 mr-3 flex-shrink-0" />
            <div className="space-y-2">
              <div className="text-amber-400 font-medium">Database Tables Missing</div>
              <p className="text-amber-300/80 text-sm">
                Required database tables are missing. You need to run the database migrations to set up the necessary tables.
              </p>
              <Link href="/migrations">
                <Button className="mt-2 bg-amber-600 hover:bg-amber-700 text-white">
                  Go to Migrations Page
                </Button>
              </Link>
            </div>
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Authentication Status Card */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg text-slate-200">Authentication Status</CardTitle>
                {authData?.authenticated ? 
                  <div className="flex items-center text-green-500"><CircleCheck className="h-4 w-4 mr-1" /> Authenticated</div> : 
                  <div className="flex items-center text-red-500"><CircleX className="h-4 w-4 mr-1" /> Not Authenticated</div>
                }
              </div>
              <CardDescription className="text-slate-400">
                User authentication details
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
                </div>
              ) : (
                <div className="space-y-2 text-sm">
                  <div className="grid grid-cols-3 gap-1">
                    <div className="text-slate-400">User ID:</div>
                    <div className="col-span-2 font-mono text-slate-300 truncate">{authData?.userId || "None"}</div>
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    <div className="text-slate-400">Email:</div>
                    <div className="col-span-2 text-slate-300">{authData?.email || "None"}</div>
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    <div className="text-slate-400">Provider:</div>
                    <div className="col-span-2 text-slate-300">{authData?.providerType || "None"}</div>
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    <div className="text-slate-400">Last Sign In:</div>
                    <div className="col-span-2 text-slate-300">{authData?.lastSignIn ? new Intl.DateTimeFormat("en-US", {
                      year: "numeric",
                      month: "numeric",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    }).format(new Date(authData.lastSignIn)) : "Never"}</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Onboarding Status Card */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg text-slate-200">Onboarding Status</CardTitle>
                {!onboardingData?.tableExists ? 
                  <div className="flex items-center text-yellow-500">Table Missing</div> :
                  onboardingData?.exists ? 
                    <div className="flex items-center text-green-500"><CircleCheck className="h-4 w-4 mr-1" /> Record Exists</div> : 
                    <div className="flex items-center text-red-500"><CircleX className="h-4 w-4 mr-1" /> No Record</div>
                }
              </div>
              <CardDescription className="text-slate-400">
                Onboarding progress information
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
                </div>
              ) : !onboardingData?.tableExists ? (
                <div className="text-amber-400 py-2">
                  Onboarding table does not exist. Please run database migrations.
                </div>
              ) : !onboardingData?.exists ? (
                <div className="text-slate-400 py-2">
                  No onboarding record found for this user.
                </div>
              ) : (
                <div className="space-y-2 text-sm">
                  <div className="grid grid-cols-3 gap-1">
                    <div className="text-slate-400">Completed:</div>
                    <div className="col-span-2 text-slate-300">
                      {onboardingData?.data?.completed === true ? 
                        <span className="text-green-500">Yes</span> : 
                        <span className="text-red-500">No</span>
                      }
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    <div className="text-slate-400">Role:</div>
                    <div className="col-span-2 text-slate-300">{onboardingData?.data?.role || "Not set"}</div>
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    <div className="text-slate-400">Purpose:</div>
                    <div className="col-span-2 text-slate-300">{onboardingData?.data?.purpose || "Not set"}</div>
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    <div className="text-slate-400">On Tour:</div>
                    <div className="col-span-2 text-slate-300">
                      {onboardingData?.data?.on_tour === true ? "Yes" : 
                       onboardingData?.data?.on_tour === false ? "No" : "Not set"}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between pt-0">
              <Button 
                onClick={createOnboardingRecord} 
                size="sm"
                disabled={loading || !authData?.authenticated || onboardingData?.exists || !onboardingData?.tableExists}
                className="bg-purple-600 hover:bg-purple-700"
              >
                Create Record
              </Button>
              <Button 
                onClick={resetOnboarding} 
                size="sm"
                variant="destructive" 
                disabled={loading || !onboardingData?.exists}
                className="bg-red-600 hover:bg-red-700"
              >
                Reset Onboarding
              </Button>
            </CardFooter>
          </Card>
        </div>
        
        {/* Profile Status Card */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg text-slate-200">Profile Status</CardTitle>
              {!profileData?.tableExists ? 
                <div className="flex items-center text-yellow-500">Table Missing</div> :
                profileData?.exists ? 
                  <div className="flex items-center text-green-500"><CircleCheck className="h-4 w-4 mr-1" /> Record Exists</div> : 
                  <div className="flex items-center text-red-500"><CircleX className="h-4 w-4 mr-1" /> No Record</div>
              }
            </div>
            <CardDescription className="text-slate-400">
              User profile information
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
              </div>
            ) : !profileData?.tableExists ? (
              <div className="text-amber-400 py-2">
                Profiles table does not exist. Please run database migrations.
              </div>
            ) : !profileData?.exists ? (
              <div className="text-slate-400 py-2">
                No profile record found for this user.
              </div>
            ) : (
              <div className="space-y-2 text-sm">
                <div className="grid grid-cols-3 gap-1">
                  <div className="text-slate-400">ID:</div>
                  <div className="col-span-2 font-mono text-slate-300 truncate">{profileData?.data?.id}</div>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  <div className="text-slate-400">Full Name:</div>
                  <div className="col-span-2 text-slate-300">{profileData?.data?.full_name || "Not set"}</div>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  <div className="text-slate-400">Role:</div>
                  <div className="col-span-2 text-slate-300">{profileData?.data?.role || "Not set"}</div>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  <div className="text-slate-400">Last Updated:</div>
                  <div className="col-span-2 text-slate-300">
                    {profileData?.data?.updated_at ? new Intl.DateTimeFormat("en-US", {
                      year: "numeric",
                      month: "numeric",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    }).format(new Date(profileData.data.updated_at)) : "Never"}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 