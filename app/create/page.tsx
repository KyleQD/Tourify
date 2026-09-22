"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { useMultiAccount } from "@/hooks/use-multi-account"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { 
  Music, 
  Building, 
  Users, 
  Plus, 
  CheckCircle, 
  ArrowRight, 
  Star,
  Loader2,
  AlertCircle,
  Sparkles,
  Mic,
  Calendar,
  MapPin,
  User,
  Zap,
  Crown,
  Briefcase,
  ExternalLink,
  Eye,
  Globe,
  Image as ImageIcon,
  X
} from "lucide-react"
import Link from "next/link"
import { isOrganizationType } from "@/lib/accounts/account-types"
import { getArtistPublicProfilePath, getOrganizationPublicProfilePath } from "@/lib/utils/public-profile-routes"
import { buildAccountScopedPath } from "@/lib/navigation/account-context-url"
import { slugifyOrganizationName, normalizeOrganizationSubtype } from "@/lib/organizations/org-subtypes"
import { Progress } from "@/components/ui/progress"
import { Switch } from "@/components/ui/switch"
import { normalizeAccountSlug } from "@/lib/accounts/account-slug"

interface CreateOption {
  id: string
  title: string
  description: string
  icon: any
  gradient: string
  features: string[]
}

interface QueuedBandMember {
  artistProfileId: string
  displayName: string
  username: string | null
  role: string
}

interface QueuedBandManager {
  email: string
  role: 'tour_manager' | 'admin' | 'production'
}

const createOptions: CreateOption[] = [
  {
    id: 'artist-account',
    title: 'Artist Account',
    description: 'Perfect for musicians, performers, and content creators',
    icon: Music,
    gradient: 'from-purple-500 via-pink-500 to-red-500',
    features: [
      'Professional EPK Builder',
      'Fan Engagement Tools',
      'Booking Management',
      'Analytics Dashboard',
      'Social Media Integration'
    ]
  },
  {
    id: 'venue-account',
    title: 'Venue Account',
    description: 'Ideal for venues, event spaces, and promoters',
    icon: Building,
    gradient: 'from-blue-500 via-cyan-500 to-teal-500',
    features: [
      'Event Management System',
      'Artist Discovery',
      'Booking Calendar',
      'Revenue Tracking',
      'Marketing Tools'
    ]
  },
  {
    id: 'organizer-account',
    title: 'Organization Account',
    description: 'For labels, promoters, agencies, production companies, and festival teams',
    icon: Crown,
    gradient: 'from-amber-500 via-orange-500 to-red-500',
    features: [
      'Advanced Event Management',
      'Tour Planning & Logistics',
      'Artist & Venue Coordination',
      'Revenue & Analytics Dashboard',
      'Multi-event Campaign Tools'
    ]
  }
]

const AUTH_SLOW_HINT_MS = 8_000
const ACCOUNT_CREATION_DRAFT_KEY = "tourify.account-creation-draft.v1"
const ACCOUNT_CREATION_DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000
const bandPanelClass = "rounded-lg border border-slate-700/50 bg-slate-950/60 shadow-xl shadow-black/25 backdrop-blur"
const bandInsetClass = "rounded-md border border-slate-800/80 bg-slate-950/55"
const bandIconClass = "flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/[0.06]"

export default function CreatePage() {
  const { user, loading, authError, retrySessionCheck } = useAuth()
  const [showSlowAuthHint, setShowSlowAuthHint] = useState(false)
  const {
    accounts,
    hasAccountType,
    createArtistAccount,
    createVenueAccount,
    createOrganizerAccount,
    activateAccountAfterCreate,
    isLoading,
  } = useMultiAccount()
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [orgSuccessPaths, setOrgSuccessPaths] = useState<{ publicPath: string | null; adminPath: string } | null>(null)
  const [bandWizardStep, setBandWizardStep] = useState(0)
  const [bandPublicVisible, setBandPublicVisible] = useState(true)
  const [bandArtistQuery, setBandArtistQuery] = useState('')
  const [bandArtistHits, setBandArtistHits] = useState<any[]>([])
  const [selectedBandArtist, setSelectedBandArtist] = useState<any | null>(null)
  const [bandArtistRole, setBandArtistRole] = useState('member')
  const [isSearchingBandArtist, setIsSearchingBandArtist] = useState(false)
  const [queuedBandMembers, setQueuedBandMembers] = useState<QueuedBandMember[]>([])
  const [bandManagerEmail, setBandManagerEmail] = useState('')
  const [bandManagerRole, setBandManagerRole] = useState<QueuedBandManager['role']>('tour_manager')
  const [queuedBandManagers, setQueuedBandManagers] = useState<QueuedBandManager[]>([])
  const draftRestoredRef = useRef(false)
  const [draftSavedAt, setDraftSavedAt] = useState<Date | null>(null)
  const [slugCheck, setSlugCheck] = useState<{
    slug: string
    available: boolean | null
    checking: boolean
    message: string
  }>({ slug: "", available: null, checking: false, message: "" })
  
  // Form data
  const [artistData, setArtistData] = useState({
    artist_name: '',
    bio: '',
    genres: [] as string[],
    social_links: {
      instagram: '',
      spotify: '',
      youtube: '',
      soundcloud: ''
    }
  })
  
  const [venueData, setVenueData] = useState({
    venue_name: '',
    description: '',
    address: '',
    capacity: '',
    venue_types: [] as string[],
    contact_info: {
      phone: '',
      email: '',
      website: ''
    },
    social_links: {
      instagram: '',
      facebook: '',
      website: ''
    }
  })

  const [organizerData, setOrganizerData] = useState({
    organization_name: '',
    description: '',
    organization_type: '',
    url_slug: '',
    contact_info: {
      phone: '',
      email: '',
      website: ''
    },
    social_links: {
      instagram: '',
      linkedin: '',
      website: ''
    },
    specialties: [] as string[]
  })

  const isBandWizard = selectedOption === 'organizer-account' && organizerData.organization_type === 'band'
  const bandNameForSlug = organizerData.organization_name.trim()
  const bandSlug = organizerData.url_slug.trim() || (bandNameForSlug ? slugifyOrganizationName(bandNameForSlug) : '')
  const bandPublicPath = bandSlug ? getArtistPublicProfilePath(bandSlug) : null
  const bandPublicDisplayPath = bandPublicPath || '/artist/your-band'
  const bandWizardSteps = [
    'Identity',
    'Public page',
    'Members',
    'Managers',
    'Launch',
  ]
  const bandLaunchItems = [
    { label: 'Band identity', done: Boolean(organizerData.organization_name.trim()), optional: false },
    { label: 'Artist-style URL', done: Boolean(bandSlug), optional: false },
    { label: 'Public visibility', done: bandPublicVisible, optional: false },
    { label: `${queuedBandMembers.length} member invite${queuedBandMembers.length === 1 ? '' : 's'} queued`, done: queuedBandMembers.length > 0, optional: true },
    { label: `${queuedBandManagers.length} manager invite${queuedBandManagers.length === 1 ? '' : 's'} queued`, done: queuedBandManagers.length > 0, optional: true },
  ]
  const bandRequiredReady = bandLaunchItems.filter(item => !item.optional).every(item => item.done)
  const bandReadiness = Math.round(
    (bandLaunchItems.filter(item => item.done || item.optional).length / bandLaunchItems.length) * 100
  )

  useEffect(() => {
    if (loading || !user || draftRestoredRef.current) return
    draftRestoredRef.current = true
    try {
      const raw = localStorage.getItem(ACCOUNT_CREATION_DRAFT_KEY)
      if (!raw) return
      const draft = JSON.parse(raw) as {
        savedAt?: number
        selectedOption?: string | null
        artist?: Partial<typeof artistData>
        venue?: Partial<typeof venueData>
        organizer?: Partial<typeof organizerData>
        bandWizardStep?: number
        bandPublicVisible?: boolean
      }
      if (!draft.savedAt || Date.now() - draft.savedAt > ACCOUNT_CREATION_DRAFT_TTL_MS) {
        localStorage.removeItem(ACCOUNT_CREATION_DRAFT_KEY)
        return
      }
      if (!searchParams.get("type") && draft.selectedOption) {
        setSelectedOption(draft.selectedOption)
      }
      if (draft.artist) setArtistData((current) => ({ ...current, ...draft.artist }))
      if (draft.venue) setVenueData((current) => ({ ...current, ...draft.venue }))
      if (draft.organizer) {
        setOrganizerData((current) => ({ ...current, ...draft.organizer }))
      }
      if (typeof draft.bandWizardStep === "number") {
        setBandWizardStep(Math.max(0, Math.min(4, draft.bandWizardStep)))
      }
      if (typeof draft.bandPublicVisible === "boolean") {
        setBandPublicVisible(draft.bandPublicVisible)
      }
      setDraftSavedAt(new Date(draft.savedAt))
    } catch {
      localStorage.removeItem(ACCOUNT_CREATION_DRAFT_KEY)
    }
  }, [loading, searchParams, user])

  useEffect(() => {
    if (!draftRestoredRef.current || !selectedOption || isSubmitting) return
    const timeoutId = window.setTimeout(() => {
      const savedAt = Date.now()
      localStorage.setItem(
        ACCOUNT_CREATION_DRAFT_KEY,
        JSON.stringify({
          savedAt,
          selectedOption,
          artist: {
            artist_name: artistData.artist_name,
            bio: artistData.bio,
            genres: artistData.genres,
          },
          venue: {
            venue_name: venueData.venue_name,
            description: venueData.description,
            capacity: venueData.capacity,
            venue_types: venueData.venue_types,
          },
          organizer: {
            organization_name: organizerData.organization_name,
            description: organizerData.description,
            organization_type: organizerData.organization_type,
            url_slug: organizerData.url_slug,
            specialties: organizerData.specialties,
          },
          bandWizardStep,
          bandPublicVisible,
        }),
      )
      setDraftSavedAt(new Date(savedAt))
    }, 400)
    return () => window.clearTimeout(timeoutId)
  }, [
    artistData.artist_name,
    artistData.bio,
    artistData.genres,
    bandPublicVisible,
    bandWizardStep,
    isSubmitting,
    organizerData.description,
    organizerData.organization_name,
    organizerData.organization_type,
    organizerData.specialties,
    organizerData.url_slug,
    selectedOption,
    venueData.capacity,
    venueData.description,
    venueData.venue_name,
    venueData.venue_types,
  ])

  useEffect(() => {
    if (selectedOption !== "organizer-account") return
    const candidate = normalizeAccountSlug(
      organizerData.url_slug || organizerData.organization_name,
    )
    if (!candidate) {
      setSlugCheck({ slug: "", available: null, checking: false, message: "" })
      return
    }
    let cancelled = false
    const timeoutId = window.setTimeout(async () => {
      setSlugCheck({
        slug: candidate,
        available: null,
        checking: true,
        message: "Checking URL availability…",
      })
      try {
        const response = await fetch(
          `/api/accounts/check-slug?slug=${encodeURIComponent(candidate)}`,
          { credentials: "include", cache: "no-store" },
        )
        const body = (await response.json().catch(() => null)) as
          | { available?: boolean; slug?: string; message?: string; error?: string }
          | null
        if (cancelled) return
        setSlugCheck({
          slug: body?.slug || candidate,
          available: response.ok ? Boolean(body?.available) : null,
          checking: false,
          message: body?.message || body?.error || "URL availability could not be checked.",
        })
      } catch {
        if (cancelled) return
        setSlugCheck({
          slug: candidate,
          available: null,
          checking: false,
          message: "URL availability could not be checked.",
        })
      }
    }, 350)
    return () => {
      cancelled = true
      window.clearTimeout(timeoutId)
    }
  }, [
    organizerData.organization_name,
    organizerData.url_slug,
    selectedOption,
  ])

  useEffect(() => {
    if (!loading && !user && !authError) {
      router.push('/')
      return
    }
    
    // Check for account type in URL query params
    const accountType = searchParams.get('type')
    if (accountType && !selectedOption) {
      switch (accountType) {
        case 'artist':
          setSelectedOption('artist-account')
          break
        case 'venue':
          setSelectedOption('venue-account')
          break
        case 'admin':
        case 'organization':
        case 'organizer':
          setSelectedOption('organizer-account')
          break
      }
    }
  }, [user, loading, authError, router, searchParams, selectedOption])

  useEffect(() => {
    if (!loading) {
      setShowSlowAuthHint(false)
      return
    }
    const t = window.setTimeout(() => setShowSlowAuthHint(true), AUTH_SLOW_HINT_MS)
    return () => window.clearTimeout(t)
  }, [loading])

  const isAccountAlreadyCreated = (optionId: string): boolean => {
    // Remove limitations - users can create unlimited accounts of any type
    return false
  }

  const renderCreateOption = (option: CreateOption) => {
    const isCreated = isAccountAlreadyCreated(option.id)
    
    return (
      <Card 
        key={option.id} 
        className={`group cursor-pointer transition-all duration-300 hover:scale-105 border border-white/20 backdrop-blur-xl ${
          selectedOption === option.id 
            ? 'bg-white/20 border-white/40 shadow-2xl' 
            : 'bg-white/10 hover:bg-white/15'
        }`}
        onClick={() => setSelectedOption(option.id)}
      >
        <CardHeader className="text-center pb-4">
          <div className="relative mx-auto mb-4">
            <div className={`w-20 h-20 bg-gradient-to-br ${option.gradient} rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-2xl`}>
              <option.icon className="h-10 w-10 text-white" />
            </div>
            <div className={`absolute -inset-2 bg-gradient-to-br ${option.gradient} rounded-2xl blur opacity-30 group-hover:opacity-50 transition-opacity`}></div>
          </div>
          
          <CardTitle className="text-2xl text-white mb-2">
            {option.title}
          </CardTitle>
          <CardDescription className="text-gray-300 text-base leading-relaxed">
            {option.description}
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-3">
            <h4 className="font-semibold text-white flex items-center gap-2">
              <Star className="h-4 w-4 text-yellow-400" />
              Key Features
            </h4>
            <ul className="space-y-2">
              {option.features.map((feature, index) => (
                <li key={index} className="flex items-center text-sm text-gray-300">
                  <div className="w-2 h-2 bg-gradient-to-r from-purple-400 to-blue-400 rounded-full mr-3"></div>
                  {feature}
                </li>
              ))}
            </ul>
          </div>
          
          <Button
            className={`w-full mt-6 bg-gradient-to-r ${option.gradient} hover:shadow-lg transition-all duration-300 text-white font-semibold`}
            onClick={(e) => {
              e.stopPropagation()
              setSelectedOption(option.id)
            }}
          >
            Get Started
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    )
  }

  const startBandWizard = () => {
    setOrganizerData(prev => ({ ...prev, organization_type: 'band' }))
    setSelectedOption('organizer-account')
    setBandWizardStep(0)
    setError(null)
    setSuccess(null)
  }

  async function searchBandArtists(query: string) {
    setBandArtistQuery(query)
    setSelectedBandArtist(null)
    if (query.trim().length < 2) {
      setBandArtistHits([])
      return
    }
    setIsSearchingBandArtist(true)
    try {
      const res = await fetch(
        `/api/search/enhanced?q=${encodeURIComponent(query.trim())}&type=artists&limit=8`,
        { credentials: 'include' }
      )
      if (!res.ok) return
      const data = await res.json()
      setBandArtistHits(
        Array.isArray(data.results)
          ? data.results.filter((row: any) => row.type === 'artist' && row.artistProfileId)
          : []
      )
    } finally {
      setIsSearchingBandArtist(false)
    }
  }

  function addQueuedBandMember() {
    if (!selectedBandArtist?.artistProfileId) return
    const artistProfileId = String(selectedBandArtist.artistProfileId)
    setQueuedBandMembers(prev => {
      if (prev.some(member => member.artistProfileId === artistProfileId)) return prev
      return [
        ...prev,
        {
          artistProfileId,
          displayName: String(selectedBandArtist.displayName || selectedBandArtist.username || 'Artist'),
          username: selectedBandArtist.username ? String(selectedBandArtist.username) : null,
          role: bandArtistRole.trim() || 'member',
        },
      ]
    })
    setSelectedBandArtist(null)
    setBandArtistQuery('')
    setBandArtistHits([])
    setBandArtistRole('member')
  }

  function addQueuedBandManager() {
    const email = bandManagerEmail.trim()
    if (!email) return
    setQueuedBandManagers(prev => {
      if (prev.some(manager => manager.email.toLowerCase() === email.toLowerCase())) return prev
      return [...prev, { email, role: bandManagerRole }]
    })
    setBandManagerEmail('')
    setBandManagerRole('tour_manager')
  }

  async function sendQueuedBandInvites(organizerAccountId: string) {
    const memberResults = await Promise.allSettled(
      queuedBandMembers.map(async member => {
        const res = await fetch('/api/organization/artist-members', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'x-acting-profile-id': organizerAccountId,
            'x-acting-account-type': 'organization',
          },
          body: JSON.stringify({
            organizerAccountId,
            artistProfileId: member.artistProfileId,
            role: member.role,
          }),
        })
        if (!res.ok) throw new Error(`Failed to invite ${member.displayName}`)
        return res
      })
    )
    const managerResults = await Promise.allSettled(
      queuedBandManagers.map(async manager => {
        const res = await fetch('/api/organization/tour-managers', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            organizerAccountId,
            email: manager.email,
            role: manager.role,
          }),
        })
        if (!res.ok) throw new Error(`Failed to invite ${manager.email}`)
        return res
      })
    )
    const failedInvites = [...memberResults, ...managerResults].filter(result => result.status === 'rejected')
    if (failedInvites.length) {
      console.warn('[Create Band] Some queued invites failed', failedInvites)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setOrgSuccessPaths(null)
    setIsSubmitting(true)

    try {
      if (selectedOption === 'artist-account') {
        await createArtistAccount(artistData)
        setSuccess('Artist account created successfully! 🎵')
      } else if (selectedOption === 'venue-account') {
        await createVenueAccount({
          ...venueData,
          capacity: venueData.capacity ? parseInt(venueData.capacity) : undefined
        })
        setSuccess('Venue account created successfully! 🏢')
      } else if (selectedOption === 'organizer-account') {
        const slug = normalizeAccountSlug(
          organizerData.url_slug || organizerData.organization_name,
        )
        if (slugCheck.checking) {
          throw new Error("Wait for the public URL check to finish.")
        }
        if (slugCheck.slug !== slug || slugCheck.available !== true) {
          throw new Error(slugCheck.message || "Choose an available public URL.")
        }
        const subtype = normalizeOrganizationSubtype(organizerData.organization_type)
        const organizerId = await createOrganizerAccount({
          ...organizerData,
          url_slug: slug,
          subtype,
          is_public: subtype === 'band' ? bandPublicVisible : true,
        })
        if (subtype === 'band') {
          await sendQueuedBandInvites(organizerId)
        }
        const adminBasePath = subtype === 'band'
          ? '/admin/dashboard/organization?onboarding=band-created'
          : '/admin/dashboard'
        const adminPath = buildAccountScopedPath(adminBasePath, organizerId, 'organization')
        const publicPath =
          subtype === 'band'
            ? getArtistPublicProfilePath(slug)
            : getOrganizationPublicProfilePath(slug)
        setOrgSuccessPaths({
          publicPath,
          adminPath,
        })
        setSuccess(
          subtype === 'band'
            ? 'Band account created. Invite members to your roster or open the public page from the links below.'
            : 'Organization account created. Open your public page or Admin Work Mode from the links below.'
        )
        if (subtype === 'band') {
          const activated = await activateAccountAfterCreate(organizerId, 'organization')
          if (!activated) {
            throw new Error('Band account was created, but could not be opened automatically. Refresh and select it from the account switcher.')
          }
          router.push(adminPath)
          return
        }
      }
      
      // Give a moment for the accounts to refresh before showing success
      await new Promise(resolve => setTimeout(resolve, 100))
      localStorage.removeItem(ACCOUNT_CREATION_DRAFT_KEY)
      setDraftSavedAt(null)
      
      // Reset form
      setSelectedOption(null)
      setArtistData({
        artist_name: '',
        bio: '',
        genres: [],
        social_links: { instagram: '', spotify: '', youtube: '', soundcloud: '' }
      })
      setVenueData({
        venue_name: '',
        description: '',
        address: '',
        capacity: '',
        venue_types: [],
        contact_info: { phone: '', email: '', website: '' },
        social_links: { instagram: '', facebook: '', website: '' }
      })
      setOrganizerData({
        organization_name: '',
        description: '',
        organization_type: '',
        url_slug: '',
        contact_info: { phone: '', email: '', website: '' },
        social_links: { instagram: '', linkedin: '', website: '' },
        specialties: []
      })
      setBandWizardStep(0)
      setBandPublicVisible(true)
      setBandArtistQuery('')
      setBandArtistHits([])
      setSelectedBandArtist(null)
      setBandArtistRole('member')
      setQueuedBandMembers([])
      setBandManagerEmail('')
      setBandManagerRole('tour_manager')
      setQueuedBandManagers([])
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create account')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center px-4">
        <div className="text-center text-white max-w-md">
          <div className="relative mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-500 rounded-2xl flex items-center justify-center mx-auto animate-pulse">
              <Plus className="h-8 w-8 text-white" />
            </div>
            <div className="absolute -inset-2 bg-gradient-to-br from-purple-500 to-blue-500 rounded-2xl blur opacity-20 animate-ping"></div>
          </div>
          <h2 className="text-2xl font-bold mb-2">Loading Creator Studio</h2>
          <p className="text-gray-400">Preparing account creation tools...</p>
          {showSlowAuthHint && (
            <p className="text-sm text-amber-200/90 mt-4">
              Still connecting to authentication… If this does not clear, check your network or try again after it finishes.
            </p>
          )}
        </div>
      </div>
    )
  }

  if (!user) {
    if (authError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center px-4">
          <div className="max-w-lg w-full">
            <Alert className="bg-red-500/15 border-red-500/40">
              <AlertCircle className="h-5 w-5 text-red-300" />
              <AlertDescription className="text-red-100">
                <p className="font-medium mb-2">Could not verify your session</p>
                <p className="text-sm opacity-90 mb-4">{authError}</p>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="secondary" onClick={() => void retrySessionCheck()}>
                    Try again
                  </Button>
                  <Button type="button" variant="outline" onClick={() => window.location.reload()}>
                    Reload page
                  </Button>
                  <Button type="button" variant="ghost" className="text-white" onClick={() => router.push('/login')}>
                    Go to login
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      {/* Animated Background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] bg-center bg-repeat opacity-5"></div>
        <div className="absolute top-0 left-0 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-0 left-1/2 w-96 h-96 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-4000"></div>
      </div>

      {/* Content */}
      <div className="relative">
        {/* Header */}
        <div className="border-b border-white/10 bg-white/5 backdrop-blur-xl">
          <div className="container mx-auto px-6 py-8">
            <div className="text-center">
              <div className="flex justify-center mb-6">
                <div className="relative">
                  <div className="w-20 h-20 bg-gradient-to-br from-purple-500 via-pink-500 to-blue-500 rounded-3xl flex items-center justify-center shadow-2xl">
                    <Plus className="h-10 w-10 text-white" />
                  </div>
                  <div className="absolute -inset-2 bg-gradient-to-br from-purple-500 via-pink-500 to-blue-500 rounded-3xl blur opacity-30 animate-pulse"></div>
                </div>
              </div>
              
              <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-white via-purple-200 to-blue-200 bg-clip-text text-transparent">
                Expand Your Presence
              </h1>
              <p className="text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed">
                Create unlimited specialized accounts to reach different audiences and unlock powerful tools for your creative journey. No limits on how many accounts you can create under one email.
              </p>
              {draftSavedAt ? (
                <p className="mt-3 text-sm text-emerald-200" role="status">
                  Draft saved locally at{" "}
                  {new Intl.DateTimeFormat(undefined, {
                    hour: "numeric",
                    minute: "2-digit",
                  }).format(draftSavedAt)}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="container mx-auto px-6 py-12">
          {/* Alerts */}
          {error && (
            <Alert className="mb-8 bg-red-500/20 border-red-500/50 backdrop-blur-sm">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <AlertDescription className="text-red-200">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="mb-8 bg-green-500/20 border-green-500/50 backdrop-blur-sm">
              <CheckCircle className="h-5 w-5 text-green-400" />
              <AlertDescription className="text-green-200 space-y-3">
                <p>{success}</p>
                {orgSuccessPaths && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {orgSuccessPaths.publicPath && (
                      <Button asChild size="sm" variant="secondary" className="bg-white/10 text-white hover:bg-white/20">
                        <Link href={orgSuccessPaths.publicPath}>
                          View public page
                          <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                        </Link>
                      </Button>
                    )}
                    <Button asChild size="sm" className="bg-amber-500/90 text-white hover:bg-amber-500">
                      <Link href={orgSuccessPaths.adminPath}>Open Admin dashboard</Link>
                    </Button>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          {authError && (
            <Alert className="mb-8 bg-amber-500/15 border-amber-500/40 backdrop-blur-sm">
              <AlertCircle className="h-5 w-5 text-amber-300" />
              <AlertDescription className="text-amber-100">
                <span className="block mb-2">{authError}</span>
                <Button type="button" size="sm" variant="secondary" onClick={() => void retrySessionCheck()}>
                  Retry session check
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Existing Accounts */}
          {accounts.length > 0 && (
            <Card className="mb-12 bg-white/10 backdrop-blur-xl border border-white/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <User className="h-6 w-6 text-purple-400" />
                  Your Accounts
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Manage your existing accounts and switch between them. You can create unlimited accounts of any type under your email.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {accounts.map((account, index) => {
                    const getAccountGradient = (accountType: string, index: number) => {
                      const gradients = {
                        artist: [
                          'from-purple-500 to-pink-500',
                          'from-violet-500 to-purple-500', 
                          'from-fuchsia-500 to-purple-500'
                        ],
                        venue: [
                          'from-blue-500 to-cyan-500',
                          'from-indigo-500 to-blue-500',
                          'from-cyan-500 to-teal-500'
                        ],
                        organization: [
                          'from-amber-500 to-orange-500',
                          'from-orange-500 to-red-500',
                          'from-yellow-500 to-amber-500'
                        ],
                        admin: [
                          'from-amber-500 to-orange-500',
                          'from-orange-500 to-red-500',
                          'from-yellow-500 to-amber-500'
                        ],
                        general: ['from-gray-500 to-slate-500']
                      }
                      const typeKey = isOrganizationType(accountType) ? 'organization' : accountType
                      const typeGradients = gradients[typeKey as keyof typeof gradients] || gradients.general
                      return typeGradients[index % typeGradients.length]
                    }

                    const accountTypeCount = accounts.filter(acc => acc.account_type === account.account_type).length
                    const typeIndex = accounts.filter(acc => 
                      acc.account_type === account.account_type && 
                      accounts.indexOf(acc) <= index
                    ).length

                    return (
                      <div key={`${account.account_type}-${account.profile_id}`} className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                        <div className="flex items-center gap-3 mb-3">
                          <div className={`w-10 h-10 bg-gradient-to-br ${getAccountGradient(account.account_type, index)} rounded-lg flex items-center justify-center`}>
                            {account.account_type === 'artist' && <Music className="h-5 w-5 text-white" />}
                            {account.account_type === 'venue' && <Building className="h-5 w-5 text-white" />}
                            {isOrganizationType(account.account_type) && <Crown className="h-5 w-5 text-white" />}
                            {account.account_type === 'general' && <User className="h-5 w-5 text-white" />}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-white text-sm leading-tight">
                              {account.profile_data?.artist_name || 
                               account.profile_data?.venue_name || 
                               account.profile_data?.organization_name ||
                               'General Account'}
                            </h4>
                            <div className="flex items-center gap-2 mt-1">
                              <p className="text-xs text-gray-400 capitalize">
                                {isOrganizationType(account.account_type) ? 'Organization' : account.account_type}
                              </p>
                              {accountTypeCount > 1 && (
                                <Badge variant="outline" className="text-xs px-1.5 py-0 bg-white/10 border-white/20 text-gray-300">
                                  #{typeIndex}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {/* Additional context for different account types */}
                        {account.account_type === 'artist' && account.profile_data?.bio && (
                          <p className="text-xs text-gray-400 mb-2 line-clamp-2">
                            {account.profile_data.bio.substring(0, 80)}...
                          </p>
                        )}
                        {account.account_type === 'venue' && account.profile_data?.address && (
                          <p className="text-xs text-gray-400 mb-2 flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {account.profile_data.address}
                          </p>
                        )}
                        {isOrganizationType(account.account_type) && (account.profile_data?.subtype || account.profile_data?.organization_type) && (
                          <p className="text-xs text-gray-400 mb-2 capitalize">
                            {String(account.profile_data?.subtype || account.profile_data?.organization_type).replace(/_/g, ' ')}
                          </p>
                        )}
                        
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Active
                        </Badge>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {!selectedOption ? (
            /* Account Type Selection */
            <div>
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-white mb-4">Choose Your Account Type</h2>
                <p className="text-gray-400 max-w-2xl mx-auto">
                  Select the type of account that best fits your role in the music industry. 
                  You can create multiple accounts of the same type - each account type comes with specialized tools and features.
                </p>
              </div>

              <Card
                className="mb-8 border border-amber-400/30 bg-amber-500/10 backdrop-blur-xl transition-all hover:bg-amber-500/15 max-w-6xl mx-auto"
                onClick={startBandWizard}
              >
                <CardContent className="flex flex-col gap-5 p-6 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-start gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600">
                      <Users className="h-7 w-7 text-white" />
                    </div>
                    <div>
                      <Badge className="mb-2 bg-amber-500/20 text-amber-200 border-amber-500/30">
                        Guided setup
                      </Badge>
                      <h3 className="text-2xl font-semibold text-white">Band / Group</h3>
                      <p className="mt-1 max-w-2xl text-sm text-amber-50/75">
                        Create an artist-style band page, invite members to the public roster, and add managers who can help run the band.
                      </p>
                    </div>
                  </div>
                  <Button type="button" onClick={startBandWizard} className="bg-amber-500 text-white hover:bg-amber-600">
                    Start band setup
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
                {createOptions.map(renderCreateOption)}
              </div>

              <div className="text-center mt-12">
                <Button 
                  variant="outline" 
                  className="border-white/20 text-gray-300 hover:bg-white/10"
                  onClick={() => router.push('/dashboard')}
                >
                  Back to Dashboard
                </Button>
              </div>
            </div>
          ) : (
            /* Account Creation Form */
            <div className={isBandWizard ? "mx-auto max-w-6xl" : "mx-auto max-w-2xl"}>
              <div className="text-center mb-8">
                <Button 
                  variant="ghost" 
                  className="text-gray-400 hover:text-white mb-4"
                  onClick={() => setSelectedOption(null)}
                >
                  ← Back to Selection
                </Button>
                
                <h2 className="text-3xl font-bold text-white mb-2">
                  {selectedOption === 'artist-account' ? 'Create Artist Account' : 
                   selectedOption === 'venue-account' ? 'Create Venue Account' : 
                   isBandWizard ? 'Create Band / Group' : 'Create Organization Account'}
                </h2>
                <p className="text-gray-400">
                  Fill out the information below to set up your {
                    selectedOption === 'artist-account' ? 'artist' : 
                    selectedOption === 'venue-account' ? 'venue' : 
                    isBandWizard ? 'band' : selectedOption === 'organizer-account' ? 'organization' : 'organization'
                  } account
                </p>
              </div>

              <Card className={isBandWizard ? "rounded-lg border border-slate-700/50 bg-slate-950/70 shadow-2xl shadow-cyan-950/20 backdrop-blur" : "bg-white/10 backdrop-blur-xl border border-white/20"}>
                <CardContent className={isBandWizard ? "p-4 sm:p-6" : "p-8"}>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {isBandWizard ? (
                      <>
                        <div className="space-y-4">
                          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                            <div className="flex items-start gap-3 text-left">
                              <div className={`${bandIconClass} border-cyan-300/20 bg-cyan-300/10 text-cyan-200`}>
                                <Sparkles className="h-4 w-4" />
                              </div>
                              <div>
                                <p className="text-xs font-medium uppercase tracking-[0.18em] text-cyan-200/70">Band Command Setup</p>
                                <h3 className="mt-1 text-xl font-semibold text-white">{bandWizardSteps[bandWizardStep]}</h3>
                                <p className="mt-1 text-sm text-slate-400">
                                  Build the public band page, roster, and management access in one guided pass.
                                </p>
                              </div>
                            </div>
                            <Badge className="w-fit border-white/15 bg-white/10 text-white">
                              Step {bandWizardStep + 1} of {bandWizardSteps.length}
                            </Badge>
                          </div>
                          <Progress value={((bandWizardStep + 1) / bandWizardSteps.length) * 100} className="h-1.5 bg-slate-800" />
                          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                            {bandWizardSteps.map((step, index) => (
                              <button
                                key={step}
                                type="button"
                                onClick={() => setBandWizardStep(index)}
                                className={`min-w-0 rounded-md border px-2 py-2 text-left text-xs transition ${
                                  index === bandWizardStep
                                    ? 'border-cyan-300/40 bg-cyan-300/10 text-cyan-100 shadow-lg shadow-cyan-950/20'
                                    : index < bandWizardStep
                                      ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-100'
                                      : 'border-white/10 bg-white/[0.04] text-slate-400 hover:bg-white/[0.07]'
                                }`}
                              >
                                <span className="mb-1 block font-mono text-[10px] text-white/45">0{index + 1}</span>
                                <span className="block truncate">{step}</span>
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
                          <div className="min-w-0 space-y-5">
                        {bandWizardStep === 0 ? (
                          <div className="space-y-5">
                            <div className="space-y-2">
                              <Label htmlFor="band_name" className="text-white font-medium">Band / Group Name *</Label>
                              <Input
                                id="band_name"
                                value={organizerData.organization_name}
                                onChange={(e) => setOrganizerData({
                                  ...organizerData,
                                  organization_name: e.target.value,
                                  organization_type: 'band',
                                })}
                                className="border-white/10 bg-slate-950/70 text-white placeholder-gray-500 focus:border-cyan-400/60"
                                placeholder="Your band or group name"
                                required
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="band_slug" className="text-white font-medium">Public artist URL</Label>
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-400 shrink-0">/artist/</span>
                                <Input
                                  id="band_slug"
                                  value={organizerData.url_slug}
                                  onChange={(e) =>
                                    setOrganizerData({
                                      ...organizerData,
                                      url_slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 40),
                                      organization_type: 'band',
                                    })
                                  }
                                  className="border-white/10 bg-slate-950/70 text-white placeholder-gray-500 focus:border-cyan-400/60"
                                  placeholder={organizerData.organization_name ? slugifyOrganizationName(organizerData.organization_name) : 'your-band'}
                                />
                              </div>
                              <p className="text-xs text-gray-400">{bandPublicDisplayPath}</p>
                              {slugCheck.message ? (
                                <p
                                  className={`text-xs ${
                                    slugCheck.available === true
                                      ? "text-emerald-300"
                                      : slugCheck.available === false
                                        ? "text-rose-300"
                                        : "text-amber-300"
                                  }`}
                                  role="status"
                                >
                                  {slugCheck.message}
                                </p>
                              ) : null}
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="band_description" className="text-white font-medium">Short bio</Label>
                              <Textarea
                                id="band_description"
                                value={organizerData.description}
                                onChange={(e) => setOrganizerData({ ...organizerData, description: e.target.value, organization_type: 'band' })}
                                className="min-h-[110px] border-white/10 bg-slate-950/70 text-white placeholder-gray-500 focus:border-cyan-400/60"
                                placeholder="Tell fans and collaborators what this band is about..."
                              />
                            </div>
                            <div className="grid gap-4 md:grid-cols-2">
                              <div className="space-y-2">
                                <Label htmlFor="band_website" className="text-white font-medium">Website</Label>
                                <Input
                                  id="band_website"
                                  value={organizerData.contact_info.website}
                                  onChange={(e) => setOrganizerData({
                                    ...organizerData,
                                    organization_type: 'band',
                                    contact_info: { ...organizerData.contact_info, website: e.target.value },
                                    social_links: { ...organizerData.social_links, website: e.target.value },
                                  })}
                                  className="border-white/10 bg-slate-950/70 text-white placeholder-gray-500 focus:border-cyan-400/60"
                                  placeholder="https://"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="band_instagram" className="text-white font-medium">Instagram</Label>
                                <Input
                                  id="band_instagram"
                                  value={organizerData.social_links.instagram}
                                  onChange={(e) => setOrganizerData({
                                    ...organizerData,
                                    organization_type: 'band',
                                    social_links: { ...organizerData.social_links, instagram: e.target.value },
                                  })}
                                  className="border-white/10 bg-slate-950/70 text-white placeholder-gray-500 focus:border-cyan-400/60"
                                  placeholder="@band_handle"
                                />
                              </div>
                            </div>
                          </div>
                        ) : null}

                        {bandWizardStep === 1 ? (
                          <div className="space-y-5">
                            <div className="rounded-lg border border-cyan-300/15 bg-cyan-300/[0.04] p-4">
                              <div className="flex items-center justify-between gap-4">
                                <div>
                                  <p className="font-medium text-white">Public band page</p>
                                  <p className="text-sm text-slate-400">Visitors will discover this band at the artist-style URL.</p>
                                </div>
                                <Switch checked={bandPublicVisible} onCheckedChange={setBandPublicVisible} />
                              </div>
                              <div className="mt-4 rounded-md border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 font-mono text-sm text-cyan-100">
                                {bandPublicDisplayPath}
                              </div>
                            </div>
                            <div className="grid gap-4 md:grid-cols-2">
                              <div className="rounded-lg border border-dashed border-cyan-300/25 bg-slate-950/50 p-5">
                                <ImageIcon className="mb-3 h-5 w-5 text-cyan-200/70" />
                                <p className="font-medium text-white">Avatar</p>
                                <p className="mt-1 text-sm text-slate-400">Add band imagery from Band Profile settings after creation.</p>
                              </div>
                              <div className="rounded-lg border border-dashed border-purple-300/25 bg-slate-950/50 p-5">
                                <ImageIcon className="mb-3 h-5 w-5 text-purple-200/70" />
                                <p className="font-medium text-white">Banner</p>
                                <p className="mt-1 text-sm text-slate-400">Use a wide image so the public hero feels like a band page.</p>
                              </div>
                            </div>
                          </div>
                        ) : null}

                        {bandWizardStep === 2 ? (
                          <div className="space-y-5">
                            <div className="rounded-lg border border-cyan-300/15 bg-cyan-300/[0.04] p-4">
                              <p className="font-medium text-white">Invite public band members</p>
                              <p className="mt-1 text-sm text-slate-400">Members appear publicly after they accept. They do not get edit access.</p>
                              <div className="mt-4 grid gap-3 md:grid-cols-[1fr_140px_auto]">
                                <div className="space-y-2">
                                  <Label htmlFor="queued-band-artist">Search artist</Label>
                                  {selectedBandArtist ? (
                                    <div className="flex items-center justify-between rounded-md border border-sky-500/30 bg-sky-500/10 px-3 py-2">
                                      <span className="truncate text-sm text-sky-100">
                                        {selectedBandArtist.displayName || selectedBandArtist.username}
                                      </span>
                                      <Button type="button" size="icon" variant="ghost" className="h-7 w-7 text-sky-100" onClick={() => setSelectedBandArtist(null)}>
                                        <X className="h-3.5 w-3.5" />
                                      </Button>
                                    </div>
                                  ) : (
                                    <>
                                      <Input
                                        id="queued-band-artist"
                                        value={bandArtistQuery}
                                        onChange={(e) => void searchBandArtists(e.target.value)}
                                        className="border-white/10 bg-slate-950/70 text-white placeholder-gray-500 focus:border-cyan-400/60"
                                        placeholder="Artist name or slug"
                                      />
                                      {isSearchingBandArtist ? (
                                        <p className="text-xs text-slate-500">Searching…</p>
                                      ) : bandArtistHits.length ? (
                                        <div className="max-h-40 overflow-auto rounded-md border border-white/10 bg-slate-950/70">
                                          {bandArtistHits.map(hit => (
                                            <button
                                              key={hit.id}
                                              type="button"
                                              className="block w-full px-3 py-2 text-left text-sm text-slate-200 transition hover:bg-cyan-300/10"
                                              onClick={() => {
                                                setSelectedBandArtist(hit)
                                                setBandArtistQuery(String(hit.displayName || hit.username || ''))
                                                setBandArtistHits([])
                                              }}
                                            >
                                              {hit.displayName || hit.username}
                                              {hit.username ? <span className="ml-2 text-xs text-slate-500">@{hit.username}</span> : null}
                                            </button>
                                          ))}
                                        </div>
                                      ) : null}
                                    </>
                                  )}
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="queued-band-role">Role</Label>
                                  <Input
                                    id="queued-band-role"
                                    value={bandArtistRole}
                                    onChange={(e) => setBandArtistRole(e.target.value)}
                                    className="border-white/10 bg-slate-950/70 text-white focus:border-cyan-400/60"
                                  />
                                </div>
                                <div className="flex items-end">
                                  <Button type="button" onClick={addQueuedBandMember} disabled={!selectedBandArtist?.artistProfileId} className="bg-gradient-to-r from-cyan-500 to-purple-600 text-white hover:from-cyan-400 hover:to-purple-500">
                                    Add
                                  </Button>
                                </div>
                              </div>
                            </div>
                            {queuedBandMembers.length ? (
                              <div className="space-y-2">
                                {queuedBandMembers.map(member => (
                                  <div key={member.artistProfileId} className="flex items-center justify-between rounded-md border border-cyan-300/20 bg-cyan-300/[0.04] px-3 py-2">
                                    <div className="min-w-0">
                                      <p className="truncate text-sm font-medium text-white">{member.displayName}</p>
                                      <p className="text-xs text-slate-500">{member.username ? `@${member.username} · ` : ''}{member.role}</p>
                                    </div>
                                    <Button type="button" size="sm" variant="ghost" onClick={() => setQueuedBandMembers(prev => prev.filter(row => row.artistProfileId !== member.artistProfileId))}>
                                      Remove
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-slate-500">You can skip this and invite members from Band Hub later.</p>
                            )}
                          </div>
                        ) : null}

                        {bandWizardStep === 3 ? (
                          <div className="space-y-5">
                            <div className="rounded-lg border border-purple-300/15 bg-purple-300/[0.04] p-4">
                              <p className="font-medium text-white">Invite managers</p>
                              <p className="mt-1 text-sm text-slate-400">Managers can help edit and run the band. They are separate from public members.</p>
                              <div className="mt-4 grid gap-3 md:grid-cols-[1fr_170px_auto]">
                                <div className="space-y-2">
                                  <Label htmlFor="queued-manager-email">Email</Label>
                                  <Input
                                    id="queued-manager-email"
                                    type="email"
                                    value={bandManagerEmail}
                                    onChange={(e) => setBandManagerEmail(e.target.value)}
                                    className="border-white/10 bg-slate-950/70 text-white placeholder-gray-500 focus:border-purple-400/60"
                                    placeholder="manager@example.com"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="queued-manager-role">Role</Label>
                                  <select
                                    id="queued-manager-role"
                                    value={bandManagerRole}
                                    onChange={(e) => setBandManagerRole(e.target.value as QueuedBandManager['role'])}
                                    className="w-full rounded-md border border-white/10 bg-slate-950/70 px-3 py-2 text-white focus:border-purple-400/60"
                                  >
                                    <option value="tour_manager" className="bg-slate-800">Tour manager</option>
                                    <option value="admin" className="bg-slate-800">Admin</option>
                                    <option value="production" className="bg-slate-800">Production</option>
                                  </select>
                                </div>
                                <div className="flex items-end">
                                  <Button type="button" onClick={addQueuedBandManager} disabled={!bandManagerEmail.trim()} className="bg-white text-slate-950 hover:bg-slate-200">
                                    Add
                                  </Button>
                                </div>
                              </div>
                            </div>
                            {queuedBandManagers.length ? (
                              <div className="space-y-2">
                                {queuedBandManagers.map(manager => (
                                  <div key={manager.email} className="flex items-center justify-between rounded-md border border-purple-300/20 bg-purple-300/[0.04] px-3 py-2">
                                    <div>
                                      <p className="text-sm font-medium text-white">{manager.email}</p>
                                      <p className="text-xs capitalize text-slate-500">{manager.role.replace(/_/g, ' ')}</p>
                                    </div>
                                    <Button type="button" size="sm" variant="ghost" onClick={() => setQueuedBandManagers(prev => prev.filter(row => row.email !== manager.email))}>
                                      Remove
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-slate-500">You can skip this and invite managers from Band Hub later.</p>
                            )}
                          </div>
                        ) : null}

                        {bandWizardStep === 4 ? (
                          <div className="space-y-4">
                            <div className={`${bandInsetClass} p-4`}>
                              <div className="mb-3 flex items-center justify-between gap-3">
                                <div>
                                  <p className="text-sm font-medium text-white">Readiness console</p>
                                  <p className="text-xs text-slate-500">{bandReadiness}% launch ready</p>
                                </div>
                                <Badge className={bandRequiredReady ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-200' : 'border-amber-500/30 bg-amber-500/15 text-amber-200'}>
                                  {bandRequiredReady ? 'Ready' : 'Missing'}
                                </Badge>
                              </div>
                              <Progress value={bandReadiness} className="h-1.5 bg-slate-800" />
                            </div>
                            {bandLaunchItems.map(item => (
                              <div key={item.label} className="flex items-center justify-between rounded-md border border-white/10 bg-white/[0.03] px-3 py-2">
                                <span className="text-sm text-white">{item.label}</span>
                                <Badge className={item.done ? 'bg-emerald-500/20 text-emerald-200 border-emerald-500/30' : item.optional ? 'bg-white/10 text-slate-400 border-white/10' : 'bg-amber-500/20 text-amber-200 border-amber-500/30'}>
                                  {item.done ? 'Ready' : item.optional ? 'Optional' : 'Missing'}
                                </Badge>
                              </div>
                            ))}
                            <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-100/80">
                              Creating the band opens Band Hub, where you can review the public page, track invite status, and continue setup.
                            </div>
                          </div>
                        ) : null}
                          </div>

                          <aside className={`${bandPanelClass} h-fit p-4`}>
                            <div className="flex items-center gap-2">
                              <div className={`${bandIconClass} h-8 w-8 border-purple-300/20 bg-purple-300/10 text-purple-200`}>
                                <Eye className="h-4 w-4" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-white">Live status</p>
                                <p className="text-xs text-slate-500">Preview before launch</p>
                              </div>
                            </div>
                            <div className="mt-4 space-y-3">
                              <div className={`${bandInsetClass} px-3 py-2`}>
                                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Public URL</p>
                                <p className="mt-1 truncate font-mono text-sm text-cyan-100">{bandPublicDisplayPath}</p>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div className={`${bandInsetClass} p-3`}>
                                  <p className="text-xs text-slate-500">Visibility</p>
                                  <p className="mt-1 flex items-center gap-1.5 text-sm text-white">
                                    <Globe className="h-3.5 w-3.5 text-emerald-300" />
                                    {bandPublicVisible ? 'Public' : 'Private'}
                                  </p>
                                </div>
                                <div className={`${bandInsetClass} p-3`}>
                                  <p className="text-xs text-slate-500">Ready</p>
                                  <p className="mt-1 text-sm text-white">{bandReadiness}%</p>
                                </div>
                              </div>
                              <div className={`${bandInsetClass} p-3`}>
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-slate-400">Queued members</span>
                                  <Badge className="border-cyan-300/25 bg-cyan-300/10 text-cyan-100">{queuedBandMembers.length}</Badge>
                                </div>
                                <div className="mt-2 flex items-center justify-between text-sm">
                                  <span className="text-slate-400">Queued managers</span>
                                  <Badge className="border-purple-300/25 bg-purple-300/10 text-purple-100">{queuedBandManagers.length}</Badge>
                                </div>
                              </div>
                              <div className={`${bandInsetClass} p-3`}>
                                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Next landing</p>
                                <p className="mt-1 text-sm text-slate-200">Band Hub command dashboard</p>
                              </div>
                            </div>
                          </aside>
                        </div>

                        <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:items-center sm:justify-between">
                          <Button
                            type="button"
                            variant="outline"
                            className="border-white/20 text-gray-300 hover:bg-white/10"
                            onClick={() => bandWizardStep === 0 ? setSelectedOption(null) : setBandWizardStep(prev => Math.max(0, prev - 1))}
                          >
                            {bandWizardStep === 0 ? 'Cancel' : 'Back'}
                          </Button>
                          <div className="flex gap-3">
                            {bandWizardStep < bandWizardSteps.length - 1 ? (
                              <Button
                                type="button"
                                className="bg-gradient-to-r from-cyan-500 to-purple-600 text-white hover:from-cyan-400 hover:to-purple-500"
                                disabled={bandWizardStep === 0 && !organizerData.organization_name.trim()}
                                onClick={() => setBandWizardStep(prev => Math.min(bandWizardSteps.length - 1, prev + 1))}
                              >
                                Continue
                                <ArrowRight className="ml-2 h-4 w-4" />
                              </Button>
                            ) : (
                              <Button
                                type="submit"
                                disabled={isSubmitting || isLoading || !organizerData.organization_name.trim()}
                                className="bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:from-amber-600 hover:to-orange-700"
                              >
                                {isSubmitting || isLoading ? (
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                  <Sparkles className="mr-2 h-4 w-4" />
                                )}
                                Create band
                              </Button>
                            )}
                          </div>
                        </div>
                      </>
                    ) : selectedOption === 'artist-account' ? (
                      /* Artist Form */
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="artist_name" className="text-white font-medium">
                            Artist Name *
                          </Label>
                          <Input
                            id="artist_name"
                            value={artistData.artist_name}
                            onChange={(e) => setArtistData({ ...artistData, artist_name: e.target.value })}
                            className="bg-white/10 border-white/20 text-white placeholder-gray-400 backdrop-blur-sm focus:border-purple-500 focus:ring-purple-500/50"
                            placeholder="Your artist or stage name"
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="bio" className="text-white font-medium">
                            Bio
                          </Label>
                          <Textarea
                            id="bio"
                            value={artistData.bio}
                            onChange={(e) => setArtistData({ ...artistData, bio: e.target.value })}
                            className="bg-white/10 border-white/20 text-white placeholder-gray-400 backdrop-blur-sm focus:border-purple-500 focus:ring-purple-500/50 min-h-[100px]"
                            placeholder="Tell us about your music and artistic journey..."
                          />
                        </div>

                        <Separator className="bg-white/10" />

                        <div className="space-y-4">
                          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                            <Zap className="h-5 w-5 text-yellow-400" />
                            Social Links
                          </h3>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="instagram" className="text-white font-medium">Instagram</Label>
                              <Input
                                id="instagram"
                                value={artistData.social_links.instagram}
                                onChange={(e) => setArtistData({
                                  ...artistData,
                                  social_links: { ...artistData.social_links, instagram: e.target.value }
                                })}
                                className="bg-white/10 border-white/20 text-white placeholder-gray-400 backdrop-blur-sm focus:border-purple-500 focus:ring-purple-500/50"
                                placeholder="@your_handle"
                              />
                            </div>
                            
                            <div className="space-y-2">
                              <Label htmlFor="spotify" className="text-white font-medium">Spotify</Label>
                              <Input
                                id="spotify"
                                value={artistData.social_links.spotify}
                                onChange={(e) => setArtistData({
                                  ...artistData,
                                  social_links: { ...artistData.social_links, spotify: e.target.value }
                                })}
                                className="bg-white/10 border-white/20 text-white placeholder-gray-400 backdrop-blur-sm focus:border-purple-500 focus:ring-purple-500/50"
                                placeholder="Spotify artist URL"
                              />
                            </div>
                          </div>
                        </div>
                      </>
                    ) : selectedOption === 'venue-account' ? (
                      /* Venue Form */
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="venue_name" className="text-white font-medium">
                            Venue Name *
                          </Label>
                          <Input
                            id="venue_name"
                            value={venueData.venue_name}
                            onChange={(e) => setVenueData({ ...venueData, venue_name: e.target.value })}
                            className="bg-white/10 border-white/20 text-white placeholder-gray-400 backdrop-blur-sm focus:border-purple-500 focus:ring-purple-500/50"
                            placeholder="Name of your venue or event space"
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="description" className="text-white font-medium">
                            Description
                          </Label>
                          <Textarea
                            id="description"
                            value={venueData.description}
                            onChange={(e) => setVenueData({ ...venueData, description: e.target.value })}
                            className="bg-white/10 border-white/20 text-white placeholder-gray-400 backdrop-blur-sm focus:border-purple-500 focus:ring-purple-500/50 min-h-[100px]"
                            placeholder="Describe your venue, its atmosphere, and what makes it special..."
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="address" className="text-white font-medium">
                              <MapPin className="h-4 w-4 inline mr-1" />
                              Address
                            </Label>
                            <Input
                              id="address"
                              value={venueData.address}
                              onChange={(e) => setVenueData({ ...venueData, address: e.target.value })}
                              className="bg-white/10 border-white/20 text-white placeholder-gray-400 backdrop-blur-sm focus:border-purple-500 focus:ring-purple-500/50"
                              placeholder="123 Music St, City, State"
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="capacity" className="text-white font-medium">
                              <Users className="h-4 w-4 inline mr-1" />
                              Capacity
                            </Label>
                            <Input
                              id="capacity"
                              type="number"
                              value={venueData.capacity}
                              onChange={(e) => setVenueData({ ...venueData, capacity: e.target.value })}
                              className="bg-white/10 border-white/20 text-white placeholder-gray-400 backdrop-blur-sm focus:border-purple-500 focus:ring-purple-500/50"
                              placeholder="Maximum capacity"
                            />
                          </div>
                        </div>

                        <Separator className="bg-white/10" />

                        <div className="space-y-4">
                          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                            <Zap className="h-5 w-5 text-yellow-400" />
                            Contact Information
                          </h3>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="phone" className="text-white font-medium">Phone</Label>
                              <Input
                                id="phone"
                                value={venueData.contact_info.phone}
                                onChange={(e) => setVenueData({
                                  ...venueData,
                                  contact_info: { ...venueData.contact_info, phone: e.target.value }
                                })}
                                className="bg-white/10 border-white/20 text-white placeholder-gray-400 backdrop-blur-sm focus:border-purple-500 focus:ring-purple-500/50"
                                placeholder="(555) 123-4567"
                              />
                            </div>
                            
                            <div className="space-y-2">
                              <Label htmlFor="email" className="text-white font-medium">Email</Label>
                              <Input
                                id="email"
                                type="email"
                                value={venueData.contact_info.email}
                                onChange={(e) => setVenueData({
                                  ...venueData,
                                  contact_info: { ...venueData.contact_info, email: e.target.value }
                                })}
                                className="bg-white/10 border-white/20 text-white placeholder-gray-400 backdrop-blur-sm focus:border-purple-500 focus:ring-purple-500/50"
                                placeholder="booking@venue.com"
                              />
                            </div>
                          </div>
                        </div>
                      </>
                    ) : (
                      /* Organizer Form */
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="organization_name" className="text-white font-medium">
                            Organization Name *
                          </Label>
                          <Input
                            id="organization_name"
                            value={organizerData.organization_name}
                            onChange={(e) => setOrganizerData({ ...organizerData, organization_name: e.target.value })}
                            className="bg-white/10 border-white/20 text-white placeholder-gray-400 backdrop-blur-sm focus:border-purple-500 focus:ring-purple-500/50"
                            placeholder={
                              organizerData.organization_type === 'band'
                                ? 'Your band or group name'
                                : 'Your company or organization name'
                            }
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="organization_type" className="text-white font-medium">
                            Organization Type *
                          </Label>
                          <select
                            id="organization_type"
                            value={organizerData.organization_type}
                            onChange={(e) => setOrganizerData({ ...organizerData, organization_type: e.target.value })}
                            className="w-full bg-white/10 border border-white/20 text-white placeholder-gray-400 backdrop-blur-sm focus:border-purple-500 focus:ring-purple-500/50 px-3 py-2 rounded-md"
                            required
                          >
                            <option value="" className="bg-slate-800 text-white">Select type...</option>
                            <option value="band" className="bg-slate-800 text-white">Band / Group</option>
                            <option value="label" className="bg-slate-800 text-white">Record Label</option>
                            <option value="promoter" className="bg-slate-800 text-white">Promoter</option>
                            <option value="performance_agency" className="bg-slate-800 text-white">Performance / Talent Agency</option>
                            <option value="staffing_agency" className="bg-slate-800 text-white">Staffing Agency</option>
                            <option value="production_company" className="bg-slate-800 text-white">Production Company</option>
                            <option value="rental_company" className="bg-slate-800 text-white">Rental Company</option>
                            <option value="event_management" className="bg-slate-800 text-white">Event Management</option>
                            <option value="festival_organizer" className="bg-slate-800 text-white">Festival Organizer</option>
                            <option value="generic" className="bg-slate-800 text-white">Organization (other)</option>
                          </select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="url_slug" className="text-white font-medium">
                            Public URL slug
                          </Label>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-400 shrink-0">
                              {organizerData.organization_type === 'band' ? '/artist/' : '/organization/'}
                            </span>
                            <Input
                              id="url_slug"
                              value={organizerData.url_slug}
                              onChange={(e) =>
                                setOrganizerData({
                                  ...organizerData,
                                  url_slug: e.target.value
                                    .toLowerCase()
                                    .replace(/[^a-z0-9-]/g, '')
                                    .slice(0, 40),
                                })
                              }
                              className="bg-white/10 border-white/20 text-white placeholder-gray-400 backdrop-blur-sm focus:border-purple-500 focus:ring-purple-500/50"
                              placeholder={
                                organizerData.organization_name
                                  ? slugifyOrganizationName(organizerData.organization_name)
                                  : 'your-org-slug'
                              }
                            />
                          </div>
                          <p className="text-xs text-gray-400">
                            Optional. Leave blank to generate from the organization name.
                          </p>
                          {slugCheck.message ? (
                            <p
                              className={`text-xs ${
                                slugCheck.available === true
                                  ? "text-emerald-300"
                                  : slugCheck.available === false
                                    ? "text-rose-300"
                                    : "text-amber-300"
                              }`}
                              role="status"
                            >
                              {slugCheck.message}
                            </p>
                          ) : null}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="description" className="text-white font-medium">
                            Description
                          </Label>
                          <Textarea
                            id="description"
                            value={organizerData.description}
                            onChange={(e) => setOrganizerData({ ...organizerData, description: e.target.value })}
                            className="bg-white/10 border-white/20 text-white placeholder-gray-400 backdrop-blur-sm focus:border-purple-500 focus:ring-purple-500/50 min-h-[100px]"
                            placeholder="Tell us about your organization, services, and experience in the music industry..."
                          />
                        </div>

                        <Separator className="bg-white/10" />

                        <div className="space-y-4">
                          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                            <Briefcase className="h-5 w-5 text-amber-400" />
                            Contact Information
                          </h3>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="org_phone" className="text-white font-medium">Phone</Label>
                              <Input
                                id="org_phone"
                                value={organizerData.contact_info.phone}
                                onChange={(e) => setOrganizerData({
                                  ...organizerData,
                                  contact_info: { ...organizerData.contact_info, phone: e.target.value }
                                })}
                                className="bg-white/10 border-white/20 text-white placeholder-gray-400 backdrop-blur-sm focus:border-purple-500 focus:ring-purple-500/50"
                                placeholder="(555) 123-4567"
                              />
                            </div>
                            
                            <div className="space-y-2">
                              <Label htmlFor="org_email" className="text-white font-medium">Email</Label>
                              <Input
                                id="org_email"
                                type="email"
                                value={organizerData.contact_info.email}
                                onChange={(e) => setOrganizerData({
                                  ...organizerData,
                                  contact_info: { ...organizerData.contact_info, email: e.target.value }
                                })}
                                className="bg-white/10 border-white/20 text-white placeholder-gray-400 backdrop-blur-sm focus:border-purple-500 focus:ring-purple-500/50"
                                placeholder="info@yourorganization.com"
                              />
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="org_website" className="text-white font-medium">Website</Label>
                            <Input
                              id="org_website"
                              value={organizerData.contact_info.website}
                              onChange={(e) => setOrganizerData({
                                ...organizerData,
                                contact_info: { ...organizerData.contact_info, website: e.target.value }
                              })}
                              className="bg-white/10 border-white/20 text-white placeholder-gray-400 backdrop-blur-sm focus:border-purple-500 focus:ring-purple-500/50"
                              placeholder="https://yourorganization.com"
                            />
                          </div>
                        </div>

                        <Separator className="bg-white/10" />

                        <div className="space-y-4">
                          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                            <Zap className="h-5 w-5 text-yellow-400" />
                            Social Links
                          </h3>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="org_instagram" className="text-white font-medium">Instagram</Label>
                              <Input
                                id="org_instagram"
                                value={organizerData.social_links.instagram}
                                onChange={(e) => setOrganizerData({
                                  ...organizerData,
                                  social_links: { ...organizerData.social_links, instagram: e.target.value }
                                })}
                                className="bg-white/10 border-white/20 text-white placeholder-gray-400 backdrop-blur-sm focus:border-purple-500 focus:ring-purple-500/50"
                                placeholder="@your_organization"
                              />
                            </div>
                            
                            <div className="space-y-2">
                              <Label htmlFor="org_linkedin" className="text-white font-medium">LinkedIn</Label>
                              <Input
                                id="org_linkedin"
                                value={organizerData.social_links.linkedin}
                                onChange={(e) => setOrganizerData({
                                  ...organizerData,
                                  social_links: { ...organizerData.social_links, linkedin: e.target.value }
                                })}
                                className="bg-white/10 border-white/20 text-white placeholder-gray-400 backdrop-blur-sm focus:border-purple-500 focus:ring-purple-500/50"
                                placeholder="LinkedIn company page"
                              />
                            </div>
                          </div>
                        </div>
                      </>
                    )}

                    {!isBandWizard ? (
                      <div className="flex gap-4 pt-6">
                        <Button
                          type="button"
                          variant="outline"
                          className="flex-1 border-white/20 text-gray-300 hover:bg-white/10"
                          onClick={() => setSelectedOption(null)}
                        >
                          Cancel
                        </Button>

                        <Button
                          type="submit"
                          disabled={isSubmitting || isLoading}
                          className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold"
                        >
                          {isSubmitting || isLoading ? (
                            <div className="flex items-center">
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              Creating...
                            </div>
                          ) : (
                            <div className="flex items-center">
                              Create Account
                              <Sparkles className="ml-2 h-4 w-4" />
                            </div>
                          )}
                        </Button>
                      </div>
                    ) : null}
                  </form>
                </CardContent>
              </Card>
            </div>
          )}
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
      `}</style>
    </div>
  )
}
