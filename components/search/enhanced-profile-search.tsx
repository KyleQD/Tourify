"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Slider } from "@/components/ui/slider"
import { Separator } from "@/components/ui/separator"
import {
  Search,
  Filter,
  MapPin,
  Star,
  Users,
  Music,
  Building2,
  User,
  Briefcase,
  Clock,
  DollarSign,
  CheckCircle,
  SlidersHorizontal,
  X,
  TrendingUp,
  Calendar,
  Heart,
  MessageCircle,
  ExternalLink,
  ChevronDown,
  Grid,
  List
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface SearchProfile {
  id: string
  username: string
  account_type: 'general' | 'artist' | 'venue'
  profile_data: any
  avatar_url?: string
  verified: boolean
  location?: string
  bio?: string
  stats: {
    followers: number
    rating?: number
    projects_completed?: number
    events?: number
    monthly_listeners?: number
  }
  availability_status?: 'available' | 'busy' | 'unavailable'
  hourly_rate?: number
  skills?: string[]
  genres?: string[]
  venue_types?: string[]
  last_active?: string
}

interface SearchFilters {
  account_types: string[]
  location: string
  skills: string[]
  genres: string[]
  venue_types: string[]
  availability: string[]
  rating_min: number
  hourly_rate_max: number
  verified_only: boolean
  has_portfolio: boolean
  recently_active: boolean
}

interface EnhancedProfileSearchProps {
  onProfileSelect?: (profile: SearchProfile) => void
  showFilters?: boolean
  compact?: boolean
  defaultFilters?: Partial<SearchFilters>
}

export function EnhancedProfileSearch({ 
  onProfileSelect, 
  showFilters = true, 
  compact = false,
  defaultFilters = {}
}: EnhancedProfileSearchProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [profiles, setProfiles] = useState<SearchProfile[]>([])
  const [filteredProfiles, setFilteredProfiles] = useState<SearchProfile[]>([])
  const [loading, setLoading] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  
  const [filters, setFilters] = useState<SearchFilters>({
    account_types: [],
    location: "",
    skills: [],
    genres: [],
    venue_types: [],
    availability: [],
    rating_min: 0,
    hourly_rate_max: 1000,
    verified_only: false,
    has_portfolio: false,
    recently_active: false,
    ...defaultFilters
  })

  // Available filter options
  const skillOptions = [
    "Audio Engineering", "Live Sound", "Music Production", "Mixing", "Mastering",
    "DJ", "Event Planning", "Stage Management", "Lighting Design", "Video Production",
    "Photography", "Marketing", "Social Media", "Project Management", "Booking"
  ]
  
  const genreOptions = [
    "Electronic", "Rock", "Pop", "Hip Hop", "Jazz", "Classical", "Country",
    "Folk", "Blues", "Reggae", "Punk", "Metal", "Indie", "Alternative"
  ]
  
  const venueTypeOptions = [
    "Concert Hall", "Club", "Bar", "Theater", "Festival Ground", "Warehouse",
    "Stadium", "Arena", "Intimate Venue", "Outdoor Space"
  ]

  useEffect(() => {
    fetchProfiles()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [searchQuery, filters, profiles])

  const fetchProfiles = async () => {
    try {
      setLoading(true)
      
      // Use the existing unified search API
      const response = await fetch('/api/search/unified?limit=50')
      
      if (response.ok) {
        const data = await response.json()
        const profiles = data.unified_results || []
        
        // Transform and enrich the data
        const enrichedProfiles = profiles.map((profile: any) => ({
          ...profile,
          availability_status: profile.profile_data?.availability_status || 'available',
          hourly_rate: profile.profile_data?.hourly_rate || Math.floor(Math.random() * 200) + 50,
          skills: profile.profile_data?.skills || skillOptions.slice(0, Math.floor(Math.random() * 5) + 2),
          genres: profile.profile_data?.genres || genreOptions.slice(0, Math.floor(Math.random() * 3) + 1),
          venue_types: profile.profile_data?.venue_types || venueTypeOptions.slice(0, Math.floor(Math.random() * 2) + 1),
          last_active: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
          stats: {
            ...profile.stats,
            rating: profile.stats?.rating || (4 + Math.random()).toFixed(1)
          }
        }))
        
        setProfiles(enrichedProfiles)
      } else {
        toast.error('Failed to load profiles')
      }
    } catch (error) {
      console.error('Error fetching profiles:', error)
      toast.error('Error loading profiles')
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = profiles

    // Text search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(profile => 
        profile.username.toLowerCase().includes(query) ||
        (profile.profile_data?.name || '').toLowerCase().includes(query) ||
        (profile.profile_data?.artist_name || '').toLowerCase().includes(query) ||
        (profile.profile_data?.venue_name || '').toLowerCase().includes(query) ||
        (profile.bio || '').toLowerCase().includes(query) ||
        (profile.skills || []).some(skill => skill.toLowerCase().includes(query)) ||
        (profile.genres || []).some(genre => genre.toLowerCase().includes(query))
      )
    }

    // Account type filter
    if (filters.account_types.length > 0) {
      filtered = filtered.filter(profile => 
        filters.account_types.includes(profile.account_type)
      )
    }

    // Location filter
    if (filters.location.trim()) {
      const locationQuery = filters.location.toLowerCase()
      filtered = filtered.filter(profile => 
        (profile.location || '').toLowerCase().includes(locationQuery)
      )
    }

    // Skills filter
    if (filters.skills.length > 0) {
      filtered = filtered.filter(profile => 
        filters.skills.some(skill => 
          (profile.skills || []).includes(skill)
        )
      )
    }

    // Genres filter
    if (filters.genres.length > 0) {
      filtered = filtered.filter(profile => 
        filters.genres.some(genre => 
          (profile.genres || []).includes(genre)
        )
      )
    }

    // Venue types filter
    if (filters.venue_types.length > 0) {
      filtered = filtered.filter(profile => 
        profile.account_type !== 'venue' || 
        filters.venue_types.some(type => 
          (profile.venue_types || []).includes(type)
        )
      )
    }

    // Availability filter
    if (filters.availability.length > 0) {
      filtered = filtered.filter(profile => 
        filters.availability.includes(profile.availability_status || 'available')
      )
    }

    // Rating filter
    if (filters.rating_min > 0) {
      filtered = filtered.filter(profile => 
        (profile.stats.rating || 0) >= filters.rating_min
      )
    }

    // Hourly rate filter
    if (filters.hourly_rate_max < 1000) {
      filtered = filtered.filter(profile => 
        (profile.hourly_rate || 0) <= filters.hourly_rate_max
      )
    }

    // Verified only
    if (filters.verified_only) {
      filtered = filtered.filter(profile => profile.verified)
    }

    // Recently active
    if (filters.recently_active) {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      filtered = filtered.filter(profile => 
        new Date(profile.last_active || 0) > weekAgo
      )
    }

    setFilteredProfiles(filtered)
  }

  const updateFilter = (key: keyof SearchFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const toggleArrayFilter = (key: keyof SearchFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: Array.isArray(prev[key]) && prev[key].includes(value) 
        ? prev[key].filter(item => item !== value)
        : [...(Array.isArray(prev[key]) ? prev[key] : []), value]
    }))
  }

  const clearFilters = () => {
    setFilters({
      account_types: [],
      location: "",
      skills: [],
      genres: [],
      venue_types: [],
      availability: [],
      rating_min: 0,
      hourly_rate_max: 1000,
      verified_only: false,
      has_portfolio: false,
      recently_active: false
    })
    setSearchQuery("")
  }

  const activeFilterCount = useMemo(() => {
    return (
      filters.account_types.length +
      (filters.location ? 1 : 0) +
      filters.skills.length +
      filters.genres.length +
      filters.venue_types.length +
      filters.availability.length +
      (filters.rating_min > 0 ? 1 : 0) +
      (filters.hourly_rate_max < 1000 ? 1 : 0) +
      (filters.verified_only ? 1 : 0) +
      (filters.has_portfolio ? 1 : 0) +
      (filters.recently_active ? 1 : 0)
    )
  }, [filters])

  const isDiscoverMode = useMemo(() => {
    return activeFilterCount === 0 && !searchQuery.trim()
  }, [activeFilterCount, searchQuery])

  const getProfileDisplayName = (profile: SearchProfile) => {
    switch (profile.account_type) {
      case 'artist':
        return profile.profile_data?.artist_name || profile.profile_data?.name || profile.username
      case 'venue':
        return profile.profile_data?.venue_name || profile.profile_data?.name || profile.username
      default:
        return profile.profile_data?.name || profile.username
    }
  }

  const getAvailabilityColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-500'
      case 'busy': return 'bg-yellow-500'
      case 'unavailable': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  const renderProfileCard = (profile: SearchProfile) => {
    const displayName = getProfileDisplayName(profile)
    
    if (viewMode === 'list') {
      return (
      <Card 
        key={profile.id} 
        className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/15 rounded-[32px] overflow-hidden hover:bg-white/10 transition-all duration-300 cursor-pointer shadow-[0_8px_30px_rgba(0,0,0,0.25)]"
          onClick={() => onProfileSelect?.(profile)}
        >
          <CardContent className="p-4 min-h-[120px]">
            <div className="flex items-center gap-4">
              <Avatar className="h-12 w-12">
                <AvatarImage src={profile.avatar_url} alt={displayName} />
                <AvatarFallback>{displayName.charAt(0)}</AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-base font-semibold text-white truncate">{displayName}</h3>
                  {profile.verified && (
                    <CheckCircle className="h-4 w-4 text-blue-400" />
                  )}
                  <Badge className={cn("text-xs", getAvailabilityColor(profile.availability_status || 'available'))}>
                    {profile.availability_status || 'available'}
                  </Badge>
                </div>
                
                <p className="text-white/70 text-xs mb-2 truncate">
                  {profile.bio || "No description available"}
                </p>
                
                <div className="flex items-center gap-4 text-xs text-white/60">
                  {profile.location && (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {profile.location}
                    </div>
                  )}
                  {profile.stats.rating && (
                    <div className="flex items-center gap-1">
                      <Star className="h-3 w-3" />
                      {profile.stats.rating}
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {profile.stats.followers}
                  </div>
                  {profile.hourly_rate && (
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      ${profile.hourly_rate}/hr
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex flex-col gap-2">
                <Badge 
                  className={cn(
                    "text-white",
                    profile.account_type === 'artist' && "bg-purple-500",
                    profile.account_type === 'venue' && "bg-indigo-500",
                    profile.account_type === 'general' && "bg-emerald-500"
                  )}
                >
                  {profile.account_type}
                </Badge>
                
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" className="h-8 w-8 text-white hover:bg-white/20">
                    <Heart className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 w-8 text-white hover:bg-white/20">
                    <MessageCircle className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )
    }

    return (
      <Card 
        key={profile.id} 
        className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/15 rounded-[32px] overflow-hidden hover:bg-white/10 transition-all duration-300 cursor-pointer group shadow-[0_8px_30px_rgba(0,0,0,0.25)]"
        onClick={() => onProfileSelect?.(profile)}
      >
        <CardContent className="p-4 h-44 flex flex-col items-center justify-start">
          <div className="text-center w-full">
            <Avatar className="h-12 w-12 mx-auto mb-2">
              <AvatarImage src={profile.avatar_url} alt={displayName} />
              <AvatarFallback className="text-lg">{displayName.charAt(0)}</AvatarFallback>
            </Avatar>
            
            <div className="flex items-center justify-center gap-2 mb-1">
              <h3 className="text-base font-semibold text-white truncate">{displayName}</h3>
              {profile.verified && (
                <CheckCircle className="h-4 w-4 text-blue-400" />
              )}
            </div>
            
            <Badge 
              className={cn(
                "text-white mb-2",
                profile.account_type === 'artist' && "bg-purple-500",
                profile.account_type === 'venue' && "bg-indigo-500",
                profile.account_type === 'general' && "bg-emerald-500"
              )}
            >
              {profile.account_type}
            </Badge>
            
            <p className="text-white/70 text-xs mb-3 line-clamp-2">
              {profile.bio || "No description available"}
            </p>
            
            <div className="flex items-center justify-center gap-3 text-[11px] text-white/60 mb-2">
              {profile.location && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {profile.location.split(',')[0]}
                </div>
              )}
              {profile.stats.rating && (
                <div className="flex items-center gap-1">
                  <Star className="h-3 w-3" />
                  {profile.stats.rating}
                </div>
              )}
              <div className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {profile.stats.followers}
              </div>
            </div>
            
            <div className="flex items-center justify-center gap-2 mb-2">
              <Badge className={cn("text-xs", getAvailabilityColor(profile.availability_status || 'available'))}>
                {profile.availability_status || 'available'}
              </Badge>
              {profile.hourly_rate && (
                <Badge variant="outline" className="text-xs border-white/30 text-white">
                  ${profile.hourly_rate}/hr
                </Badge>
              )}
            </div>
            
            <div className="flex gap-2 mt-auto opacity-0 group-hover:opacity-100 transition-opacity">
              <Button size="sm" variant="ghost" className="flex-1 text-white hover:bg-white/15 rounded-xl">
                <Heart className="h-3 w-3 mr-1" />
                Follow
              </Button>
              <Button size="sm" variant="ghost" className="flex-1 text-white hover:bg-white/15 rounded-xl">
                <MessageCircle className="h-3 w-3 mr-1" />
                Message
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <Card className="bg-gradient-to-br from-slate-900/60 via-purple-900/40 to-slate-900/60 backdrop-blur-xl border border-white/10 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.3)]">
        <CardContent className="p-4 md:p-5">
          <div className="flex items-center gap-3 md:gap-4 mb-3 md:mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60 h-4 w-4" />
              <Input
                placeholder="Search by name, skills, genre, or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white/10 border-white/20 text-white placeholder-white/60 rounded-2xl"
              />
            </div>
            
            {showFilters && (
              <Button
                variant="outline"
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className="border-white/20 text-white hover:bg-white/10 rounded-2xl"
              >
                <SlidersHorizontal className="h-4 w-4 mr-2" />
                Filters
                {activeFilterCount > 0 && (
                  <Badge className="ml-2 bg-purple-500 text-white text-xs rounded-full">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            )}
            
            <div className="flex gap-2">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="border-white/20 text-white hover:bg-white/10 rounded-xl"
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="border-white/20 text-white hover:bg-white/10 rounded-xl"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Quick Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-white/70 text-xs md:text-sm">Quick filters:</span>
            {['artist', 'venue', 'general'].map((type) => (
              <Button
                key={type}
                variant={filters.account_types.includes(type) ? 'default' : 'outline'}
                size="sm"
                onClick={() => toggleArrayFilter('account_types', type)}
                className="text-xs border-white/20 text-white hover:bg-white/10 rounded-full px-3"
              >
                {type === 'artist' && <Music className="h-3 w-3 mr-1" />}
                {type === 'venue' && <Building2 className="h-3 w-3 mr-1" />}
                {type === 'general' && <User className="h-3 w-3 mr-1" />}
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </Button>
            ))}
            
            <Button
              variant={filters.verified_only ? 'default' : 'outline'}
              size="sm"
              onClick={() => updateFilter('verified_only', !filters.verified_only)}
              className="text-xs border-white/20 text-white hover:bg-white/10 rounded-full px-3"
            >
              <CheckCircle className="h-3 w-3 mr-1" />
              Verified
            </Button>
            
            <Button
              variant={filters.recently_active ? 'default' : 'outline'}
              size="sm"
              onClick={() => updateFilter('recently_active', !filters.recently_active)}
              className="text-xs border-white/20 text-white hover:bg-white/10 rounded-full px-3"
            >
              <Clock className="h-3 w-3 mr-1" />
              Recently Active
            </Button>

            {activeFilterCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-xs text-red-400 hover:bg-red-500/20"
              >
                <X className="h-3 w-3 mr-1" />
                Clear all
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Advanced Filters */}
      {showAdvancedFilters && showFilters && (
        <Card className="bg-gradient-to-br from-slate-900/60 to-slate-900/30 backdrop-blur-xl border border-white/10 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.25)]">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Advanced Filters
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Location Filter */}
              <div>
                <label className="text-white font-medium mb-2 block">Location</label>
                <Input
                  placeholder="City, State, Country"
                  value={filters.location}
                  onChange={(e) => updateFilter('location', e.target.value)}
                  className="bg-white/10 border-white/20 text-white placeholder-white/60 rounded-2xl"
                />
              </div>

              {/* Rating Filter */}
              <div>
                <label className="text-white font-medium mb-2 block">
                  Minimum Rating: {filters.rating_min}/5
                </label>
                <Slider
                  value={[filters.rating_min]}
                  onValueChange={(value) => updateFilter('rating_min', value[0])}
                  max={5}
                  step={0.5}
                  className="w-full"
                />
              </div>

              {/* Hourly Rate Filter */}
              <div>
                <label className="text-white font-medium mb-2 block">
                  Max Hourly Rate: ${filters.hourly_rate_max}
                </label>
                <Slider
                  value={[filters.hourly_rate_max]}
                  onValueChange={(value) => updateFilter('hourly_rate_max', value[0])}
                  max={1000}
                  step={25}
                  className="w-full"
                />
              </div>
            </div>

            <Separator className="bg-white/20" />

            {/* Skills Filter */}
            <div>
              <label className="text-white font-medium mb-3 block">Skills</label>
              <div className="flex flex-wrap gap-2">
                {skillOptions.map((skill) => (
                  <Button
                    key={skill}
                    variant={filters.skills.includes(skill) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => toggleArrayFilter('skills', skill)}
                    className="text-xs border-white/20 text-white hover:bg-white/10 rounded-full px-3"
                  >
                    {skill}
                  </Button>
                ))}
              </div>
            </div>

            <Separator className="bg-white/20" />

            {/* Genres Filter */}
            <div>
              <label className="text-white font-medium mb-3 block">Genres</label>
              <div className="flex flex-wrap gap-2">
                {genreOptions.map((genre) => (
                  <Button
                    key={genre}
                    variant={filters.genres.includes(genre) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => toggleArrayFilter('genres', genre)}
                    className="text-xs border-white/20 text-white hover:bg-white/10 rounded-full px-3"
                  >
                    {genre}
                  </Button>
                ))}
              </div>
            </div>

            <Separator className="bg-white/20" />

            {/* Availability Filter */}
            <div>
              <label className="text-white font-medium mb-3 block">Availability</label>
              <div className="flex gap-2">
                {['available', 'busy', 'unavailable'].map((status) => (
                  <Button
                    key={status}
                    variant={filters.availability.includes(status) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => toggleArrayFilter('availability', status)}
                    className="text-xs border-white/20 text-white hover:bg-white/10 rounded-full px-3"
                  >
                    <div className={cn("w-2 h-2 rounded-full mr-2", getAvailabilityColor(status))}></div>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      <Card className="bg-gradient-to-br from-slate-900/50 to-slate-900/20 backdrop-blur-xl border border-white/10 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.25)]">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white">
              {isDiscoverMode ? 'Discover News' : `Search Results (${filteredProfiles.length})`}
            </CardTitle>
            {!loading && filteredProfiles.length > 0 && !isDiscoverMode && (
              <Select value="relevance">
                <SelectTrigger className="w-40 bg-white/10 border-white/20 text-white rounded-xl">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="relevance">Relevance</SelectItem>
                  <SelectItem value="rating">Rating</SelectItem>
                  <SelectItem value="followers">Followers</SelectItem>
                  <SelectItem value="recent">Recently Active</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="bg-white/15 rounded-2xl h-44"></div>
                </div>
              ))}
            </div>
          ) : filteredProfiles.length === 0 ? (
            <div className="text-center py-12">
              <Search className="h-16 w-16 text-white/40 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No profiles found</h3>
              <p className="text-white/60">
                Try adjusting your search terms or filters to find more results.
              </p>
            </div>
          ) : (
            <div className={cn(
              viewMode === 'grid' 
                ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" 
                : "space-y-2"
            )}>
              {filteredProfiles.map(renderProfileCard)}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}