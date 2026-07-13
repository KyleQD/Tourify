"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Music, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { AuthErrorDisplay } from "@/components/ui/auth-error-display"
import { mapAuthError, AuthErrorInfo } from "@/lib/auth-errors"
import { CheckCircle, Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabase"

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [isSessionReady, setIsSessionReady] = useState(false)
  const [isValidatingLink, setIsValidatingLink] = useState(true)
  const [error, setError] = useState<AuthErrorInfo | null>(null)
  const [countDown, setCountDown] = useState(5)
  const router = useRouter()

  // Accept both PKCE (?code=) and legacy hash (#access_token&type=recovery) reset links
  useEffect(() => {
    let isCancelled = false

    async function establishRecoverySession() {
      setIsValidatingLink(true)
      setError(null)

      try {
        const searchParams = new URLSearchParams(window.location.search)
        const code = searchParams.get("code")

        if (code) {
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
          if (isCancelled) return

          if (exchangeError || !data.session) {
            setError(
              mapAuthError(
                exchangeError?.message ||
                  "Invalid or expired reset link. Please request a new password reset."
              )
            )
            setIsSessionReady(false)
            return
          }

          // Remove one-time code from the URL after exchange
          const cleanUrl = `${window.location.pathname}${window.location.hash || ""}`
          window.history.replaceState({}, document.title, cleanUrl)
          setIsSessionReady(true)
          return
        }

        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const accessToken = hashParams.get("access_token")
        const type = hashParams.get("type")

        if (accessToken && type === "recovery") {
          const { data: sessionData } = await supabase.auth.getSession()
          if (isCancelled) return

          if (sessionData.session) {
            setIsSessionReady(true)
            return
          }
        }

        const { data: existing } = await supabase.auth.getSession()
        if (isCancelled) return

        if (existing.session) {
          setIsSessionReady(true)
          return
        }

        setError(mapAuthError("Invalid or expired reset link. Please request a new password reset."))
        setIsSessionReady(false)
      } catch (err) {
        if (isCancelled) return
        setError(
          mapAuthError(err instanceof Error ? err.message : "Invalid or expired reset link.")
        )
        setIsSessionReady(false)
      } finally {
        if (!isCancelled) setIsValidatingLink(false)
      }
    }

    void establishRecoverySession()
    return () => {
      isCancelled = true
    }
  }, [])

  // Countdown and redirect on success
  useEffect(() => {
    if (isSuccess && countDown > 0) {
      const timer = setTimeout(() => {
        setCountDown(countDown - 1)
      }, 1000)
      return () => clearTimeout(timer)
    } else if (isSuccess && countDown === 0) {
      router.push("/login")
    }
  }, [isSuccess, countDown, router])

  const handleRetry = () => {
    setError(null)
    setPassword("")
    setConfirmPassword("")
  }

  const handleContactSupport = () => {
    window.open("mailto:support@tourify.com?subject=Password Reset Issue", "_blank")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!isSessionReady) {
      setError(mapAuthError("Invalid or expired reset link. Please request a new password reset."))
      return
    }

    if (password !== confirmPassword) {
      setError(mapAuthError("Passwords don't match"))
      return
    }

    if (password.length < 6) {
      setError(mapAuthError("Password must be at least 6 characters"))
      return
    }

    setIsLoading(true)

    try {
      const { error } = await supabase.auth.updateUser({
        password,
      })

      if (error) {
        const errorInfo = mapAuthError(error)
        setError(errorInfo)
      } else {
        setIsSuccess(true)
      }
    } catch (error: any) {
      const errorInfo = mapAuthError(error instanceof Error ? error : "Failed to reset password")
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
          <CardTitle className="text-2xl text-white">Set new password</CardTitle>
          <CardDescription className="text-gray-300">
            Choose a strong password for your account
          </CardDescription>
        </CardHeader>

        <CardContent>
          {isValidatingLink && (
            <div className="flex items-center justify-center gap-2 text-gray-300 py-6">
              <Loader2 className="h-4 w-4 animate-spin" />
              Validating reset link...
            </div>
          )}

          {/* Error Display */}
          {!isValidatingLink && error && (
            <AuthErrorDisplay
              error={error}
              onRetry={handleRetry}
              onContactSupport={handleContactSupport}
              className="mb-6"
            />
          )}

          {!isValidatingLink && isSuccess ? (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-green-500/20 border border-green-500/50 backdrop-blur-sm">
                <div className="flex items-center text-green-200">
                  <CheckCircle className="h-5 w-5 mr-3 flex-shrink-0" />
                  <div>
                    <div className="font-semibold">Password reset successful!</div>
                    <div className="text-sm opacity-90 mt-1">
                      Your password has been updated successfully.
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-center text-sm text-gray-400">
                <p>Redirecting to login page in {countDown} seconds...</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push("/login")}
                  className="mt-2 bg-white/10 border-white/20 text-white hover:bg-white/20 hover:border-white/30"
                >
                  Go to login now
                </Button>
              </div>
            </div>
          ) : null}

          {!isValidatingLink && !isSuccess && isSessionReady ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-white font-medium">
                  New Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your new password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    disabled={isLoading}
                    className="bg-white/10 border-white/20 text-white placeholder-gray-400 backdrop-blur-sm focus:border-purple-500 focus:ring-purple-500/50 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                    disabled={isLoading}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-white font-medium">
                  Confirm New Password
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm your new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    className="bg-white/10 border-white/20 text-white placeholder-gray-400 backdrop-blur-sm focus:border-purple-500 focus:ring-purple-500/50 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                    disabled={isLoading}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="text-xs text-gray-400">
                Password should be at least 6 characters long
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold py-3 rounded-xl shadow-lg hover:shadow-purple-500/25 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Updating password...
                  </div>
                ) : (
                  "Update password"
                )}
              </Button>
            </form>
          ) : null}
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
