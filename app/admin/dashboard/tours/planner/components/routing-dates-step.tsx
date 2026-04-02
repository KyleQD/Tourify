"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Building2, 
  Route, 
  Plus, 
  Trash2,
  Search,
  Loader2
} from "lucide-react"
import { formatSafeDate } from "@/lib/events/admin-event-normalization"
import { formatSafeNumber } from "@/lib/format/number-format"

interface RoutingDatesStepProps {
  tourData: {
    startDate: string
    endDate: string
    route: Array<{
      city: string
      venue: string
      date: string
      coordinates: { lat: number; lng: number }
    }>
  }
  updateTourData: (updates: any) => void
}

export function RoutingDatesStep({ tourData, updateTourData }: RoutingDatesStepProps) {
  const [newRouteItem, setNewRouteItem] = useState({
    city: "",
    venue: "",
    date: ""
  })
  const [venues, setVenues] = useState<any[]>([])
  const [isLoadingVenues, setIsLoadingVenues] = useState(false)
  const [venueSearchQuery, setVenueSearchQuery] = useState("")
  const [showVenueBrowser, setShowVenueBrowser] = useState(false)

  // Fetch real venues from database
  const fetchVenues = async (searchQuery?: string) => {
    setIsLoadingVenues(true)
    try {
      const params = new URLSearchParams()
      if (searchQuery) params.append('query', searchQuery)
      params.append('limit', '50')
      
      const response = await fetch(`/api/venues?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        setVenues(data.venues || [])
      } else {
        console.error('Failed to fetch venues:', response.statusText)
        setVenues([])
      }
    } catch (error) {
      console.error('Error fetching venues:', error)
      setVenues([])
    } finally {
      setIsLoadingVenues(false)
    }
  }

  // Load venues on component mount
  useEffect(() => {
    fetchVenues()
  }, [])

  // Search venues when query changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchVenues(venueSearchQuery)
    }, 300)
    return () => clearTimeout(timeoutId)
  }, [venueSearchQuery])

  const handleAddRouteItem = () => {
    if (newRouteItem.city && newRouteItem.venue && newRouteItem.date) {
      const routeItem = {
        ...newRouteItem,
        coordinates: { lat: 0, lng: 0 } // Would be set by map integration
      }
      updateTourData({
        route: [...tourData.route, routeItem]
      })
      setNewRouteItem({ city: "", venue: "", date: "" })
    }
  }

  const handleRemoveRouteItem = (index: number) => {
    const updatedRoute = tourData.route.filter((_, i) => i !== index)
    updateTourData({ route: updatedRoute })
  }

  const handleDateChange = (field: string, value: string) => {
    updateTourData({ [field]: value })
  }

  const handleVenueSelect = (venue: any) => {
    setNewRouteItem({
      city: venue.city || "",
      venue: venue.venue_name,
      date: newRouteItem.date
    })
    setShowVenueBrowser(false)
  }

  return (
    <div className="space-y-6">
      {/* Tour Dates */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="start-date" className="text-white font-medium">
            Tour Start Date *
          </Label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500 w-4 h-4" />
            <Input
              id="start-date"
              type="date"
              value={tourData.startDate}
              onChange={(e) => handleDateChange("startDate", e.target.value)}
              className="bg-slate-900/50 border-slate-700 text-white pl-10"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="end-date" className="text-white font-medium">
            Tour End Date *
          </Label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500 w-4 h-4" />
            <Input
              id="end-date"
              type="date"
              value={tourData.endDate}
              onChange={(e) => handleDateChange("endDate", e.target.value)}
              className="bg-slate-900/50 border-slate-700 text-white pl-10"
            />
          </div>
        </div>
      </div>

      {/* Route Planning */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Route className="w-5 h-5 text-purple-400" />
          <h3 className="text-lg font-semibold text-white">Tour Route</h3>
        </div>

        {/* Add New Route Item */}
        <Card className="p-4 bg-slate-900/30 border-slate-700">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-white text-sm">City</Label>
              <Input
                placeholder="Enter city..."
                value={newRouteItem.city}
                onChange={(e) => setNewRouteItem({ ...newRouteItem, city: e.target.value })}
                className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-500"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-white text-sm">Venue</Label>
              <div className="flex space-x-2">
                <Input
                  placeholder="Enter venue or browse..."
                  value={newRouteItem.venue}
                  onChange={(e) => setNewRouteItem({ ...newRouteItem, venue: e.target.value })}
                  className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-500"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowVenueBrowser(true)}
                  className="border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  <Search className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-white text-sm">Date</Label>
              <Input
                type="date"
                value={newRouteItem.date}
                onChange={(e) => setNewRouteItem({ ...newRouteItem, date: e.target.value })}
                className="bg-slate-800/50 border-slate-600 text-white"
              />
            </div>
          </div>
          <Button
            onClick={handleAddRouteItem}
            disabled={!newRouteItem.city || !newRouteItem.venue || !newRouteItem.date}
            className="mt-4 bg-purple-600 hover:bg-purple-700 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add to Route
          </Button>
        </Card>

        {/* Route List */}
        <div className="space-y-3">
          {tourData.route.map((item, index) => (
            <Card key={index} className="p-4 bg-slate-900/30 border-slate-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-500/20 border border-purple-500/40">
                    <span className="text-sm font-medium text-purple-400">{index + 1}</span>
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <MapPin className="w-4 h-4 text-slate-400" />
                      <span className="font-medium text-white">{item.city}</span>
                    </div>
                    <div className="flex items-center space-x-2 mt-1">
                      <Building2 className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-300">{item.venue}</span>
                    </div>
                    <div className="flex items-center space-x-2 mt-1">
                      <Clock className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-300">{formatSafeDate(item.date)}</span>
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveRouteItem(index)}
                  className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>

        {/* Route Map Placeholder */}
        {tourData.route.length > 0 && (
          <Card className="p-6 bg-slate-900/30 border-slate-700">
            <div className="flex items-center space-x-2 mb-4">
              <MapPin className="w-5 h-5 text-purple-400" />
              <h4 className="text-white font-medium">Tour Route Map</h4>
            </div>
            <div className="h-64 bg-slate-800/50 rounded-lg border border-slate-700 flex items-center justify-center">
              <div className="text-center">
                <MapPin className="w-12 h-12 text-slate-500 mx-auto mb-2" />
                <p className="text-slate-400">Interactive map visualization</p>
                <p className="text-slate-500 text-sm">Would show route between {tourData.route.length} venues</p>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Quick Venue Suggestions */}
      <div className="space-y-4">
        <h4 className="text-white font-medium">Popular Venues</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {venues.slice(0, 6).map((venue, index) => (
            <Card
              key={venue.id}
              className="p-3 bg-slate-900/30 border-slate-700 hover:border-purple-500/40 cursor-pointer transition-colors"
              onClick={() => {
                setNewRouteItem({
                  city: venue.city || "",
                  venue: venue.venue_name,
                  date: ""
                })
              }}
            >
              <div className="space-y-1">
                <div className="font-medium text-white">{venue.venue_name}</div>
                <div className="text-sm text-slate-400">{venue.city}, {venue.state}</div>
                <Badge variant="secondary" className="text-xs">
                  {venue.capacity ? `${formatSafeNumber(venue.capacity)} capacity` : 'Capacity TBD'}
                </Badge>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Venue Browser Modal */}
      {showVenueBrowser && (
        <VenueBrowser
          venues={venues}
          isLoading={isLoadingVenues}
          searchQuery={venueSearchQuery}
          onSearchChange={setVenueSearchQuery}
          onSelect={handleVenueSelect}
          onClose={() => setShowVenueBrowser(false)}
        />
      )}

      {/* Validation Status */}
      <div className="flex items-center space-x-2 text-sm">
        {tourData.startDate && tourData.endDate && tourData.route.length > 0 ? (
          <>
            <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-white" />
            </div>
            <span className="text-green-400">Route planning completed</span>
          </>
        ) : (
          <>
            <div className="w-4 h-4 rounded-full border-2 border-slate-600" />
            <span className="text-slate-400">Add tour dates and at least one venue to continue</span>
          </>
        )}
      </div>
    </div>
  )
}

// Venue Browser Component
function VenueBrowser({ 
  venues, 
  isLoading, 
  searchQuery, 
  onSearchChange, 
  onSelect, 
  onClose 
}: {
  venues: any[]
  isLoading: boolean
  searchQuery: string
  onSearchChange: (query: string) => void
  onSelect: (venue: any) => void
  onClose: () => void
}) {
  const [selectedVenue, setSelectedVenue] = useState<any>(null)

  const filteredVenues = venues.filter(venue =>
    venue.venue_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (venue.description && venue.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (venue.city && venue.city.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (venue.venue_types && venue.venue_types.some((type: string) => 
      type.toLowerCase().includes(searchQuery.toLowerCase())
    ))
  )

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="w-full max-w-6xl max-h-[90vh] bg-slate-900 rounded-xl border border-slate-700 overflow-hidden">
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-white">Choose Venue</h3>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <div className="w-5 h-5">×</div>
            </Button>
          </div>
          <div className="relative">
            <Input
              placeholder="Search venues by name, location, or type..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="bg-slate-800 border-slate-700 text-white pl-10"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          </div>
        </div>

        <div className="flex h-[600px]">
          {/* Venue List */}
          <div className="w-1/2 p-4 border-r border-slate-700 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
              </div>
            ) : (
              <div className="space-y-3">
                {filteredVenues.map((venue) => (
                  <Card
                    key={venue.id}
                    className={`cursor-pointer transition-all duration-200 ${
                      selectedVenue?.id === venue.id
                        ? "border-purple-500 bg-purple-500/10"
                        : "border-slate-700 hover:border-slate-600 bg-slate-800/50"
                    }`}
                    onClick={() => setSelectedVenue(venue)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-white">{venue.venue_name}</h4>
                        <Badge 
                          variant="outline" 
                          className="text-xs border-green-500/50 text-green-400"
                        >
                          Available
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-400 mb-2">
                        {[venue.address, venue.city, venue.state].filter(Boolean).join(', ')}
                      </p>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-300">
                          {venue.venue_types?.join(', ') || 'Venue'}
                        </span>
                        <span className="text-slate-300">
                          {venue.capacity ? `${formatSafeNumber(venue.capacity)} capacity` : 'Capacity TBD'}
                        </span>
                      </div>
                      {venue.description && (
                        <div className="mt-2 text-sm text-slate-400 line-clamp-2">
                          {venue.description}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Venue Details */}
          <div className="w-1/2 p-4">
            {selectedVenue ? (
              <div className="space-y-4">
                <div>
                  <h4 className="text-lg font-bold text-white mb-2">{selectedVenue.venue_name}</h4>
                  <p className="text-slate-400">
                    {[selectedVenue.address, selectedVenue.city, selectedVenue.state].filter(Boolean).join(', ')}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label className="text-slate-400">Type</Label>
                    <p className="text-white">{selectedVenue.venue_types?.join(', ') || 'Venue'}</p>
                  </div>
                  <div>
                    <Label className="text-slate-400">Capacity</Label>
                    <p className="text-white">
                      {selectedVenue.capacity ? `${formatSafeNumber(selectedVenue.capacity)}` : 'Capacity TBD'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-slate-400">Status</Label>
                    <p className="text-white">Available</p>
                  </div>
                  <div>
                    <Label className="text-slate-400">Location</Label>
                    <p className="text-white">{selectedVenue.city}, {selectedVenue.state}</p>
                  </div>
                </div>

                {selectedVenue.description && (
                  <div>
                    <Label className="text-slate-400">Description</Label>
                    <p className="text-white text-sm">{selectedVenue.description}</p>
                  </div>
                )}

                <Button
                  onClick={() => onSelect(selectedVenue)}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                >
                  Select This Venue
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <MapPin className="h-16 w-16 text-slate-500 mx-auto mb-4" />
                  <p className="text-slate-400">Select a venue to view details</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 