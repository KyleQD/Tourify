"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { UserCard } from "../user-card"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { useSocial } from "@/contexts/social-context"
import { useDebounce } from "@/hooks/use-debounce"
import { Search, Users, MapPin, Briefcase } from "lucide-react"
import { paginateArray } from "@/lib/venue/pagination-service"
import { getAllLocations, getAllTitles } from "@/lib/venue/search-service"

export function IndustryDirectory() {
  const { } = useSocial()
  const [users] = useState<any[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("all")
  const [location, setLocation] = useState("")
  const [role, setRole] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [filteredUsers, setFilteredUsers] = useState<any[]>([])
  const [paginatedUsers, setPaginatedUsers] = useState<any[]>([])
  const [totalPages, setTotalPages] = useState(1)
  const debouncedSearchQuery = useDebounce(searchQuery, 300)

  const itemsPerPage = 10
  const availableLocations = getAllLocations()
  const availableTitles = getAllTitles()

  // Filter users based on search query and filters
  useEffect(() => {
    if (!loadingUsers) {
      let results = users.filter(user => 
        user.fullName?.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        user.title?.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        user.location?.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
      )

      // Apply tab filter
      if (activeTab === "tour-managers") {
        results = results.filter((user) => user.title.toLowerCase().includes("tour manager"))
      } else if (activeTab === "sound-engineers") {
        results = results.filter((user) => user.title.toLowerCase().includes("sound engineer"))
      } else if (activeTab === "event-producers") {
        results = results.filter((user) => user.title.toLowerCase().includes("event producer"))
      } else if (activeTab === "venue-managers") {
        results = results.filter((user) => user.title.toLowerCase().includes("venue manager"))
      }

      // Apply location filter
      if (location) {
        results = results.filter((user) => user.location === location)
      }

      // Apply role filter
      if (role) {
        results = results.filter((user) => user.title === role)
      }

      setFilteredUsers(results)
      setCurrentPage(1)
    }
  }, [debouncedSearchQuery, activeTab, location, role, loadingUsers, users])

  // Paginate filtered users
  useEffect(() => {
    const result = paginateArray(filteredUsers, {
      page: currentPage,
      limit: itemsPerPage,
    })

    setPaginatedUsers(result.data)
    setTotalPages(result.pagination.totalPages)
  }, [filteredUsers, currentPage])

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const handleClearFilters = () => {
    setSearchQuery("")
    setLocation("")
    setRole("")
    setActiveTab("all")
  }

  if (loadingUsers) {
    return (
      <div className="flex justify-center items-center h-60">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="bg-gray-900 text-white border-gray-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-md flex items-center">
            <Users className="h-4 w-4 mr-2 text-purple-400" />
            Industry Directory
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4" />
            <Input
              placeholder="Search by name, username, or title"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-gray-800 border-gray-700 text-white"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Select value={location} onValueChange={setLocation}>
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                  <div className="flex items-center">
                    <MapPin className="h-4 w-4 mr-2 text-gray-500" />
                    <SelectValue placeholder="Filter by location" />
                  </div>
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-gray-700 text-white">
                  <SelectItem value="all">All locations</SelectItem>
                  {availableLocations.map((loc) => (
                    <SelectItem key={loc} value={loc}>
                      {loc}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1">
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                  <div className="flex items-center">
                    <Briefcase className="h-4 w-4 mr-2 text-gray-500" />
                    <SelectValue placeholder="Filter by role" />
                  </div>
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-gray-700 text-white">
                  <SelectItem value="all">All roles</SelectItem>
                  {availableTitles.map((title) => (
                    <SelectItem key={title} value={title}>
                      {title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button variant="outline" className="border-gray-700 text-gray-400" onClick={handleClearFilters}>
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-gray-800">
          <TabsTrigger value="all">All Professionals</TabsTrigger>
          <TabsTrigger value="tour-managers">Tour Managers</TabsTrigger>
          <TabsTrigger value="sound-engineers">Sound Engineers</TabsTrigger>
          <TabsTrigger value="event-producers">Event Producers</TabsTrigger>
          <TabsTrigger value="venue-managers">Venue Managers</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {paginatedUsers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p className="mb-4">No professionals found matching your criteria.</p>
              <Button variant="outline" onClick={handleClearFilters}>
                Clear Filters
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {paginatedUsers.map((user) => (
                  <UserCard key={user.id} user={user} isConnected={false} isPending={false} />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center mt-6">
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="border-gray-700"
                    >
                      Previous
                    </Button>

                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePageChange(page)}
                        className={currentPage === page ? "bg-purple-600" : "border-gray-700"}
                      >
                        {page}
                      </Button>
                    ))}

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="border-gray-700"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
