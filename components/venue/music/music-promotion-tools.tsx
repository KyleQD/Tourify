"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import { formatSafeNumber } from "@/lib/format/number-format"
import {
  Share2,
  Globe,
  Facebook,
  Twitter,
  Instagram,
  Copy,
  Check,
  Calendar,
  Clock,
  Music,
  BarChart3,
  DollarSign,
  Users,
  Radio,
  Mail,
  Sparkles,
  Headphones,
} from "lucide-react"
import Image from "next/image"

export function MusicPromotionTools() {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState("share")
  const [copied, setCopied] = useState(false)
  const [selectedRelease, setSelectedRelease] = useState("")
  const [promotionBudget, setPromotionBudget] = useState("50")

  // Mock data for releases
  const releases = [
    {
      id: "album-1",
      title: "Midnight Sessions",
      type: "Album",
      coverArt: "/placeholder.svg?height=300&width=300&text=Midnight+Sessions",
    },
    {
      id: "ep-1",
      title: "Acoustic Sessions",
      type: "EP",
      coverArt: "/placeholder.svg?height=300&width=300&text=Acoustic+Sessions",
    },
    {
      id: "single-1",
      title: "Summer Vibes",
      type: "Single",
      coverArt: "/placeholder.svg?height=300&width=300&text=Summer+Vibes",
    },
    {
      id: "single-2",
      title: "Night Drive",
      type: "Single",
      coverArt: "/placeholder.svg?height=300&width=300&text=Night+Drive",
    },
  ]

  // Mock data for playlists
  const playlists = [
    {
      id: "playlist-1",
      name: "Indie Discoveries",
      curator: "Playlist Master",
      followers: 15000,
      genre: "Indie",
      image: "/placeholder.svg?height=60&width=60&text=Indie+Discoveries",
      fee: 25,
    },
    {
      id: "playlist-2",
      name: "Electronic Vibes",
      curator: "EDM Curator",
      followers: 28000,
      genre: "Electronic",
      image: "/placeholder.svg?height=60&width=60&text=Electronic+Vibes",
      fee: 40,
    },
    {
      id: "playlist-3",
      name: "Chill Beats",
      curator: "Chill Music",
      followers: 45000,
      genre: "Lo-fi",
      image: "/placeholder.svg?height=60&width=60&text=Chill+Beats",
      fee: 50,
    },
    {
      id: "playlist-4",
      name: "New Music Friday",
      curator: "Fresh Tunes",
      followers: 32000,
      genre: "Various",
      image: "/placeholder.svg?height=60&width=60&text=New+Music+Friday",
      fee: 35,
    },
  ]

  // Mock data for radio stations
  const radioStations = [
    {
      id: "radio-1",
      name: "Indie 105.5",
      location: "Los Angeles, CA",
      listeners: "120K",
      genre: "Indie",
      image: "/placeholder.svg?height=60&width=60&text=Indie+105.5",
      contactEmail: "submissions@indie1055.com",
    },
    {
      id: "radio-2",
      name: "Electronic Beats 98.7",
      location: "New York, NY",
      listeners: "200K",
      genre: "Electronic",
      image: "/placeholder.svg?height=60&width=60&text=Electronic+Beats",
      contactEmail: "music@eb987.com",
    },
    {
      id: "radio-3",
      name: "Chill FM 101.3",
      location: "Miami, FL",
      listeners: "85K",
      genre: "Lo-fi/Chill",
      image: "/placeholder.svg?height=60&width=60&text=Chill+FM",
      contactEmail: "submissions@chillfm.com",
    },
  ]

  // Handle copy link
  const handleCopyLink = () => {
    navigator.clipboard.writeText("https://tourify.com/music/album-1")
    setCopied(true)
    toast({
      title: "Link copied",
      description: "Share link has been copied to clipboard",
    })
    setTimeout(() => setCopied(false), 2000)
  }

  // Handle share on social media
  const handleShareSocial = (platform: string) => {
    toast({
      title: `Shared on ${platform}`,
      description: `Your music has been shared on ${platform}`,
    })
  }

  // Handle playlist submission
  const handlePlaylistSubmission = (playlistId: string) => {
    toast({
      title: "Submission sent",
      description: "Your music has been submitted to the playlist curator",
    })
  }

  // Handle radio submission
  const handleRadioSubmission = (radioId: string) => {
    toast({
      title: "Submission prepared",
      description: "Email template has been created for radio submission",
    })
  }

  // Handle promotion campaign
  const handlePromotionCampaign = () => {
    if (!selectedRelease) {
      toast({
        title: "Please select a release",
        description: "You need to select a release to promote",
        variant: "destructive",
      })
      return
    }

    toast({
      title: "Promotion campaign created",
      description: `Your campaign has been created with a budget of $${promotionBudget}`,
    })
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue={activeTab} value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-gray-800">
          <TabsTrigger value="share" className="flex items-center">
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </TabsTrigger>
          <TabsTrigger value="playlists" className="flex items-center">
            <Music className="h-4 w-4 mr-2" />
            Playlists
          </TabsTrigger>
          <TabsTrigger value="radio" className="flex items-center">
            <Radio className="h-4 w-4 mr-2" />
            Radio
          </TabsTrigger>
          <TabsTrigger value="promote" className="flex items-center">
            <Sparkles className="h-4 w-4 mr-2" />
            Promote
          </TabsTrigger>
        </TabsList>

        <TabsContent value="share" className="mt-6">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle>Share Your Music</CardTitle>
              <CardDescription>Share your music on social media and with your audience</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Release Selection */}
              <div className="space-y-4">
                <Label>Select a release to share</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  {releases.map((release) => (
                    <Card
                      key={release.id}
                      className={`bg-gray-800 border-gray-700 cursor-pointer transition-all ${
                        selectedRelease === release.id ? "ring-2 ring-purple-500" : ""
                      }`}
                      onClick={() => setSelectedRelease(release.id)}
                    >
                      <CardContent className="p-3">
                        <div className="aspect-square relative mb-2">
                          <Image
                            src={release.coverArt || "/placeholder.svg"}
                            alt={release.title}
                            fill
                            className="object-cover rounded-md"
                          />
                        </div>
                        <h3 className="font-medium truncate">{release.title}</h3>
                        <p className="text-xs text-gray-400">{release.type}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              <Separator className="bg-gray-800" />

              {/* Share Options */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Share Options</h3>

                {/* Copy Link */}
                <div className="flex items-center space-x-2">
                  <div className="relative flex-1">
                    <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      value="https://tourify.com/music/album-1"
                      readOnly
                      className="pl-10 pr-20 bg-gray-800 border-gray-700"
                      onChange={() => {}}
                    />
                    <Button
                      className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8"
                      size="sm"
                      onClick={handleCopyLink}
                    >
                      {copied ? (
                        <>
                          <Check className="h-4 w-4 mr-1" /> Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4 mr-1" /> Copy
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Social Media Sharing */}
                <div className="space-y-2">
                  <Label>Share on social media</Label>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      className="border-blue-600 text-blue-500 hover:bg-blue-600/10"
                      onClick={() => handleShareSocial("Facebook")}
                    >
                      <Facebook className="h-4 w-4 mr-2" />
                      Facebook
                    </Button>
                    <Button
                      variant="outline"
                      className="border-sky-500 text-sky-500 hover:bg-sky-500/10"
                      onClick={() => handleShareSocial("Twitter")}
                    >
                      <Twitter className="h-4 w-4 mr-2" />
                      Twitter
                    </Button>
                    <Button
                      variant="outline"
                      className="border-pink-600 text-pink-500 hover:bg-pink-600/10"
                      onClick={() => handleShareSocial("Instagram")}
                    >
                      <Instagram className="h-4 w-4 mr-2" />
                      Instagram
                    </Button>
                  </div>
                </div>

                {/* Customized Message */}
                <div className="space-y-2">
                  <Label>Customized message</Label>
                  <Textarea
                    placeholder="Check out my new release!"
                    className="bg-gray-800 border-gray-700 min-h-[100px]"
                  />
                </div>

                {/* Schedule Post */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="schedule-post">Schedule post</Label>
                    <Switch id="schedule-post" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <Input type="date" className="bg-gray-800 border-gray-700" />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <Input type="time" className="bg-gray-800 border-gray-700" />
                    </div>
                  </div>
                </div>

                <Button className="w-full">
                  <Share2 className="h-4 w-4 mr-2" />
                  Share Now
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="playlists" className="mt-6">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle>Playlist Submissions</CardTitle>
              <CardDescription>Submit your music to playlists to reach new audiences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Release Selection */}
              <div className="space-y-4">
                <Label>Select a release to submit</Label>
                <Select value={selectedRelease} onValueChange={setSelectedRelease}>
                  <SelectTrigger className="bg-gray-800 border-gray-700">
                    <SelectValue placeholder="Select a release" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    {releases.map((release) => (
                      <SelectItem key={release.id} value={release.id}>
                        {release.title} ({release.type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator className="bg-gray-800" />

              {/* Playlist Submissions */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Available Playlists</h3>
                  <Select defaultValue="all">
                    <SelectTrigger className="w-[180px] bg-gray-800 border-gray-700">
                      <SelectValue placeholder="Filter by genre" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700">
                      <SelectItem value="all">All Genres</SelectItem>
                      <SelectItem value="indie">Indie</SelectItem>
                      <SelectItem value="electronic">Electronic</SelectItem>
                      <SelectItem value="lofi">Lo-fi</SelectItem>
                      <SelectItem value="various">Various</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-4">
                  {playlists.map((playlist) => (
                    <Card key={playlist.id} className="bg-gray-800 border-gray-700">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          <Image
                            src={playlist.image || "/placeholder.svg"}
                            alt={playlist.name}
                            width={60}
                            height={60}
                            className="rounded-md"
                          />
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium">{playlist.name}</h3>
                            <p className="text-sm text-gray-400">Curator: {playlist.curator}</p>
                            <div className="flex items-center mt-1">
                              <Badge variant="outline" className="text-xs mr-2">
                                {playlist.genre}
                              </Badge>
                              <span className="text-xs text-gray-400 flex items-center">
                                <Users className="h-3 w-3 mr-1" />
                                {formatSafeNumber(playlist.followers)} followers
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-green-500">${playlist.fee}</p>
                            <p className="text-xs text-gray-400">Submission fee</p>
                            <Button
                              size="sm"
                              className="mt-2"
                              onClick={() => handlePlaylistSubmission(playlist.id)}
                              disabled={!selectedRelease}
                            >
                              Submit
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="radio" className="mt-6">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle>Radio Submissions</CardTitle>
              <CardDescription>Submit your music to radio stations for airplay</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Release Selection */}
              <div className="space-y-4">
                <Label>Select a release to submit</Label>
                <Select value={selectedRelease} onValueChange={setSelectedRelease}>
                  <SelectTrigger className="bg-gray-800 border-gray-700">
                    <SelectValue placeholder="Select a release" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    {releases.map((release) => (
                      <SelectItem key={release.id} value={release.id}>
                        {release.title} ({release.type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator className="bg-gray-800" />

              {/* Radio Submissions */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Radio Stations</h3>
                  <Select defaultValue="all">
                    <SelectTrigger className="w-[180px] bg-gray-800 border-gray-700">
                      <SelectValue placeholder="Filter by genre" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700">
                      <SelectItem value="all">All Genres</SelectItem>
                      <SelectItem value="indie">Indie</SelectItem>
                      <SelectItem value="electronic">Electronic</SelectItem>
                      <SelectItem value="lofi">Lo-fi/Chill</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-4">
                  {radioStations.map((station) => (
                    <Card key={station.id} className="bg-gray-800 border-gray-700">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          <Image
                            src={station.image || "/placeholder.svg"}
                            alt={station.name}
                            width={60}
                            height={60}
                            className="rounded-md"
                          />
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium">{station.name}</h3>
                            <p className="text-sm text-gray-400">{station.location}</p>
                            <div className="flex items-center mt-1">
                              <Badge variant="outline" className="text-xs mr-2">
                                {station.genre}
                              </Badge>
                              <span className="text-xs text-gray-400 flex items-center">
                                <Headphones className="h-3 w-3 mr-1" />
                                {station.listeners} listeners
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center justify-end mb-2">
                              <Mail className="h-4 w-4 mr-1 text-gray-400" />
                              <p className="text-xs text-gray-400 truncate max-w-[150px]">{station.contactEmail}</p>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => handleRadioSubmission(station.id)}
                              disabled={!selectedRelease}
                            >
                              Prepare Submission
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="promote" className="mt-6">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle>Promotion Campaigns</CardTitle>
              <CardDescription>Create paid promotion campaigns to boost your music</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Release Selection */}
              <div className="space-y-4">
                <Label>Select a release to promote</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  {releases.map((release) => (
                    <Card
                      key={release.id}
                      className={`bg-gray-800 border-gray-700 cursor-pointer transition-all ${
                        selectedRelease === release.id ? "ring-2 ring-purple-500" : ""
                      }`}
                      onClick={() => setSelectedRelease(release.id)}
                    >
                      <CardContent className="p-3">
                        <div className="aspect-square relative mb-2">
                          <Image
                            src={release.coverArt || "/placeholder.svg"}
                            alt={release.title}
                            fill
                            className="object-cover rounded-md"
                          />
                        </div>
                        <h3 className="font-medium truncate">{release.title}</h3>
                        <p className="text-xs text-gray-400">{release.type}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              <Separator className="bg-gray-800" />

              {/* Campaign Settings */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Campaign Settings</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Campaign Goal</Label>
                      <Select defaultValue="streams">
                        <SelectTrigger className="bg-gray-800 border-gray-700">
                          <SelectValue placeholder="Select a goal" />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 border-gray-700">
                          <SelectItem value="streams">Increase Streams</SelectItem>
                          <SelectItem value="followers">Gain Followers</SelectItem>
                          <SelectItem value="awareness">Brand Awareness</SelectItem>
                          <SelectItem value="sales">Drive Sales</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Target Audience</Label>
                      <Select defaultValue="fans">
                        <SelectTrigger className="bg-gray-800 border-gray-700">
                          <SelectValue placeholder="Select audience" />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 border-gray-700">
                          <SelectItem value="fans">Existing Fans</SelectItem>
                          <SelectItem value="similar">Similar Artists' Fans</SelectItem>
                          <SelectItem value="genre">Genre Enthusiasts</SelectItem>
                          <SelectItem value="new">New Listeners</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Campaign Duration</Label>
                      <Select defaultValue="30">
                        <SelectTrigger className="bg-gray-800 border-gray-700">
                          <SelectValue placeholder="Select duration" />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 border-gray-700">
                          <SelectItem value="7">7 days</SelectItem>
                          <SelectItem value="14">14 days</SelectItem>
                          <SelectItem value="30">30 days</SelectItem>
                          <SelectItem value="60">60 days</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Budget (USD)</Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          type="number"
                          value={promotionBudget}
                          onChange={(e) => setPromotionBudget(e.target.value)}
                          className="pl-10 bg-gray-800 border-gray-700"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Platforms</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex items-center space-x-2">
                          <Switch id="platform-spotify" defaultChecked />
                          <Label htmlFor="platform-spotify">Spotify</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch id="platform-apple" defaultChecked />
                          <Label htmlFor="platform-apple">Apple Music</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch id="platform-youtube" defaultChecked />
                          <Label htmlFor="platform-youtube">YouTube Music</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch id="platform-social" />
                          <Label htmlFor="platform-social">Social Media</Label>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Estimated Reach</Label>
                      <Card className="bg-gray-800 border-gray-700">
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-gray-400">Potential Listeners</p>
                              <p className="text-xl font-bold">5,000 - 10,000</p>
                            </div>
                            <BarChart3 className="h-8 w-8 text-purple-500 opacity-80" />
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </div>
              </div>

              <Button
                className="w-full"
                onClick={handlePromotionCampaign}
                disabled={!selectedRelease || !promotionBudget}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Create Promotion Campaign
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
