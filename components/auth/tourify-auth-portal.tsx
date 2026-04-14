"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AuthErrorDisplay } from "@/components/ui/auth-error-display"
import { mapAuthError, type AuthErrorInfo } from "@/lib/auth-errors"
import {
  type AuthTab,
  generateUsername,
  normalizePostLoginRedirect,
  normalizeUsername,
} from "@/lib/auth/tourify-auth-helpers"
import { ArrowRight, CheckCircle, Eye, EyeOff, Loader2, Shield, Sparkles } from "lucide-react"

type AccountType = "general" | "artist" | "venue" | "organization"

export interface TourifyAuthPortalProps {
  /** When true, read/write `?tab=` to match the selected tab (full login page). */
  syncSearchParams?: boolean
  /** Default tab when `syncSearchParams` is false or URL has no `tab`. */
  defaultTab?: AuthTab
  className?: string
  wrapperClassName?: string
  showSecurityFooter?: boolean
  cardTitle?: string
  cardDescription?: string
}

export function TourifyAuthPortal({
  syncSearchParams = false,
  defaultTab = "signup",
  className,
  wrapperClassName,
  showSecurityFooter = true,
  cardTitle = "Create your Tourify account",
  cardDescription = "Start free in minutes and activate your profile fast.",
}: TourifyAuthPortalProps) {
  const { isAuthenticated, signIn, signUp, signInWithSocial } = useAuth()
  const searchParams = useSearchParams()

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<AuthErrorInfo | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isRedirecting, setIsRedirecting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isSocialSubmitting, setIsSocialSubmitting] = useState<"google" | "apple" | "facebook" | null>(null)
  const [isUsernameEditedManually, setIsUsernameEditedManually] = useState(false)
  const [usernameCheck, setUsernameCheck] = useState<{
    normalized: string
    available: boolean | null
    isChecking: boolean
    message: string
  }>({
    normalized: "",
    available: null,
    isChecking: false,
    message: "",
  })

  const [signInData, setSignInData] = useState({
    email: "",
    password: "",
  })

  const [signUpData, setSignUpData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    name: "",
    username: "",
    accountType: "general" as AccountType,
  })

  const redirectTo = normalizePostLoginRedirect(
    searchParams.get("redirectTo") || searchParams.get("redirect") || searchParams.get("next") || "/dashboard"
  )
  const emailConfirmed = searchParams.get("message") === "email_confirmed"
  const accountCreated = searchParams.get("message") === "account_created"
  const confirmedEmail = searchParams.get("email") || ""
  const inviteToken = searchParams.get("token") || ""
  const inviteType = searchParams.get("type") || ""
  const position = searchParams.get("position") || ""
  const department = searchParams.get("department") || ""
  const oauthError = searchParams.get("oauth_error") || ""

  const urlTab: AuthTab = searchParams.get("tab") === "signin" ? "signin" : "signup"
  const initialAuthTab: AuthTab = syncSearchParams ? urlTab : defaultTab
  const [activeAuthTab, setActiveAuthTab] = useState<AuthTab>(initialAuthTab)

  useEffect(() => {
    if (emailConfirmed) {
      setSuccess("Email confirmed successfully! You can now sign in to your account.")
      if (confirmedEmail) setSignInData((prev) => ({ ...prev, email: confirmedEmail }))
    } else if (accountCreated) {
      setSuccess("Account created successfully! Please check your email to confirm your account before signing in.")
      if (confirmedEmail) setSignInData((prev) => ({ ...prev, email: confirmedEmail }))
    }
  }, [emailConfirmed, accountCreated, confirmedEmail])

  useEffect(() => {
    if (!oauthError) return
    setError(mapAuthError(decodeURIComponent(oauthError)))
  }, [oauthError])

  useEffect(() => {
    setActiveAuthTab(initialAuthTab)
  }, [initialAuthTab])

  useEffect(() => {
    if (isUsernameEditedManually) return
    const generatedUsername = generateUsername({
      fullName: signUpData.name,
      email: signUpData.email,
    })
    if (!generatedUsername || generatedUsername === signUpData.username) return
    setSignUpData((prev) => ({ ...prev, username: generatedUsername }))
  }, [isUsernameEditedManually, signUpData.name, signUpData.email, signUpData.username])

  useEffect(() => {
    if (activeAuthTab !== "signup") return

    const normalized = normalizeUsername(signUpData.username)
    if (!normalized) {
      setUsernameCheck({
        normalized: "",
        available: null,
        isChecking: false,
        message: "",
      })
      return
    }

    let isCancelled = false
    const timeoutId = setTimeout(async () => {
      setUsernameCheck((current) => ({
        ...current,
        normalized,
        isChecking: true,
      }))

      try {
        const response = await fetch(`/api/auth/check-username?username=${encodeURIComponent(normalized)}`)
        const payload = await response.json().catch(() => null)

        if (isCancelled) return

        if (!response.ok) {
          setUsernameCheck({
            normalized,
            available: null,
            isChecking: false,
            message: payload?.message || "Could not verify username right now.",
          })
          return
        }

        setUsernameCheck({
          normalized: payload?.username || normalized,
          available: Boolean(payload?.available),
          isChecking: false,
          message: payload?.message || "",
        })
      } catch {
        if (isCancelled) return
        setUsernameCheck({
          normalized,
          available: null,
          isChecking: false,
          message: "Could not verify username right now.",
        })
      }
    }, 350)

    return () => {
      isCancelled = true
      clearTimeout(timeoutId)
    }
  }, [activeAuthTab, signUpData.username])

  useEffect(() => {
    if (error) setError(null)
    if (success) setSuccess(null)
  }, [signInData.email, signInData.password, signUpData.email, signUpData.password])

  useEffect(() => {
    if (isAuthenticated && success && !isRedirecting) {
      const validRedirectTo = normalizePostLoginRedirect(redirectTo)
      setIsRedirecting(true)
      setSuccess("Successfully signed in! Redirecting to dashboard...")
      setTimeout(() => {
        window.location.assign(validRedirectTo)
      }, 1000)
    }
  }, [isAuthenticated, success, redirectTo, isRedirecting])

  const handleRetry = () => {
    setError(null)
    setSuccess(null)
    setIsRedirecting(false)
  }

  const handleContactSupport = () => {
    window.open("mailto:support@tourify.com?subject=Login Issue", "_blank")
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setIsRedirecting(false)
    setIsSubmitting(true)

    try {
      const result = await signIn(signInData.email, signInData.password)

      if (result.error) setError(mapAuthError(result.error))
      else setSuccess("Successfully signed in! Please wait...")
    } catch (err) {
      setError(mapAuthError(err instanceof Error ? err : "Failed to sign in"))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSocialSignIn = async (provider: "google" | "apple" | "facebook") => {
    setError(null)
    setSuccess(null)
    setIsSocialSubmitting(provider)
    const result = await signInWithSocial(provider, redirectTo)
    if (result.error) {
      setError(mapAuthError(result.error))
      setIsSocialSubmitting(null)
    }
  }

  const handleAuthTabChange = (tab: AuthTab) => {
    setActiveAuthTab(tab)
    if (!syncSearchParams || typeof window === "undefined") return
    const nextUrl = new URL(window.location.href)
    nextUrl.searchParams.set("tab", tab)
    window.history.replaceState({}, "", nextUrl.toString())
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (signUpData.password !== signUpData.confirmPassword) {
      setError(mapAuthError("Passwords don't match"))
      return
    }

    if (signUpData.password.length < 6) {
      setError(mapAuthError("Password must be at least 6 characters"))
      return
    }

    if (!signUpData.email || !signUpData.email.includes("@")) {
      setError(mapAuthError("Please enter a valid email address"))
      return
    }

    if (!signUpData.name.trim()) {
      setError(mapAuthError("Please enter your full name"))
      return
    }

    const usernameToUse =
      signUpData.username.trim() ||
      generateUsername({
        fullName: signUpData.name,
        email: signUpData.email,
      })
    const normalizedUsernameToUse = normalizeUsername(usernameToUse)

    if (!normalizedUsernameToUse) {
      setError(mapAuthError("Please enter a full name to generate your username"))
      return
    }

    if (!signUpData.username.trim()) {
      setSignUpData((prev) => ({ ...prev, username: normalizedUsernameToUse }))
    }

    if (usernameCheck.isChecking) {
      setError(mapAuthError("Checking username availability. Please wait a moment and try again."))
      return
    }

    if (usernameCheck.available === false && usernameCheck.normalized === normalizedUsernameToUse) {
      setError(mapAuthError("That username is already taken. Please choose another username."))
      return
    }

    setIsSubmitting(true)

    try {
      const result = await signUp(signUpData.email, signUpData.password, {
        full_name: signUpData.name,
        username: normalizedUsernameToUse,
        account_type: signUpData.accountType,
      })

      if (result.error) setError(mapAuthError(result.error))
      else {
        if (inviteToken) {
          console.log("Invitation flow will continue after email confirmation")
        }
        if (result.needsEmailConfirmation) {
          setSuccess(
            "Account created successfully! Please check your email to confirm your account."
          )
        } else {
          setSuccess("Account created successfully! You are signed in — continue to your dashboard.")
        }
      }
    } catch (err) {
      setError(mapAuthError(err instanceof Error ? err : "Failed to sign up"))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className={wrapperClassName ?? "w-full max-w-md mx-auto"}>
      <Card
        className={`login-auth-shard bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl overflow-hidden ${className ?? ""}`}
        style={{ clipPath: "polygon(3% 0, 100% 1%, 97% 100%, 0 96%, 1% 18%)" }}
      >
        <CardHeader className="text-center pb-4 pt-6">
          <div className="flex justify-center mb-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl text-white font-bold">{cardTitle}</CardTitle>
          <CardDescription className="text-gray-300">{cardDescription}</CardDescription>
        </CardHeader>

        <CardContent>
          {inviteToken ? (
            <div className="mb-6 p-4 rounded-lg bg-purple-500/20 border border-purple-500/50 backdrop-blur-sm">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-purple-400" />
                <div>
                  <p className="text-sm font-medium text-purple-200">
                    {inviteType === "artist"
                      ? "Artist Booking Invitation"
                      : inviteType === "staff"
                        ? "Staff Position Invitation"
                        : "Invitation"}
                  </p>
                  {position ? (
                    <p className="text-xs text-purple-300">
                      Position: {position}
                      {department && ` • ${department}`}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

          {success ? (
            <div className="mb-6 p-4 rounded-lg bg-green-500/20 border border-green-500/50 backdrop-blur-sm">
              <div className="flex items-center text-green-200">
                <CheckCircle className="h-4 w-4 mr-2" />
                <span className="text-sm font-medium">{success}</span>
              </div>
            </div>
          ) : null}

          {error ? (
            <AuthErrorDisplay
              error={error}
              onRetry={handleRetry}
              onContactSupport={handleContactSupport}
              className="mb-6"
            />
          ) : null}

          <Tabs value={activeAuthTab} onValueChange={(value) => handleAuthTabChange(value as AuthTab)} className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-white/10 backdrop-blur-sm">
              <TabsTrigger value="signup" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white">
                Sign Up
              </TabsTrigger>
              <TabsTrigger value="signin" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white">
                Sign In
              </TabsTrigger>
            </TabsList>

            <TabsContent value="signin" className="space-y-4 mt-6">
              <div className="space-y-2">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-white/20 bg-white/5 text-white hover:bg-white/10"
                  onClick={() => void handleSocialSignIn("google")}
                  disabled={isSubmitting || !!isSocialSubmitting}
                >
                  {isSocialSubmitting === "google" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Continue with Google
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-white/20 bg-white/5 text-white hover:bg-white/10"
                  onClick={() => void handleSocialSignIn("apple")}
                  disabled={isSubmitting || !!isSocialSubmitting}
                >
                  {isSocialSubmitting === "apple" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Continue with Apple
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-white/20 bg-white/5 text-white hover:bg-white/10"
                  onClick={() => void handleSocialSignIn("facebook")}
                  disabled={isSubmitting || !!isSocialSubmitting}
                >
                  {isSocialSubmitting === "facebook" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Continue with Facebook
                </Button>
              </div>
              <div className="relative py-1">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/20" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-slate-900/80 px-3 text-xs uppercase tracking-[0.14em] text-slate-300">or use email</span>
                </div>
              </div>
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="portal-signin-email" className="text-white font-medium">
                    Email
                  </Label>
                  <Input
                    id="portal-signin-email"
                    type="email"
                    placeholder="Enter your email"
                    value={signInData.email}
                    onChange={(e) => setSignInData({ ...signInData, email: e.target.value })}
                    className="bg-white/10 border-white/20 text-white placeholder-gray-400 backdrop-blur-sm focus:border-purple-500 focus:ring-purple-500/50"
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="portal-signin-password" className="text-white font-medium">
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="portal-signin-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={signInData.password}
                      onChange={(e) => setSignInData({ ...signInData, password: e.target.value })}
                      className="bg-white/10 border-white/20 text-white placeholder-gray-400 backdrop-blur-sm focus:border-purple-500 focus:ring-purple-500/50 pr-10"
                      required
                      disabled={isSubmitting}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                      disabled={isSubmitting}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold py-3 rounded-xl shadow-lg hover:shadow-purple-500/25 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <div className="flex items-center">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Signing In...
                    </div>
                  ) : (
                    <div className="flex items-center">
                      Sign In
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </div>
                  )}
                </Button>
              </form>

              <div className="text-center">
                <Button variant="link" className="text-purple-400 hover:text-purple-300" asChild>
                  <Link href="/forgot-password">Forgot your password?</Link>
                </Button>
              </div>
              <div className="text-center text-sm text-gray-300">
                New to Tourify?{" "}
                <button
                  type="button"
                  className="font-semibold text-cyan-200 hover:text-cyan-100"
                  onClick={() => handleAuthTabChange("signup")}
                >
                  Create your account
                </button>
              </div>
            </TabsContent>

            <TabsContent value="signup" className="space-y-4 mt-6">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="portal-signup-name" className="text-white font-medium">
                      Full Name
                    </Label>
                    <Input
                      id="portal-signup-name"
                      type="text"
                      placeholder="John Doe"
                      value={signUpData.name}
                      onChange={(e) => setSignUpData({ ...signUpData, name: e.target.value })}
                      className="bg-white/10 border-white/20 text-white placeholder-gray-400 backdrop-blur-sm focus:border-purple-500 focus:ring-purple-500/50"
                      required
                      disabled={isSubmitting}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="portal-signup-username" className="text-white font-medium">
                      Username
                    </Label>
                    <Input
                      id="portal-signup-username"
                      type="text"
                      placeholder="auto-generated from your name"
                      value={signUpData.username}
                      onChange={(e) => {
                        setIsUsernameEditedManually(true)
                        setSignUpData({ ...signUpData, username: normalizeUsername(e.target.value) })
                      }}
                      className="bg-white/10 border-white/20 text-white placeholder-gray-400 backdrop-blur-sm focus:border-purple-500 focus:ring-purple-500/50"
                      disabled={isSubmitting}
                    />
                    {signUpData.username ? (
                      <div className="text-[11px]">
                        {usernameCheck.isChecking ? (
                          <p className="text-cyan-200">Checking username availability...</p>
                        ) : usernameCheck.available === true ? (
                          <p className="text-emerald-200">Username is available</p>
                        ) : usernameCheck.available === false ? (
                          <p className="text-rose-200">Username is taken. Try another.</p>
                        ) : (
                          <p className="text-amber-200">
                            {usernameCheck.message || "We auto-fill this. You can customize anytime."}
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-300">We auto-fill this. You can customize anytime.</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="portal-signup-email" className="text-white font-medium">
                    Email
                  </Label>
                  <Input
                    id="portal-signup-email"
                    type="email"
                    placeholder="john@example.com"
                    value={signUpData.email}
                    onChange={(e) => setSignUpData({ ...signUpData, email: e.target.value })}
                    className="bg-white/10 border-white/20 text-white placeholder-gray-400 backdrop-blur-sm focus:border-purple-500 focus:ring-purple-500/50"
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="portal-signup-password" className="text-white font-medium">
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="portal-signup-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Create a strong password"
                      value={signUpData.password}
                      onChange={(e) => setSignUpData({ ...signUpData, password: e.target.value })}
                      className="bg-white/10 border-white/20 text-white placeholder-gray-400 backdrop-blur-sm focus:border-purple-500 focus:ring-purple-500/50 pr-10"
                      required
                      minLength={6}
                      disabled={isSubmitting}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                      disabled={isSubmitting}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="portal-signup-confirm-password" className="text-white font-medium">
                    Confirm Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="portal-signup-confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm your password"
                      value={signUpData.confirmPassword}
                      onChange={(e) => setSignUpData({ ...signUpData, confirmPassword: e.target.value })}
                      className="bg-white/10 border-white/20 text-white placeholder-gray-400 backdrop-blur-sm focus:border-purple-500 focus:ring-purple-500/50 pr-10"
                      required
                      disabled={isSubmitting}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                      disabled={isSubmitting}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold py-3 rounded-xl shadow-lg hover:shadow-green-500/25 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isSubmitting || usernameCheck.isChecking || usernameCheck.available === false}
                >
                  {isSubmitting ? (
                    <div className="flex items-center">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Creating Account...
                    </div>
                  ) : (
                    <div className="flex items-center">
                      Create Account
                      <Sparkles className="ml-2 h-4 w-4" />
                    </div>
                  )}
                </Button>
              </form>

              <div className="relative py-1">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/20" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-slate-900/80 px-3 text-xs uppercase tracking-[0.14em] text-slate-300">
                    or sign up with
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-white/20 bg-white/5 text-white hover:bg-white/10"
                  onClick={() => void handleSocialSignIn("google")}
                  disabled={isSubmitting || !!isSocialSubmitting}
                >
                  {isSocialSubmitting === "google" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Sign up with Google
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-white/20 bg-white/5 text-white hover:bg-white/10"
                  onClick={() => void handleSocialSignIn("apple")}
                  disabled={isSubmitting || !!isSocialSubmitting}
                >
                  {isSocialSubmitting === "apple" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Sign up with Apple
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-white/20 bg-white/5 text-white hover:bg-white/10"
                  onClick={() => void handleSocialSignIn("facebook")}
                  disabled={isSubmitting || !!isSocialSubmitting}
                >
                  {isSocialSubmitting === "facebook" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Sign up with Facebook
                </Button>
              </div>

              <div className="text-center text-sm text-gray-400">
                By signing up, you agree to our{" "}
                <Link href="/terms" className="text-purple-400 hover:text-purple-300 underline">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link href="/privacy" className="text-purple-400 hover:text-purple-300 underline">
                  Privacy Policy
                </Link>
              </div>
              <div className="text-center text-sm text-gray-300">
                Already have an account?{" "}
                <button
                  type="button"
                  className="font-semibold text-cyan-200 hover:text-cyan-100"
                  onClick={() => handleAuthTabChange("signin")}
                >
                  Sign in
                </button>
              </div>
              <div className="mt-3 rounded-lg border border-emerald-300/30 bg-emerald-300/10 px-3 py-2 text-center text-xs text-emerald-100">
                Start free in 2026 and unlock live opportunity matching instantly.
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {showSecurityFooter ? (
        <div className="text-center mt-8 text-gray-400 text-sm">
          <div className="flex items-center justify-center space-x-2 mb-2">
            <Shield className="h-4 w-4" />
            <span>Secured by enterprise-grade encryption</span>
          </div>
          <p>© {new Date().getFullYear()} Tourify. The future of music networking.</p>
        </div>
      ) : null}
    </div>
  )
}
