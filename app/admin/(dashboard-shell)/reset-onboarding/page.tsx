"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { supabase } from "@/lib/supabase"
import { Trash2, ArrowLeft, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function ResetOnboardingPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [email, setEmail] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    async function loadUser() {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) throw sessionError
        
        if (session?.user) {
          setUserId(session.user.id)
          setEmail(session.user.email || null)
        } else {
          setError("No active session. Please log in first.")
        }
      } catch (err) {
        setError("Error loading user session")
        console.error("Session error:", err)
      }
    }
    
    loadUser()
  }, [])

  const handleReset = async () => {
    if (!userId) return
    
    setIsLoading(true)
    setError(null)
    setSuccess(null)
    
    try {
      // 1. Delete any existing onboarding record
      const { error: deleteError } = await supabase
        .from('onboarding')
        .delete()
        .eq('user_id', userId)
      
      if (deleteError) throw deleteError
      
      setSuccess("Onboarding record has been deleted. You'll be redirected to the onboarding flow on your next navigation.")
      
      setTimeout(() => {
        router.push('/admin/debug')
      }, 2000)
    } catch (err) {
      console.error("Reset onboarding error:", err)
      setError("Failed to reset onboarding status")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white p-4">
      <div className="max-w-md mx-auto">
        <Link href="/admin/debug" className="flex items-center text-sm text-slate-400 hover:text-white mb-4">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Debug
        </Link>
        
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-xl text-slate-200">Reset Onboarding</CardTitle>
            <CardDescription className="text-slate-400">
              Delete your onboarding record to restart the process
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 p-3 bg-red-900/30 border border-red-800 rounded-md text-red-300">
                {error}
              </div>
            )}
            
            {success && (
              <div className="mb-4 p-3 bg-green-900/30 border border-green-800 rounded-md text-green-300">
                {success}
              </div>
            )}
            
            <div className="space-y-4">
              <div className="p-3 rounded-md bg-amber-900/20 border border-amber-900/50 text-amber-400 text-sm">
                <p className="font-semibold">Warning</p>
                <p>This will delete your onboarding record, forcing you to go through the onboarding process again.</p>
              </div>
              
              <div className="space-y-2">
                <div className="text-sm text-slate-400">Logged in as:</div>
                <div className="text-slate-200">{email || "Loading..."}</div>
                <div className="text-xs font-mono text-slate-500 break-all">{userId || "Loading..."}</div>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              onClick={handleReset}
              variant="destructive"
              className="w-full bg-red-600 hover:bg-red-700"
              disabled={isLoading || !userId}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Resetting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Reset Onboarding
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
} 