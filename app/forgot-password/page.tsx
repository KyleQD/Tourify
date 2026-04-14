"use client"

import React, { useState } from "react"
import Link from "next/link"
import { Music } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { AuthErrorDisplay } from "@/components/ui/auth-error-display"
import { mapAuthError, AuthErrorInfo } from "@/lib/auth-errors"
import { CheckCircle, Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabase"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [error, setError] = useState<AuthErrorInfo | null>(null)

  const handleRetry = () => {
    setError(null)
    setIsSubmitted(false)
  }

  const handleContactSupport = () => {
    window.open('mailto:support@tourify.com?subject=Password Reset Issue', '_blank')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    // Basic validation
    if (!email || !email.includes('@')) {
      setError(mapAuthError("Please enter a valid email address"))
      setIsLoading(false)
      return
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (error) {
        const errorInfo = mapAuthError(error)
        setError(errorInfo)
      } else {
        setIsSubmitted(true)
      }
    } catch (error: any) {
      const errorInfo = mapAuthError(error instanceof Error ? error : 'Failed to send reset link')
      setError(errorInfo)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] bg-center bg-repeat opacity-10"></div>
        <div className="absolute top-0 left-0 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute top-0 right-0 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse animation-delay-2000"></div>
      </div>

      <Card className="relative w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl">
        <CardHeader className="space-y-1 flex flex-col items-center text-center">
          <div className="flex items-center space-x-2 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
              <Music className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              Tourify
            </span>
          </div>
          <CardTitle className="text-2xl text-white">Reset your password</CardTitle>
          <CardDescription className="text-gray-300">
            Enter your email and we'll send you a reset link
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {/* Error Display */}
          {error && (
            <AuthErrorDisplay
              error={error}
              onRetry={handleRetry}
              onContactSupport={handleContactSupport}
              className="mb-6"
            />
          )}

          {isSubmitted ? (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-green-500/20 border border-green-500/50 backdrop-blur-sm">
                <div className="flex items-center text-green-200">
                  <CheckCircle className="h-5 w-5 mr-3 flex-shrink-0" />
                  <div>
                    <div className="font-semibold">Reset link sent!</div>
                    <div className="text-sm opacity-90 mt-1">
                      If an account exists with <span className="font-medium">{email}</span>, you will receive a password reset link shortly.
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="text-center text-sm text-gray-400 space-y-2">
                <p>Check your email and follow the instructions to reset your password.</p>
                <p>
                  Didn't receive the email? Check your spam folder or{" "}
                  <button
                    onClick={() => {
                      setIsSubmitted(false)
                      setError(null)
                    }}
                    className="text-purple-400 hover:text-purple-300 underline"
                  >
                    try again
                  </button>
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-white font-medium">
                  Email address
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                  className="bg-white/10 border-white/20 text-white placeholder-gray-400 backdrop-blur-sm focus:border-purple-500 focus:ring-purple-500/50"
                />
              </div>
              
              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold py-3 rounded-xl shadow-lg hover:shadow-purple-500/25 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Sending reset link...
                  </div>
                ) : (
                  "Send reset link"
                )}
              </Button>
            </form>
          )}
        </CardContent>
        
        <CardFooter className="flex justify-center">
          <div className="text-sm text-gray-400 text-center">
            <Link href="/login" className="text-purple-400 hover:text-purple-300 underline">
              ← Back to login
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}

