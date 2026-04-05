"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Search, 
  Music, 
  Building2, 
  Users,
  MapPin,
  Star,
  Filter,
  Heart,
  Plus,
  Loader2,
  ArrowLeft,
  BriefcaseBusiness
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("all")
  const [isSearching, setIsSearching] = useState(false)
  const [creatorTypeFilter, setCreatorTypeFilter] = useState("")
  const [serviceFilter, setServiceFilter] = useState("")
  const [availableForHireOnly, setAvailableForHireOnly] = useState(false)
  const [searchResults, setSearchResults] = useState<any>({ artists: [], venues: [], users: [], total: 0 })
  const [followedProfiles, setFollowedProfiles] = useState<Set<string>>(new Set())
  const [followStatuses, setFollowStatuses] = useState<Record<string, { isFollowing: boolean; hasRequest: boolean; requestStatus: string | null }>>({})
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, isAuthenticated } = useAuth()

  // Get search query from URL params
  useEffect(() => {
    const query = searchParams.get('q') || ''
    const creatorType = searchParams.get('creatorType') || ''
    const service = searchParams.get('service') || ''
    const availableForHire = searchParams.get('availableForHire') === 'true'
    setSearchQuery(query)
    setCreatorTypeFilter(creatorType)
    setServiceFilter(service)
    setAvailableForHireOnly(availableForHire)
    if (query) {
      fetchSearchResults(query, {
        creatorType,
        service,
        availableForHire
      })
    }
  }, [searchParams])

  // Check follow status for all profiles in search results
  useEffect(() => {
    if (isAuthenticated) {
      const allProfileIds = [
        ...searchResults.users.map((user: any) => user.id),
        ...searchResults.artists.map((artist: any) => artist.id),
        ...searchResults.venues.map((venue: any) => venue.id)
      ]
      
      if (allProfileIds.length > 0) {
        checkFollowStatuses(allProfileIds)
      }
    }
  }, [searchResults.users, searchResults.artists, searchResults.venues, isAuthenticated])

  const checkFollowStatuses = async (profileIds: string[]) => {
    try {
      const statusPromises = profileIds.map(async (profileId) => {
        const response = await fetch(`/api/social/follow-request?action=check&targetUserId=${profileId}`, {
          credentials: 'include'
        })
        if (response.ok) {
          const data = await response.json()
          return { profileId, ...data }
        }
        return { profileId, isFollowing: false, hasRequest: false, requestStatus: null }
      })

      const statuses = await Promise.all(statusPromises)
      const statusMap = statuses.reduce((acc, status) => {
        acc[status.profileId] = {
          isFollowing: status.isFollowing,
          hasRequest: status.hasRequest,
          requestStatus: status.requestStatus
        }
        return acc
      }, {} as Record<string, { isFollowing: boolean; hasRequest: boolean; requestStatus: string | null }>)

      setFollowStatuses(statusMap)
    } catch (error) {
      console.error('Error checking follow statuses:', error)
    }
  }

  const fetchSearchResults = async (
    query: string,
    options?: {
      creatorType?: string
      service?: string
      availableForHire?: boolean
    }
  ) => {
    if (!query.trim()) return
    
    try {
      setIsSearching(true)
      const creatorType = options?.creatorType ?? creatorTypeFilter
      const service = options?.service ?? serviceFilter
      const availableForHire = options?.availableForHire ?? availableForHireOnly
      const params = new URLSearchParams({
        q: query,
        type: activeTab,
        limit: '20'
      })
      if (creatorType) params.set('creatorType', creatorType)
      if (service) params.set('service', service)
      if (availableForHire) params.set('availableForHire', 'true')
      
      // Prefer enhanced search API in production; group results by type to fit UI
      const response = await fetch(`/api/search/enhanced?${params.toString()}`)
      const data = await response.json()
      
      if (response.ok && data.results) {
        const enhanced = Array.isArray(data.results) ? data.results : []
        const grouped = enhanced.reduce((acc: any, item: any) => {
          if (item.type === 'artist') acc.artists.push(item)
          else if (item.type === 'venue') acc.venues.push(item)
          else acc.users.push(item)
          return acc
        }, { artists: [], venues: [], users: [], total: 0 })
        grouped.total = grouped.artists.length + grouped.venues.length + grouped.users.length
        setSearchResults(grouped)
      } else {
        toast.error('Failed to load search results')
      }
    } catch (error) {
      console.error('Error fetching search results:', error)
      toast.error('Failed to load search results')
    } finally {
      setIsSearching(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      const params = new URLSearchParams({ q: searchQuery.trim() })
      if (creatorTypeFilter) params.set('creatorType', creatorTypeFilter)
      if (serviceFilter) params.set('service', serviceFilter)
      if (availableForHireOnly) params.set('availableForHire', 'true')
      router.push(`/search?${params.toString()}`)
    }
  }

  const handleFollow = async (profileId: string, accountType: string) => {
    if (!isAuthenticated) {
      toast.error('Please log in to follow accounts')
      return
    }

    const currentStatus = followStatuses[profileId]
    
    // If already following, show message
    if (currentStatus?.isFollowing) {
      toast.info('You are already following this user')
      return
    }

    // If there's a pending request, show message
    if (currentStatus?.hasRequest && currentStatus?.requestStatus === 'pending') {
      toast.info('Follow request already sent')
      return
    }

    try {
      const response = await fetch('/api/social/follow-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          targetUserId: profileId, 
          action: 'send' 
        })
      })

      if (response.ok) {
        // Update the follow status
        setFollowStatuses(prev => ({
          ...prev,
          [profileId]: {
            isFollowing: false,
            hasRequest: true,
            requestStatus: 'pending'
          }
        }))
        toast.success('Follow request sent! Waiting for approval...')
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to send follow request')
      }
    } catch (error) {
      console.error('Error sending follow request:', error)
      toast.error('Failed to send follow request')
    }
  }

  const navigateToProfile = (username: string) => {
    router.push(`/profile/${username}`)
  }

  const getDisplayName = (profile: any) => {
    if (profile.account_type === 'artist') return profile.artist_name || profile.display_name
    if (profile.account_type === 'venue') return profile.venue_name || profile.display_name
    return profile.display_name || profile.name || profile.username
  }

  const getProfileGradient = (accountType: string) => {
    switch (accountType) {
      case 'artist': return 'from-purple-500 to-pink-500'
      case 'venue': return 'from-blue-500 to-cyan-500'
      default: return 'from-green-500 to-emerald-500'
    }
  }

  const renderUserCard = (user: any, index: number) => {
    const displayName = getDisplayName(user)
    const gradient = getProfileGradient(user.account_type)
    const followStatus = followStatuses[user.id]
    const isFollowing = followStatus?.isFollowing || false
    const hasRequest = followStatus?.hasRequest || false
    const requestStatus = followStatus?.requestStatus

    const getButtonText = () => {
      if (isFollowing) return 'Following'
      if (hasRequest && requestStatus === 'pending') return 'Request Sent'
      return 'Follow'
    }

    const getButtonVariant = () => {
      if (isFollowing) return 'bg-gradient-to-r from-green-600 to-emerald-600'
      if (hasRequest && requestStatus === 'pending') return 'bg-gradient-to-r from-yellow-600 to-orange-600'
      return `bg-gradient-to-r ${gradient}`
    }

    const isButtonDisabled = isFollowing || (hasRequest && requestStatus === 'pending')

    return (
      <motion.div
        key={user.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.1 }}
      >
        <Card 
          className="group relative bg-slate-900/50 border-slate-700/50 backdrop-blur-sm hover:bg-slate-800/50 transition-all duration-300 overflow-hidden cursor-pointer"
          onClick={() => navigateToProfile(user.username)}
        >
          <CardContent className="relative p-6">
            <div className="flex items-start space-x-4">
              <div className="relative">
                <Avatar className="h-16 w-16 ring-2 ring-slate-600 group-hover:ring-purple-400/50 transition-all duration-300">
                  <AvatarImage src={user.avatar_url} />
                  <AvatarFallback className={`bg-gradient-to-br ${gradient} text-white text-lg font-bold`}>
                    {displayName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
              </div>
              
              <div className="flex-1 space-y-2">
                <div className="flex items-center space-x-2">
                  <h3 className="font-semibold text-lg text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-gray-300 transition-all duration-300">
                    {displayName}
                  </h3>
                </div>
                
                <p className="text-slate-300 text-sm">@{user.username}</p>
                {user.bio && <p className="text-slate-300 text-sm">{user.bio}</p>}
                
                <div className="flex items-center space-x-3 text-sm text-slate-400">
                  <div className="flex items-center">
                    <Users className="h-3 w-3 mr-1" />
                    <span>{user.stats?.followers?.toLocaleString() || 0} followers</span>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col space-y-2" onClick={(e) => e.stopPropagation()}>
                <Button 
                  size="sm" 
                  className={`${getButtonVariant()} hover:shadow-lg hover:shadow-purple-500/25 text-white border-0`}
                  onClick={() => handleFollow(user.id, user.account_type)}
                  disabled={isButtonDisabled}
                >
                  <Heart className={`h-4 w-4 mr-1 ${isFollowing ? 'fill-current' : ''}`} />
                  {getButtonText()}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    )
  }

  const renderArtistCard = (artist: any, index: number) => {
    const displayName = getDisplayName(artist)
    const gradient = getProfileGradient(artist.account_type)
    const followStatus = followStatuses[artist.id]
    const isFollowing = followStatus?.isFollowing || false
    const hasRequest = followStatus?.hasRequest || false
    const requestStatus = followStatus?.requestStatus

    const getButtonText = () => {
      if (isFollowing) return 'Following'
      if (hasRequest && requestStatus === 'pending') return 'Request Sent'
      return 'Follow'
    }

    const getButtonVariant = () => {
      if (isFollowing) return 'bg-gradient-to-r from-green-600 to-emerald-600'
      if (hasRequest && requestStatus === 'pending') return 'bg-gradient-to-r from-yellow-600 to-orange-600'
      return `bg-gradient-to-r ${gradient}`
    }

    const isButtonDisabled = isFollowing || (hasRequest && requestStatus === 'pending')

    return (
      <motion.div
        key={artist.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.1 }}
      >
        <Card 
          className="group relative bg-slate-900/50 border-slate-700/50 backdrop-blur-sm hover:bg-slate-800/50 transition-all duration-300 overflow-hidden cursor-pointer"
          onClick={() => navigateToProfile(artist.username)}
        >
          <CardContent className="relative p-6">
            <div className="flex items-start space-x-4">
              <div className="relative">
                <Avatar className="h-16 w-16 ring-2 ring-slate-600 group-hover:ring-purple-400/50 transition-all duration-300">
                  <AvatarImage src={artist.avatar_url} />
                  <AvatarFallback className={`bg-gradient-to-br ${gradient} text-white text-lg font-bold`}>
                    {displayName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
              </div>
              
              <div className="flex-1 space-y-2">
                <div className="flex items-center space-x-2">
                  <h3 className="font-semibold text-lg text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-gray-300 transition-all duration-300">
                    {displayName}
                  </h3>
                </div>
                
                <p className="text-slate-300 text-sm">@{artist.username}</p>
                {artist.bio && <p className="text-slate-300 text-sm">{artist.bio}</p>}
                
                <div className="flex items-center space-x-3 text-sm text-slate-400">
                  <div className="flex items-center">
                    <Users className="h-3 w-3 mr-1" />
                    <span>{artist.stats?.followers?.toLocaleString() || 0} followers</span>
                  </div>
                </div>
                
                {artist.genres && artist.genres.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {artist.genres.slice(0, 3).map((genre: string) => (
                      <Badge key={genre} variant="outline" className="border-slate-600 text-slate-300 text-xs hover:border-purple-400/50">
                        {genre}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="flex flex-col space-y-2" onClick={(e) => e.stopPropagation()}>
                <Button 
                  size="sm" 
                  className={`${getButtonVariant()} hover:shadow-lg hover:shadow-purple-500/25 text-white border-0`}
                  onClick={() => handleFollow(artist.id, artist.account_type)}
                  disabled={isButtonDisabled}
                >
                  <Heart className={`h-4 w-4 mr-1 ${isFollowing ? 'fill-current' : ''}`} />
                  {getButtonText()}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    )
  }

  const renderVenueCard = (venue: any, index: number) => {
    const displayName = getDisplayName(venue)
    const gradient = getProfileGradient(venue.account_type)
    const followStatus = followStatuses[venue.id]
    const isFollowing = followStatus?.isFollowing || false
    const hasRequest = followStatus?.hasRequest || false
    const requestStatus = followStatus?.requestStatus

    const getButtonText = () => {
      if (isFollowing) return 'Following'
      if (hasRequest && requestStatus === 'pending') return 'Request Sent'
      return 'Follow'
    }

    const getButtonVariant = () => {
      if (isFollowing) return 'bg-gradient-to-r from-green-600 to-emerald-600'
      if (hasRequest && requestStatus === 'pending') return 'bg-gradient-to-r from-yellow-600 to-orange-600'
      return `bg-gradient-to-r ${gradient}`
    }

    const isButtonDisabled = isFollowing || (hasRequest && requestStatus === 'pending')

    return (
      <motion.div
        key={venue.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.1 }}
      >
        <Card 
          className="group relative bg-slate-900/50 border-slate-700/50 backdrop-blur-sm hover:bg-slate-800/50 transition-all duration-300 overflow-hidden cursor-pointer"
          onClick={() => navigateToProfile(venue.username)}
        >
          <CardContent className="relative p-6">
            <div className="flex items-start space-x-4">
              <div className="relative">
                <Avatar className="h-16 w-16 ring-2 ring-slate-600 group-hover:ring-blue-400/50 transition-all duration-300">
                  <AvatarImage src={venue.avatar_url} />
                  <AvatarFallback className={`bg-gradient-to-br ${gradient} text-white text-lg font-bold`}>
                    {displayName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
              </div>
              
              <div className="flex-1 space-y-2">
                <div className="flex items-center space-x-2">
                  <h3 className="font-semibold text-lg text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-gray-300 transition-all duration-300">
                    {displayName}
                  </h3>
                </div>
                
                <p className="text-slate-300 text-sm">@{venue.username}</p>
                {venue.description && <p className="text-slate-300 text-sm">{venue.description}</p>}
                
                <div className="flex items-center space-x-3 text-sm text-slate-400">
                  {venue.location && (
                    <div className="flex items-center">
                      <MapPin className="h-3 w-3 mr-1" />
                      <span>{venue.location}</span>
                    </div>
                  )}
                  <div className="flex items-center">
                    <Users className="h-3 w-3 mr-1" />
                    <span>{venue.stats?.followers?.toLocaleString() || 0} followers</span>
                  </div>
                </div>
                
                {venue.amenities && venue.amenities.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {venue.amenities.slice(0, 3).map((amenity: string) => (
                      <Badge key={amenity} variant="outline" className="border-slate-600 text-slate-300 text-xs hover:border-blue-400/50">
                        {amenity}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="flex flex-col space-y-2" onClick={(e) => e.stopPropagation()}>
                <Button 
                  size="sm" 
                  className={`${getButtonVariant()} hover:shadow-lg hover:shadow-blue-500/25 text-white border-0`}
                  onClick={() => handleFollow(venue.id, venue.account_type)}
                  disabled={isButtonDisabled}
                >
                  <Heart className={`h-4 w-4 mr-1 ${isFollowing ? 'fill-current' : ''}`} />
                  {getButtonText()}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    )
  }

  const totalResults = searchResults.artists.length + searchResults.venues.length + searchResults.users.length

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="text-white hover:bg-white/10"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <h1 className="text-3xl font-bold text-white">Search Results</h1>
          </div>

          {/* Search Form */}
          <form onSubmit={handleSearch} className="max-w-2xl">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <Input
                type="text"
                placeholder="Search for artists, venues, or users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-12 bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:border-purple-500 focus:ring-purple-500/20"
              />
              <Button
                type="submit"
                size="sm"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-purple-600 hover:bg-purple-700"
              >
                Search
              </Button>
            </div>
          </form>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:max-w-4xl sm:grid-cols-3">
            <Input
              value={creatorTypeFilter}
              onChange={(event) => setCreatorTypeFilter(event.target.value)}
              placeholder="Creator type (photographer, designer...)"
              className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
            />
            <Input
              value={serviceFilter}
              onChange={(event) => setServiceFilter(event.target.value)}
              placeholder="Service keyword (video, merch, logo...)"
              className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
            />
            <Button
              type="button"
              variant={availableForHireOnly ? "default" : "outline"}
              onClick={() => setAvailableForHireOnly(prev => !prev)}
              className={availableForHireOnly ? "bg-emerald-600 hover:bg-emerald-700" : "border-white/20 text-white hover:bg-white/10"}
            >
              <BriefcaseBusiness className="h-4 w-4 mr-2" />
              Available for hire only
            </Button>
          </div>
        </div>

        {/* Results Summary */}
        {searchQuery && (
          <div className="mb-6">
            <p className="text-gray-300">
              {isSearching ? (
                <span className="flex items-center">
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Searching...
                </span>
              ) : (
                `Found ${totalResults} result${totalResults !== 1 ? 's' : ''} for "${searchQuery}"`
              )}
            </p>
          </div>
        )}

        {/* Results Tabs */}
        {searchQuery && (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4 bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-1 gap-1 mb-6">
              <TabsTrigger 
                value="all" 
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white rounded-xl transition-all duration-300 flex items-center justify-center text-gray-300 hover:text-white"
              >
                All ({totalResults})
              </TabsTrigger>
              <TabsTrigger 
                value="artists"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-blue-500 data-[state=active]:text-white rounded-xl transition-all duration-300 flex items-center justify-center text-gray-300 hover:text-white"
              >
                <Music className="h-4 w-4 mr-2" />
                Artists ({searchResults.artists.length})
              </TabsTrigger>
              <TabsTrigger 
                value="venues"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-cyan-500 data-[state=active]:text-white rounded-xl transition-all duration-300 flex items-center justify-center text-gray-300 hover:text-white"
              >
                <Building2 className="h-4 w-4 mr-2" />
                Venues ({searchResults.venues.length})
              </TabsTrigger>
              <TabsTrigger 
                value="users"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-500 data-[state=active]:text-white rounded-xl transition-all duration-300 flex items-center justify-center text-gray-300 hover:text-white"
              >
                <Users className="h-4 w-4 mr-2" />
                Users ({searchResults.users.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-6">
              {isSearching ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {[...Array(6)].map((_, i) => (
                    <Card key={i} className="bg-slate-900/50 border-slate-700/50 animate-pulse">
                      <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-16 bg-slate-800 rounded-full"></div>
                          <div className="flex-1">
                            <div className="h-4 bg-slate-800 rounded mb-2"></div>
                            <div className="h-3 bg-slate-800 rounded w-3/4"></div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : totalResults > 0 ? (
                <div className="space-y-8">
                  {/* Artists Section */}
                  {searchResults.artists.length > 0 && (
                    <div>
                      <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
                        <Music className="h-5 w-5 mr-2 text-purple-400" />
                        Artists ({searchResults.artists.length})
                      </h3>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {searchResults.artists.map((artist: any, index: number) => renderArtistCard(artist, index))}
                      </div>
                    </div>
                  )}

                  {/* Venues Section */}
                  {searchResults.venues.length > 0 && (
                    <div>
                      <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
                        <Building2 className="h-5 w-5 mr-2 text-blue-400" />
                        Venues ({searchResults.venues.length})
                      </h3>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {searchResults.venues.map((venue: any, index: number) => renderVenueCard(venue, index))}
                      </div>
                    </div>
                  )}

                  {/* Users Section */}
                  {searchResults.users.length > 0 && (
                    <div>
                      <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
                        <Users className="h-5 w-5 mr-2 text-green-400" />
                        Users ({searchResults.users.length})
                      </h3>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {searchResults.users.map((user: any, index: number) => renderUserCard(user, index))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <Card className="bg-slate-900/50 border-slate-700/50">
                  <CardContent className="p-12 text-center">
                    <Search className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">No Results Found</h3>
                    <p className="text-gray-400">Try adjusting your search terms or check the spelling.</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="artists" className="space-y-6">
              {isSearching ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {[...Array(4)].map((_, i) => (
                    <Card key={i} className="bg-slate-900/50 border-slate-700/50 animate-pulse">
                      <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-16 bg-slate-800 rounded-full"></div>
                          <div className="flex-1">
                            <div className="h-4 bg-slate-800 rounded mb-2"></div>
                            <div className="h-3 bg-slate-800 rounded w-3/4"></div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : searchResults.artists.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {searchResults.artists.map((artist: any, index: number) => renderArtistCard(artist, index))}
                </div>
              ) : (
                <Card className="bg-slate-900/50 border-slate-700/50">
                  <CardContent className="p-12 text-center">
                    <Music className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">No Artists Found</h3>
                    <p className="text-gray-400">Try adjusting your search criteria to find artists.</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="venues" className="space-y-6">
              {isSearching ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {[...Array(4)].map((_, i) => (
                    <Card key={i} className="bg-slate-900/50 border-slate-700/50 animate-pulse">
                      <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-16 bg-slate-800 rounded-full"></div>
                          <div className="flex-1">
                            <div className="h-4 bg-slate-800 rounded mb-2"></div>
                            <div className="h-3 bg-slate-800 rounded w-3/4"></div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : searchResults.venues.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {searchResults.venues.map((venue: any, index: number) => renderVenueCard(venue, index))}
                </div>
              ) : (
                <Card className="bg-slate-900/50 border-slate-700/50">
                  <CardContent className="p-12 text-center">
                    <Building2 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">No Venues Found</h3>
                    <p className="text-gray-400">Try adjusting your search criteria to find venues.</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="users" className="space-y-6">
              {isSearching ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {[...Array(4)].map((_, i) => (
                    <Card key={i} className="bg-slate-900/50 border-slate-700/50 animate-pulse">
                      <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-16 bg-slate-800 rounded-full"></div>
                          <div className="flex-1">
                            <div className="h-4 bg-slate-800 rounded mb-2"></div>
                            <div className="h-3 bg-slate-800 rounded w-3/4"></div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : searchResults.users.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {searchResults.users.map((user: any, index: number) => renderUserCard(user, index))}
                </div>
              ) : (
                <Card className="bg-slate-900/50 border-slate-700/50">
                  <CardContent className="p-12 text-center">
                    <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">No Users Found</h3>
                    <p className="text-gray-400">Try adjusting your search criteria to find users.</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        )}

        {/* Empty State */}
        {!searchQuery && (
          <Card className="bg-slate-900/50 border-slate-700/50">
            <CardContent className="p-12 text-center">
              <Search className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Search for Accounts</h3>
              <p className="text-gray-400">Enter a search term above to find artists, venues, and users on the platform.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
} 