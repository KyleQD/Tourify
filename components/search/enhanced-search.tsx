"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Search, Filter, MapPin, Music, Users, Building, Star, Clock, TrendingUp, Sparkles } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { useDebounce } from "@/hooks/use-debounce"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

interface EnhancedSearchResult {
  id: string
  type: 'artist' | 'venue' | 'user' | 'event' | 'music'
  username: string
  displayName: string
  avatar?: string
  bio?: string
  location?: string
  genres?: string[]
  skills?: string[]
  experience?: string
  availability?: string
  verified: boolean
  rating?: number
  followers: number
  following: number
  posts: number
  events?: number
  socialConnections?: {
    mutualConnections: number
    isFollowing: boolean
    isFollowed: boolean
    connectionStrength: number
  }
  recommendations?: {
    reason: string
    score: number
  }
  created_at: string
  updated_at: string
}

interface SearchFilters {
  type: 'all' | 'artists' | 'venues' | 'users'
  location: string
  genre: string
  creatorType: string
  service: string
  experience: 'beginner' | 'intermediate' | 'expert' | 'all'
  availability: 'available' | 'busy' | 'unavailable' | 'all'
  availableForHire: boolean
  verified: boolean
  sortBy: 'relevance' | 'popularity' | 'recent' | 'rating'
  includeRecommendations: boolean
  includeSocialData: boolean
}

interface EnhancedSearchProps {
  onResultSelect?: (result: EnhancedSearchResult) => void
  onFiltersChange?: (filters: SearchFilters) => void
  className?: string
  placeholder?: string
  showFilters?: boolean
  showRecommendations?: boolean
}

export function EnhancedSearch({
  onResultSelect,
  onFiltersChange,
  className,
  placeholder = "Search artists, venues, users...",
  showFilters = true,
  showRecommendations = true
}: EnhancedSearchProps) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<EnhancedSearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [filters, setFilters] = useState<SearchFilters>({
    type: 'all',
    location: '',
    genre: '',
    creatorType: '',
    service: '',
    experience: 'all',
    availability: 'all',
    availableForHire: false,
    verified: false,
    sortBy: 'relevance',
    includeRecommendations: showRecommendations,
    includeSocialData: true
  })

  const debouncedQuery = useDebounce(query, 300)

  // Available options for filters
  const genres = ['Rock', 'Pop', 'Hip Hop', 'Electronic', 'Jazz', 'Classical', 'Country', 'R&B', 'Metal', 'Folk', 'Blues', 'Reggae']
  const creatorTypes = ['Musician', 'Videographer', 'Photographer', 'Designer', 'Merch Creator', 'Producer', 'Stylist', 'Visual Artist']
  const locations = ['Los Angeles, CA', 'New York, NY', 'Nashville, TN', 'Austin, TX', 'Chicago, IL', 'Miami, FL', 'Seattle, WA', 'Denver, CO']
  const experiences = ['beginner', 'intermediate', 'expert']
  const availabilities = ['available', 'busy', 'unavailable']

  const searchUsers = useCallback(async () => {
    if (!debouncedQuery.trim() && !showAdvancedFilters) {
      setResults([])
      return
    }

    setIsLoading(true)
    
    try {
      const params = new URLSearchParams()
      
      if (debouncedQuery.trim()) {
        params.append('q', debouncedQuery)
      }
      
      // Add filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== 'all') {
          if (Array.isArray(value)) {
            params.append(key, value.join(','))
          } else {
            params.append(key, value.toString())
          }
        }
      })

      const response = await fetch(`/api/search/enhanced?${params}`)
      
      if (response.ok) {
        const data = await response.json()
        setResults(data.results || [])
      } else {
        console.error('Search failed:', response.status)
        setResults([])
      }
    } catch (error) {
      console.error('Search error:', error)
      setResults([])
    } finally {
      setIsLoading(false)
    }
  }, [debouncedQuery, filters, showAdvancedFilters])

  useEffect(() => {
    searchUsers()
  }, [searchUsers])

  useEffect(() => {
    onFiltersChange?.(filters)
  }, [filters, onFiltersChange])

  const handleFilterChange = (key: keyof SearchFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const clearFilters = () => {
    setFilters({
      type: 'all',
      location: '',
      genre: '',
      creatorType: '',
      service: '',
      experience: 'all',
      availability: 'all',
      availableForHire: false,
      verified: false,
      sortBy: 'relevance',
      includeRecommendations: showRecommendations,
      includeSocialData: true
    })
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'artist': return <Music className="h-4 w-4" />
      case 'venue': return <Building className="h-4 w-4" />
      case 'user': return <Users className="h-4 w-4" />
      default: return <Users className="h-4 w-4" />
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'artist': return 'bg-purple-500/20 text-purple-300 border-purple-500/30'
      case 'venue': return 'bg-blue-500/20 text-blue-300 border-blue-500/30'
      case 'user': return 'bg-green-500/20 text-green-300 border-green-500/30'
      default: return 'bg-gray-500/20 text-gray-300 border-gray-500/30'
    }
  }

  const getAvailabilityColor = (availability: string) => {
    switch (availability) {
      case 'available': return 'bg-green-500'
      case 'busy': return 'bg-yellow-500'
      case 'unavailable': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  const getAvailabilityText = (availability: string) => {
    switch (availability) {
      case 'available': return 'Available'
      case 'busy': return 'Busy'
      case 'unavailable': return 'Unavailable'
      default: return 'Unknown'
    }
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10 pr-4"
        />
        {showFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className="absolute right-2 top-1/2 transform -translate-y-1/2"
          >
            <Filter className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Advanced Filters */}
      <AnimatePresence>
        {showAdvancedFilters && showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="bg-gray-900/50 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white text-lg">Advanced Filters</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Type Filter */}
                  <div className="space-y-2">
                    <Label className="text-white">Type</Label>
                    <Select value={filters.type} onValueChange={(value: any) => handleFilterChange('type', value)}>
                      <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-700">
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="artists">Artists</SelectItem>
                        <SelectItem value="venues">Venues</SelectItem>
                        <SelectItem value="users">Users</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Location Filter */}
                  <div className="space-y-2">
                    <Label className="text-white">Location</Label>
                    <Select value={filters.location} onValueChange={(value) => handleFilterChange('location', value)}>
                      <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                        <SelectValue placeholder="Any location" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-700">
                        <SelectItem value="">Any location</SelectItem>
                        {locations.map(location => (
                          <SelectItem key={location} value={location}>{location}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Genre Filter */}
                  <div className="space-y-2">
                    <Label className="text-white">Genre</Label>
                    <Select value={filters.genre} onValueChange={(value) => handleFilterChange('genre', value)}>
                      <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                        <SelectValue placeholder="Any genre" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-700">
                        <SelectItem value="">Any genre</SelectItem>
                        {genres.map(genre => (
                          <SelectItem key={genre} value={genre}>{genre}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Creator Type Filter */}
                  <div className="space-y-2">
                    <Label className="text-white">Creator Type</Label>
                    <Select value={filters.creatorType} onValueChange={(value) => handleFilterChange('creatorType', value)}>
                      <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                        <SelectValue placeholder="Any creator type" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-700">
                        <SelectItem value="">Any creator type</SelectItem>
                        {creatorTypes.map(item => (
                          <SelectItem key={item} value={item}>{item}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Service Filter */}
                  <div className="space-y-2">
                    <Label className="text-white">Service Keyword</Label>
                    <Input
                      value={filters.service}
                      onChange={(event) => handleFilterChange('service', event.target.value)}
                      placeholder="video, photos, merch, design..."
                      className="bg-gray-800 border-gray-700 text-white"
                    />
                  </div>

                  {/* Experience Filter */}
                  <div className="space-y-2">
                    <Label className="text-white">Experience</Label>
                    <Select value={filters.experience} onValueChange={(value: any) => handleFilterChange('experience', value)}>
                      <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-700">
                        <SelectItem value="all">Any experience</SelectItem>
                        {experiences.map(exp => (
                          <SelectItem key={exp} value={exp}>{exp.charAt(0).toUpperCase() + exp.slice(1)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Availability Filter */}
                  <div className="space-y-2">
                    <Label className="text-white">Availability</Label>
                    <Select value={filters.availability} onValueChange={(value: any) => handleFilterChange('availability', value)}>
                      <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-700">
                        <SelectItem value="all">Any availability</SelectItem>
                        {availabilities.map(avail => (
                          <SelectItem key={avail} value={avail}>{avail.charAt(0).toUpperCase() + avail.slice(1)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Sort By */}
                  <div className="space-y-2">
                    <Label className="text-white">Sort By</Label>
                    <Select value={filters.sortBy} onValueChange={(value: any) => handleFilterChange('sortBy', value)}>
                      <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-700">
                        <SelectItem value="relevance">Relevance</SelectItem>
                        <SelectItem value="popularity">Popularity</SelectItem>
                        <SelectItem value="recent">Recent</SelectItem>
                        <SelectItem value="rating">Rating</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Checkboxes */}
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="verified"
                      checked={filters.verified}
                      onCheckedChange={(checked) => handleFilterChange('verified', checked)}
                    />
                    <Label htmlFor="verified" className="text-white">Verified only</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="availableForHire"
                      checked={filters.availableForHire}
                      onCheckedChange={(checked) => handleFilterChange('availableForHire', Boolean(checked))}
                    />
                    <Label htmlFor="availableForHire" className="text-white">Available for hire</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="recommendations"
                      checked={filters.includeRecommendations}
                      onCheckedChange={(checked) => handleFilterChange('includeRecommendations', checked)}
                    />
                    <Label htmlFor="recommendations" className="text-white">Include recommendations</Label>
                  </div>
                </div>

                {/* Clear Filters */}
                <Button
                  variant="outline"
                  onClick={clearFilters}
                  className="border-gray-600 text-gray-300 hover:bg-gray-800"
                >
                  Clear Filters
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results */}
      <div className="space-y-4">
        {isLoading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto"></div>
            <p className="text-gray-400 mt-2">Searching...</p>
          </div>
        )}

        {!isLoading && results.length === 0 && debouncedQuery && (
          <div className="text-center py-8">
            <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-400">No results found for "{debouncedQuery}"</p>
            <p className="text-gray-500 text-sm mt-2">Try adjusting your search terms or filters</p>
          </div>
        )}

        {!isLoading && results.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-gray-400 text-sm">
                Found {results.length} result{results.length !== 1 ? 's' : ''}
              </p>
              {filters.includeRecommendations && (
                <div className="flex items-center space-x-1 text-yellow-400">
                  <Sparkles className="h-4 w-4" />
                  <span className="text-sm">AI Recommendations</span>
                </div>
              )}
            </div>

            <div className="space-y-3">
              {results.map((result, index) => (
                <motion.div
                  key={result.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card 
                    className="bg-gray-900/50 border-gray-800 hover:border-gray-700 transition-colors cursor-pointer"
                    onClick={() => onResultSelect?.(result)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start space-x-4">
                        {/* Avatar */}
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={result.avatar} alt={result.displayName} />
                          <AvatarFallback className="bg-gradient-to-br from-purple-500 to-blue-500">
                            {result.displayName.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2 mb-1">
                                <h3 className="text-white font-semibold truncate">{result.displayName}</h3>
                                {result.verified && (
                                  <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 text-xs">
                                    Verified
                                  </Badge>
                                )}
                                <Badge className={cn("text-xs", getTypeColor(result.type))}>
                                  {getTypeIcon(result.type)}
                                  <span className="ml-1">{result.type}</span>
                                </Badge>
                              </div>
                              
                              <p className="text-gray-400 text-sm mb-2">@{result.username}</p>
                              
                              {result.bio && (
                                <p className="text-gray-300 text-sm mb-2 line-clamp-2">{result.bio}</p>
                              )}

                              {/* Location and Availability */}
                              <div className="flex items-center space-x-4 mb-2">
                                {result.location && (
                                  <div className="flex items-center space-x-1 text-gray-400 text-sm">
                                    <MapPin className="h-3 w-3" />
                                    <span>{result.location}</span>
                                  </div>
                                )}
                                {result.availability && (
                                  <div className="flex items-center space-x-1 text-sm">
                                    <div className={cn("w-2 h-2 rounded-full", getAvailabilityColor(result.availability))} />
                                    <span className="text-gray-400">{getAvailabilityText(result.availability)}</span>
                                  </div>
                                )}
                              </div>

                              {/* Genres and Skills */}
                              <div className="flex flex-wrap gap-1 mb-2">
                                {result.genres?.slice(0, 3).map(genre => (
                                  <Badge key={genre} variant="secondary" className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-xs">
                                    {genre}
                                  </Badge>
                                ))}
                                {result.skills?.slice(0, 2).map(skill => (
                                  <Badge key={skill} variant="secondary" className="bg-green-500/20 text-green-300 border-green-500/30 text-xs">
                                    {skill}
                                  </Badge>
                                ))}
                              </div>

                              {/* Stats */}
                              <div className="flex items-center space-x-4 text-gray-400 text-sm">
                                <span>{formatNumber(result.followers)} followers</span>
                                <span>{formatNumber(result.posts)} posts</span>
                                {result.rating && (
                                  <div className="flex items-center space-x-1">
                                    <Star className="h-3 w-3 text-yellow-400 fill-current" />
                                    <span>{result.rating}/5</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Social Connections */}
                            {result.socialConnections && (
                              <div className="text-right text-sm">
                                <div className="text-gray-400">
                                  {result.socialConnections.mutualConnections} mutual
                                </div>
                                {result.socialConnections.isFollowing && (
                                  <Badge className="bg-green-500/20 text-green-300 border-green-500/30 text-xs">
                                    Following
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Recommendations */}
                          {result.recommendations && (
                            <div className="mt-3 pt-3 border-t border-gray-800">
                              <div className="flex items-center space-x-2 text-yellow-400 text-sm">
                                <Sparkles className="h-3 w-3" />
                                <span>{result.recommendations.reason}</span>
                                <span className="text-gray-500">({Math.round(result.recommendations.score * 100)}% match)</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
