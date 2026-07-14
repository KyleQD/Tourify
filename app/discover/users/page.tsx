"use client"

import { Suspense, useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { EnhancedSearch } from "@/components/search/enhanced-search"
import { resolvePublicProfilePath } from "@/lib/utils/public-profile-routes"
import { 
  Users, 
  Music, 
  Building, 
  MapPin, 
  Star, 
  TrendingUp, 
  Sparkles, 
  Filter,
  Search as SearchIcon,
  Heart,
  MessageCircle,
  Share2,
  Eye
} from "lucide-react"

interface DiscoveryStats {
  totalUsers: number
  totalArtists: number
  totalVenues: number
  totalConnections: number
  trendingGenres: string[]
  popularLocations: string[]
}

export default function UserDiscoveryPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white">
          Loading discovery...
        </div>
      }
    >
      <UserDiscoveryPageContent />
    </Suspense>
  )
}

function UserDiscoveryPageContent() {
  const searchParams = useSearchParams()
  const initialQuery = searchParams.get("q")?.trim() || ""
  const [selectedTab, setSelectedTab] = useState("search")
  const [stats, setStats] = useState<DiscoveryStats>({
    totalUsers: 0,
    totalArtists: 0,
    totalVenues: 0,
    totalConnections: 0,
    trendingGenres: [],
    popularLocations: []
  })

  useEffect(() => {
    // Load discovery stats
    loadDiscoveryStats()
  }, [])

  const loadDiscoveryStats = async () => {
    try {
      const response = await fetch('/api/search/enhanced?limit=1')
      if (response.ok) {
        const data = await response.json()
        // Mock stats for now - would come from analytics API
        setStats({
          totalUsers: 1250,
          totalArtists: 450,
          totalVenues: 180,
          totalConnections: 8900,
          trendingGenres: ['Electronic', 'Hip Hop', 'Rock', 'Pop'],
          popularLocations: ['Los Angeles, CA', 'New York, NY', 'Nashville, TN', 'Austin, TX']
        })
      }
    } catch (error) {
      console.error('Failed to load discovery stats:', error)
    }
  }

  const handleUserSelect = (user: any) => {
    const accountType = user.account_type || user.type
    const path = resolvePublicProfilePath({
      id: user.id,
      username: user.urlSlug || user.url_slug || user.username,
      account_type: accountType,
    }) || `/profile/${user.username}`
    window.location.href = path
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-bold text-white mb-4">
            Discover Amazing People
          </h1>
          <p className="text-gray-300 text-lg max-w-2xl mx-auto">
            Connect with artists, venues, and music professionals. Find your next collaboration, 
            discover new talent, or expand your network in the music industry.
          </p>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
        >
          <Card className="bg-white/10 backdrop-blur border-white/20">
            <CardContent className="p-4 text-center">
              <Users className="h-8 w-8 text-purple-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-white">{stats.totalUsers.toLocaleString()}</div>
              <div className="text-sm text-gray-300">Total Users</div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur border-white/20">
            <CardContent className="p-4 text-center">
              <Music className="h-8 w-8 text-purple-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-white">{stats.totalArtists.toLocaleString()}</div>
              <div className="text-sm text-gray-300">Artists</div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur border-white/20">
            <CardContent className="p-4 text-center">
              <Building className="h-8 w-8 text-purple-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-white">{stats.totalVenues.toLocaleString()}</div>
              <div className="text-sm text-gray-300">Venues</div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur border-white/20">
            <CardContent className="p-4 text-center">
              <Heart className="h-8 w-8 text-purple-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-white">{stats.totalConnections.toLocaleString()}</div>
              <div className="text-sm text-gray-300">Connections</div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Trending Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-8"
        >
          <Card className="bg-white/10 backdrop-blur border-white/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-purple-400" />
                Trending Now
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Trending Genres */}
                <div>
                  <h3 className="text-white font-semibold mb-3">Popular Genres</h3>
                  <div className="flex flex-wrap gap-2">
                    {stats.trendingGenres.map((genre, index) => (
                      <Badge
                        key={genre}
                        className="bg-purple-500/20 text-purple-300 border-purple-500/30 hover:bg-purple-500/30 cursor-pointer"
                      >
                        {genre}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Popular Locations */}
                <div>
                  <h3 className="text-white font-semibold mb-3">Hot Locations</h3>
                  <div className="flex flex-wrap gap-2">
                    {stats.popularLocations.map((location, index) => (
                      <Badge
                        key={location}
                        className="bg-blue-500/20 text-blue-300 border-blue-500/30 hover:bg-blue-500/30 cursor-pointer"
                      >
                        <MapPin className="h-3 w-3 mr-1" />
                        {location}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Main Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-3 bg-white/10 backdrop-blur border-white/20">
              <TabsTrigger 
                value="search" 
                className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-300"
              >
                <SearchIcon className="h-4 w-4 mr-2" />
                Search
              </TabsTrigger>
              <TabsTrigger 
                value="artists" 
                className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-300"
              >
                <Music className="h-4 w-4 mr-2" />
                Artists
              </TabsTrigger>
              <TabsTrigger 
                value="venues" 
                className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-300"
              >
                <Building className="h-4 w-4 mr-2" />
                Venues
              </TabsTrigger>
            </TabsList>

            <TabsContent value="search" className="space-y-6">
              <Card className="bg-white/10 backdrop-blur border-white/20">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <SearchIcon className="h-5 w-5 text-purple-400" />
                    Advanced Search
                  </CardTitle>
                  <p className="text-gray-300 text-sm">
                    Find exactly what you're looking for with our powerful search filters
                  </p>
                </CardHeader>
                <CardContent>
                  <EnhancedSearch
                    onResultSelect={handleUserSelect}
                    showFilters={true}
                    showRecommendations={true}
                    placeholder="Search for artists, venues, or users..."
                    initialQuery={initialQuery}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="artists" className="space-y-6">
              <Card className="bg-white/10 backdrop-blur border-white/20">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Music className="h-5 w-5 text-purple-400" />
                    Featured Artists
                  </CardTitle>
                  <p className="text-gray-300 text-sm">
                    Discover talented artists across all genres and experience levels
                  </p>
                </CardHeader>
                <CardContent>
                  <EnhancedSearch
                    onResultSelect={handleUserSelect}
                    showFilters={true}
                    showRecommendations={true}
                    placeholder="Search for artists..."
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="venues" className="space-y-6">
              <Card className="bg-white/10 backdrop-blur border-white/20">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Building className="h-5 w-5 text-purple-400" />
                    Venues & Spaces
                  </CardTitle>
                  <p className="text-gray-300 text-sm">
                    Find the perfect venue for your next performance or event
                  </p>
                </CardHeader>
                <CardContent>
                  <EnhancedSearch
                    onResultSelect={handleUserSelect}
                    showFilters={true}
                    showRecommendations={true}
                    placeholder="Search for venues..."
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>

        {/* Features Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-12"
        >
          <Card className="bg-white/10 backdrop-blur border-white/20">
            <CardHeader>
              <CardTitle className="text-white text-center">Why Use Our Discovery System?</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <Sparkles className="h-12 w-12 text-purple-400 mx-auto mb-4" />
                  <h3 className="text-white font-semibold mb-2">AI-Powered Recommendations</h3>
                  <p className="text-gray-300 text-sm">
                    Get personalized suggestions based on your interests, location, and network
                  </p>
                </div>

                <div className="text-center">
                  <Filter className="h-12 w-12 text-purple-400 mx-auto mb-4" />
                  <h3 className="text-white font-semibold mb-2">Advanced Filtering</h3>
                  <p className="text-gray-300 text-sm">
                    Filter by genre, location, experience level, availability, and more
                  </p>
                </div>

                <div className="text-center">
                  <Eye className="h-12 w-12 text-purple-400 mx-auto mb-4" />
                  <h3 className="text-white font-semibold mb-2">Rich Profiles</h3>
                  <p className="text-gray-300 text-sm">
                    View detailed profiles with portfolios, ratings, and social connections
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
