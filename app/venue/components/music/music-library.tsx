"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  Music,
  Play,
  Pause,
  MoreHorizontal,
  Edit,
  Trash,
  Share2,
  Download,
  BarChart3,
  Search,
  Filter,
  Grid,
  ListIcon,
  Calendar,
  Clock,
  Heart,
  Headphones,
} from "lucide-react"
import { formatSafeNumber } from "@/lib/format/number-format"
import Image from "next/image"
import { formatSafeDate } from "@/lib/events/admin-event-normalization"

export function MusicLibrary() {
  const [view, setView] = useState<"grid" | "list">("grid")
  const [filter, setFilter] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null)

  // Mock data for music library
  const musicLibrary = [
    {
      id: "album-1",
      type: "album",
      title: "Midnight Sessions",
      artist: "Your Artist Name",
      releaseDate: "2025-03-15",
      coverArt: "/placeholder.svg?height=300&width=300&text=Midnight+Sessions",
      trackCount: 12,
      duration: "48:32",
      plays: 1250,
      likes: 342,
      genre: "Electronic",
    },
    {
      id: "single-1",
      type: "single",
      title: "Summer Vibes",
      artist: "Your Artist Name",
      releaseDate: "2025-02-10",
      coverArt: "/placeholder.svg?height=300&width=300&text=Summer+Vibes",
      trackCount: 1,
      duration: "3:45",
      plays: 2500,
      likes: 520,
      genre: "Pop",
    },
    {
      id: "ep-1",
      type: "ep",
      title: "Acoustic Sessions",
      artist: "Your Artist Name",
      releaseDate: "2025-01-05",
      coverArt: "/placeholder.svg?height=300&width=300&text=Acoustic+Sessions",
      trackCount: 5,
      duration: "18:20",
      plays: 980,
      likes: 210,
      genre: "Acoustic",
    },
    {
      id: "single-2",
      type: "single",
      title: "Night Drive",
      artist: "Your Artist Name",
      releaseDate: "2024-12-20",
      coverArt: "/placeholder.svg?height=300&width=300&text=Night+Drive",
      trackCount: 1,
      duration: "4:12",
      plays: 1800,
      likes: 380,
      genre: "Electronic",
    },
  ]

  // Filter music based on type and search query
  const filteredMusic = musicLibrary.filter((item) => {
    const matchesFilter = filter === "all" || item.type === filter
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.artist.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesFilter && matchesSearch
  })

  // Format date
  const formatDate = (dateString: string) => {
    return formatSafeDate(dateString)
  }

  // Toggle play/pause
  const togglePlay = (id: string) => {
    if (currentlyPlaying === id) {
      setCurrentlyPlaying(null)
    } else {
      setCurrentlyPlaying(id)
    }
  }

  return (
    <div className="space-y-6">
      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <Tabs defaultValue={filter} value={filter} onValueChange={setFilter} className="w-full sm:w-auto">
          <TabsList className="bg-gray-800">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="album">Albums</TabsTrigger>
            <TabsTrigger value="ep">EPs</TabsTrigger>
            <TabsTrigger value="single">Singles</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search your music..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 bg-gray-800 border-gray-700"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="border-gray-700">
                <Filter className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-gray-800 border-gray-700">
              <DropdownMenuItem>Sort by Date</DropdownMenuItem>
              <DropdownMenuItem>Sort by Title</DropdownMenuItem>
              <DropdownMenuItem>Sort by Plays</DropdownMenuItem>
              <DropdownMenuItem>Sort by Popularity</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="flex border rounded-md overflow-hidden border-gray-700">
            <Button
              variant={view === "grid" ? "default" : "ghost"}
              size="icon"
              className={view === "grid" ? "" : "bg-gray-800"}
              onClick={() => setView("grid")}
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={view === "list" ? "default" : "ghost"}
              size="icon"
              className={view === "list" ? "" : "bg-gray-800"}
              onClick={() => setView("list")}
            >
              <ListIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Music Library */}
      {filteredMusic.length === 0 ? (
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-6 text-center">
            <Music className="h-12 w-12 mx-auto text-gray-500 mb-4" />
            <h3 className="text-lg font-medium mb-2">No music found</h3>
            <p className="text-gray-400 mb-4">
              {searchQuery ? `No results found for "${searchQuery}"` : "You haven't uploaded any music yet"}
            </p>
            <Button>Upload Music</Button>
          </CardContent>
        </Card>
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredMusic.map((item) => (
            <Card key={item.id} className="bg-gray-900 border-gray-800 overflow-hidden">
              <CardContent className="p-0">
                <div className="relative group">
                  <Image
                    src={item.coverArt || "/placeholder.svg"}
                    alt={item.title}
                    width={300}
                    height={300}
                    className="w-full aspect-square object-cover"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="secondary"
                      size="icon"
                      className="rounded-full h-12 w-12"
                      onClick={() => togglePlay(item.id)}
                    >
                      {currentlyPlaying === item.id ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
                    </Button>
                  </div>
                  <Badge
                    className="absolute top-2 right-2 capitalize"
                    variant={item.type === "album" ? "default" : item.type === "ep" ? "secondary" : "outline"}
                  >
                    {item.type}
                  </Badge>
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <h3 className="font-medium truncate">{item.title}</h3>
                      <p className="text-sm text-gray-400 truncate">{item.artist}</p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="bg-gray-800 border-gray-700">
                        <DropdownMenuItem className="flex items-center">
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem className="flex items-center">
                          <Share2 className="h-4 w-4 mr-2" />
                          Share
                        </DropdownMenuItem>
                        <DropdownMenuItem className="flex items-center">
                          <BarChart3 className="h-4 w-4 mr-2" />
                          Analytics
                        </DropdownMenuItem>
                        <DropdownMenuItem className="flex items-center">
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </DropdownMenuItem>
                        <DropdownMenuItem className="flex items-center text-red-500">
                          <Trash className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
                    <div className="flex items-center">
                      <Music className="h-3 w-3 mr-1" />
                      <span>{item.trackCount} tracks</span>
                    </div>
                    <div className="flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      <span>{item.duration}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
                    <div className="flex items-center">
                      <Calendar className="h-3 w-3 mr-1" />
                      <span>{formatDate(item.releaseDate)}</span>
                    </div>
                    <div className="flex items-center">
                      <Headphones className="h-3 w-3 mr-1" />
                      <span>{formatSafeNumber(item.plays)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredMusic.map((item) => (
            <Card key={item.id} className="bg-gray-900 border-gray-800">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="relative h-16 w-16 flex-shrink-0 group">
                    <Image
                      src={item.coverArt || "/placeholder.svg"}
                      alt={item.title}
                      width={64}
                      height={64}
                      className="rounded-md object-cover"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-md">
                      <Button
                        variant="secondary"
                        size="icon"
                        className="rounded-full h-8 w-8"
                        onClick={() => togglePlay(item.id)}
                      >
                        {currentlyPlaying === item.id ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">{item.title}</h3>
                        <p className="text-sm text-gray-400">{item.artist}</p>
                      </div>
                      <Badge
                        className="capitalize"
                        variant={item.type === "album" ? "default" : item.type === "ep" ? "secondary" : "outline"}
                      >
                        {item.type}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-gray-400">
                      <div className="flex items-center">
                        <Music className="h-3 w-3 mr-1" />
                        <span>{item.trackCount} tracks</span>
                      </div>
                      <div className="flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        <span>{item.duration}</span>
                      </div>
                      <div className="flex items-center">
                        <Calendar className="h-3 w-3 mr-1" />
                        <span>{formatDate(item.releaseDate)}</span>
                      </div>
                      <div className="flex items-center">
                        <Headphones className="h-3 w-3 mr-1" />
                        <span>{formatSafeNumber(item.plays)} plays</span>
                      </div>
                      <div className="flex items-center">
                        <Heart className="h-3 w-3 mr-1" />
                        <span>{formatSafeNumber(item.likes)} likes</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="border-gray-700">
                      <Share2 className="h-4 w-4 mr-2" />
                      Share
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="bg-gray-800 border-gray-700">
                        <DropdownMenuItem className="flex items-center">
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem className="flex items-center">
                          <BarChart3 className="h-4 w-4 mr-2" />
                          Analytics
                        </DropdownMenuItem>
                        <DropdownMenuItem className="flex items-center">
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </DropdownMenuItem>
                        <DropdownMenuItem className="flex items-center text-red-500">
                          <Trash className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
