"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  Search, 
  MapPin, 
  Users, 
  Star, 
  Calendar,
  Building2,
  Filter,
  Grid,
  List
} from "lucide-react"

interface Venue {
  id: string
  venue_name: string
  description: string
  city: string
  state: string
  country: string
  capacity: number
  venue_types: string[]
  created_at: string
  updated_at: string
}

export default function VenuesPage() {
  const router = useRouter()
  const [venues, setVenues] = useState<Venue[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")

  useEffect(() => {
    fetchVenues()
  }, [])

  const fetchVenues = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/venues")
      if (response.ok) {
        const data = await response.json()
        setVenues(data.venues || [])
      }
    } catch (error) {
      console.error("Error fetching venues:", error)
    } finally {
      setLoading(false)
    }
  }

  const filteredVenues = venues.filter(venue =>
    venue.venue_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    venue.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    venue.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleVenueClick = (venue: Venue) => {
    // Generate a URL-friendly slug from venue name
    const slug = venue.venue_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    router.push(`/venues/${slug}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-gray-400">Loading venues...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-blue-600 py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">Discover Venues</h1>
            <p className="text-xl text-green-100 mb-8">
              Find the perfect venue for your next event
            </p>
            
            {/* Search Bar */}
            <div className="max-w-2xl mx-auto relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <Input
                type="text"
                placeholder="Search venues by name, city, or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-3 bg-white/10 border-white/20 text-white placeholder-gray-300 focus:bg-white/20"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Controls */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-semibold">
              {filteredVenues.length} Venues Found
            </h2>
            {searchTerm && (
              <Badge variant="outline" className="border-gray-600 text-gray-300">
                "{searchTerm}"
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === "grid" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("grid")}
              className={viewMode === "grid" ? "bg-green-600" : "border-gray-600"}
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("list")}
              className={viewMode === "list" ? "bg-green-600" : "border-gray-600"}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Venues Grid/List */}
        {filteredVenues.length === 0 ? (
          <div className="text-center py-16">
            <Building2 className="h-16 w-16 text-gray-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-300 mb-2">No venues found</h3>
            <p className="text-gray-400">
              {searchTerm 
                ? `No venues match "${searchTerm}". Try a different search term.`
                : "No venues are currently available."
              }
            </p>
          </div>
        ) : (
          <div className={
            viewMode === "grid" 
              ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              : "space-y-4"
          }>
            {filteredVenues.map((venue) => (
              <Card
                key={venue.id}
                className="bg-gray-800 border-gray-700 hover:border-green-500/50 transition-colors cursor-pointer group"
                onClick={() => handleVenueClick(venue)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src="" />
                        <AvatarFallback className="bg-green-600 text-white text-lg">
                          {venue.venue_name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg text-white group-hover:text-green-400 transition-colors truncate">
                          {venue.venue_name}
                        </CardTitle>
                        {venue.city && venue.state && (
                          <div className="flex items-center gap-1 text-sm text-gray-400 mt-1">
                            <MapPin className="h-3 w-3" />
                            <span>{venue.city}, {venue.state}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0">
                  <p className="text-gray-300 text-sm mb-4 line-clamp-2">
                    {venue.description || "No description available."}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm text-gray-400">
                      {venue.capacity && (
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          <span>{venue.capacity.toLocaleString()}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 text-yellow-400" />
                        <span>4.5</span>
                      </div>
                    </div>
                    
                    <div className="flex gap-1">
                      {venue.venue_types.slice(0, 2).map((type) => (
                        <Badge key={type} variant="secondary" className="bg-green-600/20 text-green-400 border-green-600/30 text-xs">
                          {type}
                        </Badge>
                      ))}
                      {venue.venue_types.length > 2 && (
                        <Badge variant="outline" className="border-gray-600 text-gray-400 text-xs">
                          +{venue.venue_types.length - 2}
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <Button 
                    className="w-full mt-4 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleVenueClick(venue)
                    }}
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    View Venue
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}








