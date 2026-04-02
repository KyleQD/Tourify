"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AuthErrorDisplay } from "@/components/ui/auth-error-display"
import { mapAuthError, AuthErrorInfo } from "@/lib/auth-errors"
import { formatSafeDate } from "@/lib/events/admin-event-normalization"
import { Building, Users, Star, ArrowRight, Loader2, Eye, EyeOff, Sparkles, Zap, Globe, Shield, CheckCircle, ExternalLink, Radio, TrendingUp } from "lucide-react"
import Link from "next/link"
import { TourifyLogo } from "@/components/tourify-logo"

export default function LoginPage() {
  const { user, loading, isAuthenticated, signIn, signUp } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Form states
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<AuthErrorInfo | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isRedirecting, setIsRedirecting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [newsHighlights, setNewsHighlights] = useState<LoginNewsItem[]>([])
  const [discoverHighlights, setDiscoverHighlights] = useState<LoginDiscoverItem[]>([])
  const [isLoadingNews, setIsLoadingNews] = useState(true)
  const [locationInput, setLocationInput] = useState("")
  const [appliedLocation, setAppliedLocation] = useState("")
  const [isLocating, setIsLocating] = useState(false)
  
  // Sign In form
  const [signInData, setSignInData] = useState({
    email: "",
    password: ""
  })
  
  // Sign Up form
  const [signUpData, setSignUpData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    name: "",
    username: ""
  })

  const redirectTo = normalizePostLoginRedirect(
    searchParams.get('redirectTo') || searchParams.get('next') || '/dashboard'
  )
  const emailConfirmed = searchParams.get('message') === 'email_confirmed'
  const accountCreated = searchParams.get('message') === 'account_created'
  const confirmedEmail = searchParams.get('email') || ''
  const inviteToken = searchParams.get('token') || ''
  const inviteType = searchParams.get('type') || ''
  const position = searchParams.get('position') || ''
  const department = searchParams.get('department') || ''

  // Handle email confirmation and account creation messages
  useEffect(() => {
    if (emailConfirmed) {
      setSuccess('Email confirmed successfully! You can now sign in to your account.')
      if (confirmedEmail) {
        setSignInData(prev => ({ ...prev, email: confirmedEmail }))
      }
    } else if (accountCreated) {
      setSuccess('Account created successfully! Please check your email to confirm your account before signing in.')
      if (confirmedEmail) {
        setSignInData(prev => ({ ...prev, email: confirmedEmail }))
      }
    }
  }, [emailConfirmed, accountCreated, confirmedEmail])

  // Clear error when user starts typing
  useEffect(() => {
    if (error) {
      setError(null)
    }
    if (success) {
      setSuccess(null)
    }
  }, [signInData.email, signInData.password, signUpData.email, signUpData.password])

  // Listen for authentication state changes to redirect immediately
  useEffect(() => {
    if (isAuthenticated && success && !isRedirecting) {
      // User is now authenticated and we've shown success message
      const validRedirectTo = normalizePostLoginRedirect(redirectTo)
      console.log('[Login] User authenticated, preparing redirect to:', validRedirectTo)
      
      setIsRedirecting(true)
      setSuccess('Successfully signed in! Redirecting to dashboard...')
      
      // Give the auth state a moment to fully propagate
      setTimeout(() => {
        console.log('[Login] Executing redirect to:', validRedirectTo)
        router.push(validRedirectTo)
      }, 1000)
    }
  }, [isAuthenticated, success, redirectTo, router, isRedirecting])

  useEffect(() => {
    let hasMounted = true

    async function fetchHubHighlights(location: string) {
      setIsLoadingNews(true)
      try {
        const locationQuery = location.trim()
        const locationParam = locationQuery ? `?location=${encodeURIComponent(locationQuery)}&intent=grow` : ""

        const response = await fetch(`/api/hub${locationParam}`)
        if (!response.ok) throw new Error("Unable to fetch hub highlights")

        const hubData: LoginHubResponse = await response.json()

        if (!hasMounted) return

        const mappedHighlights = (hubData.sections?.pulse || []).slice(0, 6).map(item => ({
          id: item.id,
          title: decodeTextEntity(item.title),
          sourceName: decodeTextEntity(item.sourceName),
          topic: decodeTextEntity(item.topics?.[0] || "Music"),
          url: item.url || "#",
          summary: decodeTextEntity(item.summary || "Fresh movement across the music industry.")
        }))

        const discoverItems = (hubData.sections?.discover || []).slice(0, 4).map((item) => ({
          id: String(item.id),
          title: decodeTextEntity(item.title || "Live opportunity"),
          summary: decodeTextEntity(item.description || "High-signal demand from Discover."),
          venue: [item.venue_name, item.venue_city, item.venue_state].filter(Boolean).join(", "),
          eventDate: item.event_date || null,
        }))

        setNewsHighlights(mappedHighlights)
        setDiscoverHighlights(discoverItems)
      } catch (hubError) {
        console.error("[Login] Hub highlights fetch failed:", hubError)
        if (!hasMounted) return
        setNewsHighlights(FALLBACK_NEWS_HIGHLIGHTS)
        setDiscoverHighlights(FALLBACK_DISCOVER_HIGHLIGHTS)
      } finally {
        if (hasMounted) setIsLoadingNews(false)
      }
    }

    void fetchHubHighlights(appliedLocation)

    return () => {
      hasMounted = false
    }
  }, [appliedLocation])

  async function handleUseCurrentLocation() {
    if (typeof navigator === "undefined" || !navigator.geolocation) return

    setIsLocating(true)
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 12000,
          maximumAge: 300000,
        })
      })

      const location = await reverseGeocode({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      })

      setLocationInput(location)
      setAppliedLocation(location)
    } catch (error) {
      console.error("[Login] Failed to detect location:", error)
    } finally {
      setIsLocating(false)
    }
  }

  const handleRetry = () => {
    setError(null)
    setSuccess(null)
    setIsRedirecting(false)
  }

  const handleContactSupport = () => {
    // You can replace this with your actual support contact method
    window.open('mailto:support@tourify.com?subject=Login Issue', '_blank')
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setIsRedirecting(false)
    setIsSubmitting(true)
    
    try {
      console.log('[Login] Attempting sign in for:', signInData.email)
      const result = await signIn(signInData.email, signInData.password)
      
      if (result.error) {
        console.log('[Login] Sign in error:', result.error)
        const errorInfo = mapAuthError(result.error)
        setError(errorInfo)
      } else {
        console.log('[Login] Sign in successful, setting success state')
        setSuccess('Successfully signed in! Please wait...')
        // The redirect will be handled by the useEffect above when isAuthenticated becomes true
      }
    } catch (err) {
      console.log('[Login] Sign in exception:', err)
      const errorInfo = mapAuthError(err instanceof Error ? err : 'Failed to sign in')
      setError(errorInfo)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    
    // Client-side validation
    if (signUpData.password !== signUpData.confirmPassword) {
      setError(mapAuthError("Passwords don't match"))
      return
    }
    
    if (signUpData.password.length < 6) {
      setError(mapAuthError("Password must be at least 6 characters"))
      return
    }

    if (!signUpData.email || !signUpData.email.includes('@')) {
      setError(mapAuthError("Please enter a valid email address"))
      return
    }

    if (!signUpData.name.trim()) {
      setError(mapAuthError("Please enter your full name"))
      return
    }

    if (!signUpData.username.trim()) {
      setError(mapAuthError("Please enter a username"))
      return
    }
    
    setIsSubmitting(true)
    
    try {
      const result = await signUp(signUpData.email, signUpData.password, { 
        full_name: signUpData.name, 
        username: signUpData.username 
      })
      
      if (result.error) {
        const errorInfo = mapAuthError(result.error)
        setError(errorInfo)
      } else {
        // Handle invitations if present
        if (inviteToken) {
          try {
            if (inviteType === 'artist') {
              // For artist bookings, we'll handle this after email confirmation
              console.log('Artist booking invitation detected, will be processed after email confirmation')
            } else if (inviteType === 'staff') {
              // For staff invitations, we'll handle this after email confirmation
              console.log('Staff invitation detected, will be processed after email confirmation')
            } else {
              // For general invitations, we'll handle this after email confirmation
              console.log('General invitation detected, will be processed after email confirmation')
            }
          } catch (inviteError) {
            console.error('Error handling invitation:', inviteError)
          }
        }
        
        setSuccess('Account created successfully! Please check your email to confirm your account.')
        // Don't redirect immediately for sign up - let them confirm email first
      }
    } catch (err) {
      const errorInfo = mapAuthError(err instanceof Error ? err : 'Failed to sign up')
      setError(errorInfo)
    } finally {
      setIsSubmitting(false)
    }
  }

  const highlights = newsHighlights.length ? newsHighlights : FALLBACK_NEWS_HIGHLIGHTS
  const tickerHighlights = [...highlights, ...highlights]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white overflow-hidden">
      <div className="pointer-events-none fixed inset-x-0 top-0 z-40 h-9 overflow-hidden border-y border-fuchsia-200/40 bg-gradient-to-r from-fuchsia-900/45 via-violet-900/35 to-cyan-900/45 backdrop-blur-xl">
        <div className="edge-login-ticker-forward flex w-[200%] gap-3 px-3 py-1.5">
          {tickerHighlights.map((item, index) => (
            <a
              key={`login-top-${item.id}-${index}`}
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className="pointer-events-auto shrink-0 rounded-full border border-white/25 bg-white/10 px-3 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-100 transition hover:bg-white/20"
            >
              <span className="mr-2 rounded-full bg-black/35 px-1.5 py-0 text-[9px]">{item.topic}</span>
              {item.sourceName} // {item.title}
            </a>
          ))}
        </div>
      </div>

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 h-9 overflow-hidden border-y border-cyan-200/40 bg-gradient-to-r from-cyan-900/45 via-indigo-900/35 to-fuchsia-900/45 backdrop-blur-xl">
        <div className="edge-login-ticker-reverse flex w-[200%] gap-3 px-3 py-1.5">
          {tickerHighlights.map((item, index) => (
            <a
              key={`login-bottom-${item.id}-${index}`}
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className="pointer-events-auto shrink-0 rounded-full border border-white/25 bg-white/10 px-3 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-100 transition hover:bg-white/20"
            >
              <span className="mr-2 rounded-full bg-black/35 px-1.5 py-0 text-[9px]">{item.topic}</span>
              {item.sourceName} // {item.title}
            </a>
          ))}
        </div>
      </div>

      {/* Animated Background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] bg-center bg-repeat opacity-10"></div>
        <div className="absolute top-0 left-0 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute top-0 right-0 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-0 left-1/2 w-72 h-72 bg-indigo-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
        <div className="login-shard-drift-a absolute left-[-14%] top-24 h-24 w-[130%] rotate-[-12deg] border border-white/20 bg-white/10 backdrop-blur-2xl" />
        <div className="login-shard-drift-b absolute right-[-16%] bottom-28 h-20 w-[135%] rotate-[11deg] border border-cyan-200/30 bg-cyan-200/10 backdrop-blur-2xl" />
        <div className="login-shard-drift-c absolute left-[-12%] top-[58%] h-16 w-[125%] rotate-[-8deg] border border-fuchsia-200/20 bg-fuchsia-200/10 backdrop-blur-xl" />
      </div>
      
      {/* Content */}
      <div className="relative flex items-center justify-center min-h-screen p-4 pt-16 pb-14">
        <div className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          
          {/* Left Side - Branding & Info */}
          <div className="text-center lg:text-left space-y-8">
            {/* Logo */}
            <div className="flex justify-center lg:justify-start">
              <TourifyLogo 
                variant="white" 
                size="6xl"
                className="filter drop-shadow-2xl" 
              />
            </div>
            
            {/* Tagline */}
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold text-gray-200">
                Connect. Create. Tour. Succeed.
              </h1>
            </div>
            
            {/* Hero Text */}
            <div className="space-y-6">
              <p className="text-xl lg:text-2xl text-white font-medium leading-relaxed max-w-2xl">
                Tourify is revolutionizing how artists, venues, and industry professionals collaborate.
              </p>
              
              <p className="text-lg text-gray-300 leading-relaxed max-w-2xl">
                From discovering your next venue to booking world-class talent, managing tours to building 
                lasting industry relationships — Tourify powers every aspect of your music career with 
                cutting-edge technology and real-time insights.
              </p>
            </div>
            
            <div className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-2xl">
              <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-cyan-100">
                <Radio className="h-3.5 w-3.5" />
                Live Industry Pulse
              </div>
              <div className="overflow-hidden rounded-xl border border-white/10 bg-black/20">
                <div className="login-ticker-track flex w-[200%] gap-3 px-3 py-2">
                  {tickerHighlights.map((item, index) => (
                    <a
                      key={`ticker-${item.id}-${index}`}
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className="login-ticker-chip shrink-0 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-100 transition hover:border-cyan-200/60 hover:bg-cyan-300/20 hover:text-white"
                    >
                      <span className="mr-2 rounded-full bg-black/40 px-1.5 py-0.5 text-[10px] text-cyan-100">{item.topic}</span>
                      {item.sourceName} // {item.title}
                    </a>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-2xl">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-purple-100">
                  <Globe className="h-3.5 w-3.5" />
                  Localized Signal Mode
                </div>
                {appliedLocation ? (
                  <span className="rounded-full border border-emerald-300/40 bg-emerald-300/15 px-2 py-0.5 text-[11px] text-emerald-100">
                    Near {appliedLocation}
                  </span>
                ) : null}
              </div>
              <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
                <Input
                  value={locationInput}
                  onChange={(event) => setLocationInput(event.target.value)}
                  placeholder="City, state"
                  className="border-white/25 bg-black/30 text-white placeholder:text-slate-400"
                />
                <Button
                  variant="outline"
                  className="border-white/25 bg-white/5 text-slate-100 hover:bg-white/10"
                  onClick={() => setAppliedLocation(locationInput.trim())}
                >
                  Apply
                </Button>
                <Button
                  variant="outline"
                  className="border-white/25 bg-white/5 text-slate-100 hover:bg-white/10"
                  onClick={handleUseCurrentLocation}
                  disabled={isLocating}
                >
                  {isLocating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />}
                </Button>
              </div>
              <p className="mt-2 text-xs text-slate-300">
                Pulling location-aware Discover opportunities + Pulse stories.
              </p>
            </div>

            {/* Features Grid */}
            <div className="hidden lg:grid grid-cols-2 gap-6">
              <div className="group p-6 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-all duration-300">
                <div className="space-y-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Star className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-lg">Professional EPKs</h3>
                    <p className="text-sm text-gray-300">Create stunning press kits that get you booked</p>
                  </div>
                </div>
              </div>
              
              <div className="group p-6 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-all duration-300">
                <div className="space-y-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Building className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-lg">Smart Venue Matching</h3>
                    <p className="text-sm text-gray-300">AI-powered venue discovery for perfect shows</p>
                  </div>
                </div>
              </div>
              
              <div className="group p-6 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-all duration-300">
                <div className="space-y-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Users className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-lg">Industry Network</h3>
                    <p className="text-sm text-gray-300">Connect with 50K+ verified music professionals</p>
                  </div>
                </div>
              </div>
              
              <div className="group p-6 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-all duration-300">
                <div className="space-y-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Zap className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-lg">Tour Management</h3>
                    <p className="text-sm text-gray-300">End-to-end tour planning and real-time analytics</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Trending News to Spark Your Next Move</h2>
                <Link href="/feed" className="text-sm font-medium text-cyan-200 hover:text-cyan-100">
                  Explore full news feed
                </Link>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {highlights.slice(0, 3).map((story, index) => (
                  <article
                    key={story.id}
                    className="group relative overflow-hidden border border-white/20 bg-white/10 p-4 backdrop-blur-2xl transition hover:border-cyan-200/40 hover:bg-white/15"
                    style={{ clipPath: LOGIN_NEWS_CLIP_PATHS[index % LOGIN_NEWS_CLIP_PATHS.length] }}
                  >
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent" />
                    <div className="relative space-y-3">
                      <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.14em] text-slate-300">
                        <span>{story.topic}</span>
                        <span>{story.sourceName}</span>
                      </div>
                      <h3 className="line-clamp-2 text-base font-semibold text-white">{story.title}</h3>
                      <p className="line-clamp-2 text-sm text-slate-200">{story.summary}</p>
                      <a
                        href={story.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-sm font-medium text-cyan-200 transition hover:text-cyan-100"
                      >
                        Read story
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  </article>
                ))}
              </div>
              <p className="text-xs text-slate-300">
                {isLoadingNews ? "Loading fresh headlines..." : "Updated continuously with real-time music industry headlines."}
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Discover Opportunities Near You</h2>
                <Link href="/discover" className="text-sm font-medium text-purple-200 hover:text-purple-100">
                  Explore discover
                </Link>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {(discoverHighlights.length ? discoverHighlights : FALLBACK_DISCOVER_HIGHLIGHTS).slice(0, 4).map((item, index) => (
                  <article
                    key={item.id}
                    className="group relative overflow-hidden border border-white/20 bg-white/10 p-4 backdrop-blur-2xl transition hover:border-purple-200/50 hover:bg-white/15"
                    style={{ clipPath: LOGIN_DISCOVER_CLIP_PATHS[index % LOGIN_DISCOVER_CLIP_PATHS.length] }}
                  >
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent" />
                    <div className="relative space-y-3">
                      <h3 className="line-clamp-2 text-base font-semibold text-white">{item.title}</h3>
                      <p className="line-clamp-2 text-sm text-slate-200">{item.summary}</p>
                      <div className="flex items-center justify-between gap-2 text-xs text-slate-300">
                        <span className="line-clamp-1">{item.venue || "Tourify network signal"}</span>
                        <span>{formatSafeDate(item.eventDate)}</span>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {SIGNUP_STATS.map((item) => (
                <div
                  key={item.label}
                  className="rounded-xl border border-white/20 bg-white/10 p-4 backdrop-blur-xl transition hover:border-purple-300/40 hover:bg-white/15"
                >
                  <p className="text-2xl font-bold text-white">{item.value}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.14em] text-slate-300">{item.label}</p>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-purple-300/30 bg-purple-300/10 p-3 backdrop-blur-xl">
              <TrendingUp className="h-4 w-4 text-purple-200" />
              <p className="text-sm text-purple-100">
                This week: <span className="font-semibold">2,800+ new collaboration requests</span> and rising.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-cyan-200/30 bg-cyan-300/10 p-4 backdrop-blur-xl">
                <p className="text-[11px] uppercase tracking-[0.14em] text-cyan-100">Fast Launch</p>
                <p className="mt-1 text-2xl font-bold text-white">12 min</p>
                <p className="mt-1 text-xs text-slate-200">Average setup time for a 2026-ready profile.</p>
              </div>
              <div className="rounded-xl border border-fuchsia-200/30 bg-fuchsia-300/10 p-4 backdrop-blur-xl">
                <p className="text-[11px] uppercase tracking-[0.14em] text-fuchsia-100">Momentum</p>
                <p className="mt-1 text-2xl font-bold text-white">24/7</p>
                <p className="mt-1 text-xs text-slate-200">Live signal updates from Pulse and Discover streams.</p>
              </div>
              <div className="rounded-xl border border-emerald-200/30 bg-emerald-300/10 p-4 backdrop-blur-xl">
                <p className="text-[11px] uppercase tracking-[0.14em] text-emerald-100">Network Reach</p>
                <p className="mt-1 text-2xl font-bold text-white">Global</p>
                <p className="mt-1 text-xs text-slate-200">Venue, artist, and ops pipeline built for 2026 touring.</p>
              </div>
            </div>
          </div>
          
          {/* Right Side - Auth Forms */}
          <div className="w-full max-w-md mx-auto">
            <Card className="login-auth-shard bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl overflow-hidden" style={{ clipPath: "polygon(3% 0, 100% 1%, 97% 100%, 0 96%, 1% 18%)" }}>
              <CardHeader className="text-center pb-6">
                <div className="flex justify-center mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
                    <Sparkles className="h-6 w-6 text-white" />
                  </div>
                </div>
                <CardTitle className="text-2xl text-white font-bold">Welcome to the Future</CardTitle>
                <CardDescription className="text-gray-300">
                  Sign in to your account or create a new one
                </CardDescription>
                <p className="mt-2 text-[11px] uppercase tracking-[0.2em] text-cyan-100">
                  2026 Creator Access
                </p>
              </CardHeader>
              
              <CardContent>
                {/* Invitation Alert */}
                {inviteToken && (
                  <div className="mb-6 p-4 rounded-lg bg-purple-500/20 border border-purple-500/50 backdrop-blur-sm">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-5 w-5 text-purple-400" />
                      <div>
                        <p className="text-sm font-medium text-purple-200">
                          {inviteType === 'artist' ? 'Artist Booking Invitation' : 
                           inviteType === 'staff' ? 'Staff Position Invitation' : 'Invitation'}
                        </p>
                        {position && (
                          <p className="text-xs text-purple-300">
                            Position: {position}
                            {department && ` • ${department}`}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Success Message */}
                {success && (
                  <div className="mb-6 p-4 rounded-lg bg-green-500/20 border border-green-500/50 backdrop-blur-sm">
                    <div className="flex items-center text-green-200">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      <span className="text-sm font-medium">{success}</span>
                    </div>
                  </div>
                )}

                {/* Error Display */}
                {error && (
                  <AuthErrorDisplay
                    error={error}
                    onRetry={handleRetry}
                    onContactSupport={handleContactSupport}
                    className="mb-6"
                  />
                )}
                
                <Tabs defaultValue="signin" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 bg-white/10 backdrop-blur-sm">
                    <TabsTrigger value="signin" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white">Sign In</TabsTrigger>
                    <TabsTrigger value="signup" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white">Sign Up</TabsTrigger>
                  </TabsList>
                  
                  {/* Sign In Tab */}
                  <TabsContent value="signin" className="space-y-4 mt-6">
                    <form onSubmit={handleSignIn} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="signin-email" className="text-white font-medium">Email</Label>
                        <Input
                          id="signin-email"
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
                        <Label htmlFor="signin-password" className="text-white font-medium">Password</Label>
                        <div className="relative">
                          <Input
                            id="signin-password"
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
                        <Link href="/forgot-password">
                          Forgot your password?
                        </Link>
                      </Button>
                    </div>
                  </TabsContent>
                  
                  {/* Sign Up Tab */}
                  <TabsContent value="signup" className="space-y-4 mt-6">
                    <form onSubmit={handleSignUp} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="signup-name" className="text-white font-medium">Full Name</Label>
                          <Input
                            id="signup-name"
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
                          <Label htmlFor="signup-username" className="text-white font-medium">Username</Label>
                          <Input
                            id="signup-username"
                            type="text"
                            placeholder="johndoe"
                            value={signUpData.username}
                            onChange={(e) => setSignUpData({ ...signUpData, username: e.target.value })}
                            className="bg-white/10 border-white/20 text-white placeholder-gray-400 backdrop-blur-sm focus:border-purple-500 focus:ring-purple-500/50"
                            required
                            disabled={isSubmitting}
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="signup-email" className="text-white font-medium">Email</Label>
                        <Input
                          id="signup-email"
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
                        <Label htmlFor="signup-password" className="text-white font-medium">Password</Label>
                        <div className="relative">
                          <Input
                            id="signup-password"
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
                        <Label htmlFor="signup-confirm-password" className="text-white font-medium">Confirm Password</Label>
                        <div className="relative">
                          <Input
                            id="signup-confirm-password"
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
                        disabled={isSubmitting}
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
                    <div className="mt-3 rounded-lg border border-emerald-300/30 bg-emerald-300/10 px-3 py-2 text-center text-xs text-emerald-100">
                      Start free in 2026 and unlock live opportunity matching instantly.
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
            
            {/* Footer */}
            <div className="text-center mt-8 text-gray-400 text-sm">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <Shield className="h-4 w-4" />
                <span>Secured by enterprise-grade encryption</span>
              </div>
              <p>© 2026 Tourify. The future of music networking.</p>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes blob {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        .login-ticker-track {
          animation: login-ticker-scroll 26s linear infinite;
        }
        .login-auth-shard {
          box-shadow: 0 20px 70px rgba(139, 92, 246, 0.35);
        }
        .login-shard-drift-a {
          animation: shardDriftA 9s ease-in-out infinite;
        }
        .login-shard-drift-b {
          animation: shardDriftB 11s ease-in-out infinite;
        }
        .login-shard-drift-c {
          animation: shardDriftC 13s ease-in-out infinite;
        }
        .edge-login-ticker-forward {
          animation: edgeLoginForward 40s linear infinite;
        }
        .edge-login-ticker-reverse {
          animation: edgeLoginReverse 44s linear infinite;
        }
        .login-ticker-chip {
          animation: login-chip-pulse 1200ms ease-in-out infinite alternate;
        }
        @keyframes login-ticker-scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        @keyframes login-chip-pulse {
          0% {
            transform: translateY(0);
          }
          100% {
            transform: translateY(-2px);
          }
        }
        @keyframes edgeLoginForward {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        @keyframes edgeLoginReverse {
          0% {
            transform: translateX(-50%);
          }
          100% {
            transform: translateX(0);
          }
        }
        @keyframes shardDriftA {
          0%,
          100% {
            transform: rotate(-12deg) translateY(0px);
          }
          50% {
            transform: rotate(-10deg) translateY(-8px);
          }
        }
        @keyframes shardDriftB {
          0%,
          100% {
            transform: rotate(11deg) translateY(0px);
          }
          50% {
            transform: rotate(9deg) translateY(10px);
          }
        }
        @keyframes shardDriftC {
          0%,
          100% {
            transform: rotate(-8deg) translateY(0px);
          }
          50% {
            transform: rotate(-6deg) translateY(-6px);
          }
        }
      `}</style>
    </div>
  )
}

interface LoginNewsItem {
  id: string
  title: string
  sourceName: string
  topic: string
  url: string
  summary: string
}

interface LoginHubResponse {
  sections?: {
    pulse?: Array<{
      id: string
      title: string
      sourceName: string
      topics: string[]
      url?: string
      summary?: string
    }>
    discover?: Array<{
      id: string
      title: string
      description?: string
      venue_name?: string
      venue_city?: string
      venue_state?: string
      event_date?: string | null
    }>
  }
}

interface LoginDiscoverItem {
  id: string
  title: string
  summary: string
  venue: string
  eventDate: string | null
}

function decodeTextEntity(value: string): string {
  return value
    .replace(/&#8217;/g, "'")
    .replace(/&#8216;/g, "'")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&#8211;/g, '-')
    .replace(/&#8212;/g, '-')
    .replace(/&amp;/g, '&')
}

function normalizePostLoginRedirect(target: string): string {
  if (!target.startsWith('/')) return '/dashboard'
  if (target === '/' || target.startsWith('/login') || target.startsWith('/auth')) return '/dashboard'
  return target
}

const LOGIN_NEWS_CLIP_PATHS = [
  "polygon(0 4%, 95% 0, 100% 88%, 7% 100%)",
  "polygon(4% 0, 100% 8%, 92% 100%, 0 94%)",
  "polygon(0 0, 92% 5%, 100% 100%, 8% 92%)"
]

const LOGIN_DISCOVER_CLIP_PATHS = [
  "polygon(0 10%, 90% 0, 100% 85%, 12% 100%)",
  "polygon(0 0, 100% 12%, 90% 100%, 2% 88%)",
  "polygon(6% 2%, 100% 0, 96% 95%, 0 100%)",
  "polygon(0 4%, 95% 0, 100% 88%, 7% 100%)",
]

const FALLBACK_NEWS_HIGHLIGHTS: LoginNewsItem[] = [
  {
    id: "fallback-1",
    title: "Festival bookings surge as independent artists scale international tours",
    sourceName: "Pulse Wire",
    topic: "Touring",
    url: "/feed",
    summary: "Tour routing and fan demand are creating bigger opportunities for emerging acts."
  },
  {
    id: "fallback-2",
    title: "New venue partnerships open premium slots for rising talent",
    sourceName: "Venue Insider",
    topic: "Venues",
    url: "/feed",
    summary: "Regional venue networks are collaborating to prioritize trusted artist profiles."
  },
  {
    id: "fallback-3",
    title: "Fan engagement tech becomes a key driver for sponsorship deals",
    sourceName: "Creator Daily",
    topic: "Growth",
    url: "/feed",
    summary: "Data-rich fan communities are helping artists unlock better offers and visibility."
  }
]

const FALLBACK_DISCOVER_HIGHLIGHTS: LoginDiscoverItem[] = [
  {
    id: "discover-fallback-1",
    title: "Venue demand climbing for hybrid showcases this month",
    summary: "Promoters are prioritizing artists with strong fan engagement and fast response times.",
    venue: "Regional venue circuit",
    eventDate: new Date().toISOString(),
  },
  {
    id: "discover-fallback-2",
    title: "Independent collectives opening more support slots",
    summary: "Curated lineups are expanding in major and secondary markets for rising talent.",
    venue: "Tourify Discover",
    eventDate: new Date().toISOString(),
  },
  {
    id: "discover-fallback-3",
    title: "Local event collaborations gaining momentum",
    summary: "Cross-city partnerships are creating faster paths to booked dates and repeat shows.",
    venue: "Local Opportunity Radar",
    eventDate: new Date().toISOString(),
  },
  {
    id: "discover-fallback-4",
    title: "New artist-venue matching signals surfaced",
    summary: "Availability windows and audience fit are powering better booking outcomes.",
    venue: "Tourify Signals",
    eventDate: new Date().toISOString(),
  },
]

const SIGNUP_STATS = [
  { value: "50K+", label: "Verified music professionals" },
  { value: "12K+", label: "Active venue partnerships" },
  { value: "2.8K", label: "New weekly collaboration matches" }
]

async function reverseGeocode({
  latitude,
  longitude,
}: {
  latitude: number
  longitude: number
}) {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`,
      {
        headers: {
          "Accept-Language": "en",
        },
      }
    )

    if (!response.ok) throw new Error("Reverse geocode failed")

    const data = await response.json()
    const address = data?.address || {}
    const city = address.city || address.town || address.village || address.hamlet || address.county || ""
    const state = address.state || address.region || ""

    if (city && state) return `${city}, ${state}`
    if (city) return String(city)
    if (state) return String(state)
  } catch (error) {
    console.warn("Reverse geocode fallback to coordinates:", error)
  }

  return `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`
}