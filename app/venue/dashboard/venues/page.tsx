"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LoadingSpinner } from "../../../components/loading-spinner"
import { useToast } from "@/hooks/use-toast"
import { motion } from "framer-motion"
import { Search, MapPin, Users, Star, Plus, Filter, Calendar } from "lucide-react"
import { venueDashboardTabListClass } from "@/app/venue/lib/dashboard-ui"

// Mock venues data - in a real app, this would come from an API
const mockVenues = [
  {
    id: "venue-1",
    name: "The Echo Lounge",
    location: "Los Angeles, CA",
    type: "Music Venue",
    capacity: 850,
    rating: 4.8,
    image: "/placeholder.svg?height=200&width=300&text=Echo+Lounge",
    amenities: ["Wi-Fi", "Parking", "ADA Access", "Green Room", "Sound System"],
    upcoming: 3,
  },
  {
    id: "venue-2",
    name: "Skyline Theater",
    location: "New York, NY",
    type: "Performance Hall",
    capacity: 1200,
    rating: 4.6,
    image: "/placeholder.svg?height=200&width=300&text=Skyline+Theater",
    amenities: ["Wi-Fi", "Parking", "ADA Access", "Green Room", "Sound System", "Lighting Rig"],
    upcoming: 5,
  },
  {
    id: "venue-3",
    name: "The Basement",
    location: "Nashville, TN",
    type: "Club Venue",
    capacity: 350,
    rating: 4.5,
    image: "/placeholder.svg?height=200&width=300&text=The+Basement",
    amenities: ["Wi-Fi", "Sound System", "Bar Service"],
    upcoming: 2,
  },
  {
    id: "venue-4",
    name: "Harmony Hall",
    location: "Austin, TX",
    type: "Concert Hall",
    capacity: 750,
    rating: 4.7,
    image: "/placeholder.svg?height=200&width=300&text=Harmony+Hall",
    amenities: ["Wi-Fi", "Parking", "ADA Access", "Green Room", "Sound System", "Catering"],
    upcoming: 4,
  },
  {
    id: "venue-5",
    name: "The Sound Garden",
    location: "Seattle, WA",
    type: "Outdoor Venue",
    capacity: 2000,
    rating: 4.9,
    image: "/placeholder.svg?height=200&width=300&text=Sound+Garden",
    amenities: ["Parking", "ADA Access", "Sound System", "Food Vendors"],
    upcoming: 1,
  },
  {
    id: "venue-6",
    name: "Jazz Corner",
    location: "Chicago, IL",
    type: "Jazz Club",
    capacity: 200,
    rating: 4.4,
    image: "/placeholder.svg?height=200&width=300&text=Jazz+Corner",
    amenities: ["Wi-Fi", "Sound System", "Bar Service", "Food Service"],
    upcoming: 6,
  },
]

export default function VenuesPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [venues, setVenues] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("all")
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState({
    minCapacity: "",
    maxCapacity: "",
    amenities: [] as string[],
  })

  useEffect(() => {
    // In a real app, fetch venues from API
    const loadVenues = async () => {
      setLoading(true)
      try {
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 800))
        setVenues(mockVenues)
      } catch (error) {
        console.error("Error loading venues:", error)
        toast({
          title: "Error",
          description: "Failed to load venues",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    loadVenues()
  }, [toast])

  const handleViewVenue = (id: string) => {
    router.push(`/venues/${id}`)
  }

  const handleCreateVenue = () => {
    router.push("/venues/create")
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
  }

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const toggleAmenityFilter = (amenity: string) => {
    setFilters((prev) => {
      const amenities = [...prev.amenities]
      if (amenities.includes(amenity)) {
        return {
          ...prev,
          amenities: amenities.filter((a) => a !== amenity),
        }
      } else {
        return {
          ...prev,
          amenities: [...amenities, amenity],
        }
      }
    })
  }

  const resetFilters = () => {
    setFilters({
      minCapacity: "",
      maxCapacity: "",
      amenities: [],
    })
  }

  // Filter venues based on search query and filters
  const filteredVenues = venues.filter((venue) => {
    // Search filter
    if (
      searchQuery &&
      !venue.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !venue.location.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !venue.type.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false
    }

    // Tab filter
    if (activeTab === "featured" && venue.rating < 4.7) {
      return false
    }

    // Capacity filter
    if (filters.minCapacity && venue.capacity < Number.parseInt(filters.minCapacity)) {
      return false
    }
    if (filters.maxCapacity && venue.capacity > Number.parseInt(filters.maxCapacity)) {
      return false
    }

    // Amenities filter
    if (filters.amenities.length > 0) {
      for (const amenity of filters.amenities) {
        if (!venue.amenities.includes(amenity)) {
          return false
        }
      }
    }

    return true
  })

  // All unique amenities across venues
  const allAmenities = Array.from(new Set(venues.flatMap((venue) => venue.amenities)))

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-200px)]">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Venues</h1>
          <p className="text-gray-400">Find and book the perfect venue for your event</p>
        </div>

        <Button onClick={handleCreateVenue} className="bg-purple-600 hover:bg-purple-700">
          <Plus className="h-4 w-4 mr-2" /> Create Venue
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search venues by name, location, or type..."
            className="pl-10 bg-gray-800 border-gray-700"
            value={searchQuery}
            onChange={handleSearchChange}
          />
        </div>

        <Button variant="outline" className="border-gray-700" onClick={() => setShowFilters(!showFilters)}>
          <Filter className="h-4 w-4 mr-2" /> Filters
        </Button>
      </div>

      {showFilters && (
        <Card className="bg-gray-900 border-gray-800 mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Capacity</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs text-gray-400">Min</label>
                    <Input
                      name="minCapacity"
                      type="number"
                      placeholder="Min capacity"
                      className="bg-gray-800 border-gray-700"
                      value={filters.minCapacity}
                      onChange={handleFilterChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-gray-400">Max</label>
                    <Input
                      name="maxCapacity"
                      type="number"
                      placeholder="Max capacity"
                      className="bg-gray-800 border-gray-700"
                      value={filters.maxCapacity}
                      onChange={handleFilterChange}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4 md:col-span-2">
                <h3 className="text-sm font-medium">Amenities</h3>
                <div className="flex flex-wrap gap-2">
                  {allAmenities.map((amenity) => (
                    <Badge
                      key={amenity}
                      variant={filters.amenities.includes(amenity) ? "default" : "outline"}
                      className={`cursor-pointer ${
                        filters.amenities.includes(amenity)
                          ? "bg-purple-600 hover:bg-purple-700"
                          : "border-gray-700 hover:border-gray-600"
                      }`}
                      onClick={() => toggleAmenityFilter(amenity)}
                    >
                      {amenity}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <Button variant="outline" className="border-gray-700 mr-2" onClick={resetFilters}>
                Reset Filters
              </Button>
              <Button className="bg-purple-600 hover:bg-purple-700" onClick={() => setShowFilters(false)}>
                Apply Filters
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className={venueDashboardTabListClass}>
          <TabsTrigger value="all">All Venues</TabsTrigger>
          <TabsTrigger value="featured">Featured</TabsTrigger>
          <TabsTrigger value="nearby">Nearby</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {filteredVenues.length === 0 ? (
            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="pt-6 text-center">
                <h2 className="text-xl font-bold mb-2">No Venues Found</h2>
                <p className="text-gray-400 mb-4">Try adjusting your search or filters to find venues.</p>
                <Button onClick={resetFilters}>Reset Filters</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredVenues.map((venue) => (
                <motion.div
                  key={venue.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  whileHover={{ scale: 1.02 }}
                >
                  <Card
                    className="bg-gray-900 border-gray-800 overflow-hidden h-full flex flex-col cursor-pointer"
                    onClick={() => handleViewVenue(venue.id)}
                  >
                    <div className="h-40 relative">
                      <img
                        src={venue.image || "/placeholder.svg"}
                        alt={venue.name}
                        className="w-full h-full object-cover"
                      />
                      <Badge className="absolute top-2 right-2 bg-purple-600">{venue.type}</Badge>
                    </div>

                    <CardContent className="flex-1 p-4">
                      <h3 className="text-lg font-bold">{venue.name}</h3>
                      <div className="flex items-center text-sm text-gray-400 mt-1">
                        <MapPin className="h-3 w-3 mr-1" />
                        {venue.location}
                      </div>

                      <div className="flex items-center mt-2">
                        <Star className="h-4 w-4 text-yellow-500 mr-1" />
                        <span className="font-medium">{venue.rating}</span>
                      </div>

                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center text-sm">
                          <Users className="h-3 w-3 mr-1 text-gray-400" />
                          <span>{venue.capacity} capacity</span>
                        </div>

                        <div className="flex items-center text-sm">
                          <Calendar className="h-3 w-3 mr-1 text-gray-400" />
                          <span>{venue.upcoming} upcoming</span>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-1">
                        {venue.amenities.slice(0, 3).map((amenity: string) => (
                          <Badge key={amenity} variant="outline" className="text-xs border-gray-700">
                            {amenity}
                          </Badge>
                        ))}
                        {venue.amenities.length > 3 && (
                          <Badge variant="outline" className="text-xs border-gray-700">
                            +{venue.amenities.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </CardContent>

                    <CardFooter className="pt-0 pb-4 px-4">
                      <Button className="w-full bg-purple-600 hover:bg-purple-700">View Details</Button>
                    </CardFooter>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
