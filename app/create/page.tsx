"use client"

import { useState, useEffect } from "react"
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
  ChevronRight,
  Crown,
  Briefcase,
  ExternalLink
} from "lucide-react"
import Link from "next/link"
import { isOrganizationType } from "@/lib/accounts/account-types"
import { getOrganizationPublicProfilePath } from "@/lib/utils/public-profile-routes"
import { slugifyOrganizationName, normalizeOrganizationSubtype } from "@/lib/organizations/org-subtypes"

interface CreateOption {
  id: string
  title: string
  description: string
  icon: any
  gradient: string
  features: string[]
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
    description: 'For bands, labels, promoters, agencies, and production companies',
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

export default function CreatePage() {
  const { user, loading, authError, retrySessionCheck } = useAuth()
  const [showSlowAuthHint, setShowSlowAuthHint] = useState(false)
  const { accounts, hasAccountType, createArtistAccount, createVenueAccount, createOrganizerAccount, isLoading } = useMultiAccount()
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [orgSuccessPaths, setOrgSuccessPaths] = useState<{ publicPath: string | null; adminPath: string } | null>(null)
  
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
        const slug =
          organizerData.url_slug.trim() ||
          slugifyOrganizationName(organizerData.organization_name)
        const subtype = normalizeOrganizationSubtype(organizerData.organization_type)
        await createOrganizerAccount({
          ...organizerData,
          url_slug: slug,
          subtype,
        })
        const publicPath = getOrganizationPublicProfilePath(slug)
        setOrgSuccessPaths({ publicPath, adminPath: '/admin/dashboard' })
        setSuccess('Organization account created. Open your public page or Admin Work Mode from the links below.')
      }
      
      // Give a moment for the accounts to refresh before showing success
      await new Promise(resolve => setTimeout(resolve, 100))
      
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
            <div className="max-w-2xl mx-auto">
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
                   'Create Organization Account'}
                </h2>
                <p className="text-gray-400">
                  Fill out the information below to set up your {
                    selectedOption === 'artist-account' ? 'artist' : 
                    selectedOption === 'venue-account' ? 'venue' : 
                    'organization'
                  } account
                </p>
              </div>

              <Card className="bg-white/10 backdrop-blur-xl border border-white/20">
                <CardContent className="p-8">
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {selectedOption === 'artist-account' ? (
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
                            placeholder="Your company or organization name"
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
                            <option value="band" className="bg-slate-800 text-white">Band</option>
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
                            <span className="text-sm text-gray-400 shrink-0">/organization/</span>
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