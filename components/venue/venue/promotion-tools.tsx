"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Calendar, Copy, Download, Edit, Facebook, Globe, Instagram, Plus, Share2, Twitter, Upload } from "lucide-react"
import { formatSafeDate } from "@/lib/events/admin-event-normalization"
import { formatSafeNumber } from "@/lib/format/number-format"

// Mock promotion data
const mockPromotions = [
  {
    id: "promo-1",
    title: "Summer Jam Festival",
    description: "Join us for the biggest summer music festival featuring top artists and bands!",
    image: "/placeholder.svg?key=iqnt9",
    startDate: "2025-06-15",
    endDate: "2025-06-15",
    status: "active",
    platforms: ["facebook", "instagram", "twitter"],
    stats: {
      views: 2450,
      clicks: 820,
      shares: 145,
      conversions: 68,
    },
  },
  {
    id: "promo-2",
    title: "Midnight Echo",
    description: "Experience the mesmerizing sounds of Sarah Williams in an intimate venue setting.",
    image: "/placeholder.svg?key=tqa7e",
    startDate: "2025-06-22",
    endDate: "2025-06-22",
    status: "scheduled",
    platforms: ["instagram", "twitter"],
    stats: {
      views: 0,
      clicks: 0,
      shares: 0,
      conversions: 0,
    },
  },
  {
    id: "promo-3",
    title: "Jazz Night",
    description: "A sophisticated evening of smooth jazz with The Blue Notes.",
    image: "/smoky-jazz-club.png",
    startDate: "2025-06-28",
    endDate: "2025-06-28",
    status: "draft",
    platforms: ["facebook", "instagram"],
    stats: {
      views: 0,
      clicks: 0,
      shares: 0,
      conversions: 0,
    },
  },
]

// Mock social media templates
const mockTemplates = [
  {
    id: "template-1",
    name: "Event Announcement",
    description: "Standard template for announcing new events",
    content:
      "🎵 JUST ANNOUNCED 🎵\n\n[EVENT_NAME] is coming to [VENUE_NAME] on [EVENT_DATE]!\n\nFeaturing [ARTIST_NAME]\n\nTickets on sale now: [TICKET_LINK]\n\n#LiveMusic #[VENUE_HASHTAG] #[ARTIST_HASHTAG]",
    platforms: ["facebook", "instagram", "twitter"],
  },
  {
    id: "template-2",
    name: "Last Minute Tickets",
    description: "Template for promoting last-minute ticket sales",
    content:
      "⚡ LAST CHANCE ⚡\n\nOnly a few tickets remain for [EVENT_NAME] tonight at [VENUE_NAME]!\n\nDoors open at [DOORS_TIME]\n\nGrab your tickets now: [TICKET_LINK]",
    platforms: ["facebook", "instagram", "twitter"],
  },
  {
    id: "template-3",
    name: "Event Recap",
    description: "Template for post-event engagement",
    content:
      "What an incredible night at [VENUE_NAME] with [ARTIST_NAME]! Thank you to everyone who came out and made it special.\n\nTag yourself in the comments if you were there!\n\nStay tuned for more events: [WEBSITE_LINK]\n\n#LiveMusic #[VENUE_HASHTAG] #[ARTIST_HASHTAG]",
    platforms: ["facebook", "instagram"],
  },
]

export function PromotionTools() {
  const [activeTab, setActiveTab] = useState("campaigns")
  const [selectedPromotion, setSelectedPromotion] = useState<string | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-900/20 text-green-400 border-green-800"
      case "scheduled":
        return "bg-blue-900/20 text-blue-400 border-blue-800"
      case "draft":
        return "bg-gray-700 text-gray-300 border-gray-600"
      case "ended":
        return "bg-red-900/20 text-red-400 border-red-800"
      default:
        return "bg-gray-700 text-gray-300 border-gray-600"
    }
  }

  // Get platform icon
  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case "facebook":
        return <Facebook className="h-4 w-4" />
      case "instagram":
        return <Instagram className="h-4 w-4" />
      case "twitter":
        return <Twitter className="h-4 w-4" />
      default:
        return <Globe className="h-4 w-4" />
    }
  }

  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader className="pb-2">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <CardTitle className="text-lg">Promotion Tools</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Calendar className="h-4 w-4 mr-2" />
              Calendar
            </Button>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Create Promotion
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="campaigns" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-gray-800 mb-4">
            <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="social">Social Media</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="campaigns" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {mockPromotions.map((promo) => (
                <Card
                  key={promo.id}
                  className={`bg-gray-800 border-gray-700 cursor-pointer transition-all ${
                    selectedPromotion === promo.id ? "ring-2 ring-purple-500" : "hover:bg-gray-750"
                  }`}
                  onClick={() => setSelectedPromotion(promo.id === selectedPromotion ? null : promo.id)}
                >
                  <div className="relative">
                    <img
                      src={promo.image || "/placeholder.svg"}
                      alt={promo.title}
                      className="w-full h-40 object-cover rounded-t-lg"
                    />
                    <Badge variant="outline" className={`absolute top-2 right-2 ${getStatusColor(promo.status)}`}>
                      {promo.status.charAt(0).toUpperCase() + promo.status.slice(1)}
                    </Badge>
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-medium text-lg mb-1">{promo.title}</h3>
                    <p className="text-sm text-gray-400 mb-3">{promo.description}</p>

                    <div className="flex items-center justify-between mb-3">
                      <div className="text-xs text-gray-500">{formatSafeDate(promo.startDate)}</div>
                      <div className="flex gap-1">
                        {promo.platforms.map((platform) => (
                          <div
                            key={platform}
                            className="h-6 w-6 rounded-full bg-gray-700 flex items-center justify-center"
                          >
                            {getPlatformIcon(platform)}
                          </div>
                        ))}
                      </div>
                    </div>

                    {promo.status === "active" && (
                      <div className="grid grid-cols-4 gap-2 text-center text-xs">
                        <div>
                          <div className="font-medium">{formatSafeNumber(promo.stats.views)}</div>
                          <div className="text-gray-500">Views</div>
                        </div>
                        <div>
                          <div className="font-medium">{formatSafeNumber(promo.stats.clicks)}</div>
                          <div className="text-gray-500">Clicks</div>
                        </div>
                        <div>
                          <div className="font-medium">{formatSafeNumber(promo.stats.shares)}</div>
                          <div className="text-gray-500">Shares</div>
                        </div>
                        <div>
                          <div className="font-medium">{formatSafeNumber(promo.stats.conversions)}</div>
                          <div className="text-gray-500">Conv.</div>
                        </div>
                      </div>
                    )}

                    {selectedPromotion === promo.id && (
                      <div className="flex gap-2 mt-4">
                        <Button variant="outline" size="sm" className="flex-1">
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        <Button variant="outline" size="sm" className="flex-1">
                          <Share2 className="h-4 w-4 mr-1" />
                          Share
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}

              <Card className="bg-gray-800 border-gray-700 border-dashed flex flex-col items-center justify-center h-[300px] cursor-pointer hover:bg-gray-750">
                <Plus className="h-8 w-8 mb-2 text-gray-500" />
                <p className="text-gray-500">Create New Promotion</p>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="templates" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {mockTemplates.map((template) => (
                <Card
                  key={template.id}
                  className={`bg-gray-800 border-gray-700 cursor-pointer transition-all ${
                    selectedTemplate === template.id ? "ring-2 ring-purple-500" : "hover:bg-gray-750"
                  }`}
                  onClick={() => setSelectedTemplate(template.id === selectedTemplate ? null : template.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-medium text-lg">{template.name}</h3>
                      <div className="flex gap-1">
                        {template.platforms.map((platform) => (
                          <div
                            key={platform}
                            className="h-6 w-6 rounded-full bg-gray-700 flex items-center justify-center"
                          >
                            {getPlatformIcon(platform)}
                          </div>
                        ))}
                      </div>
                    </div>

                    <p className="text-sm text-gray-400 mb-3">{template.description}</p>

                    <div className="bg-gray-700 rounded-md p-3 text-sm whitespace-pre-line mb-3">
                      {template.content}
                    </div>

                    {selectedTemplate === template.id && (
                      <div className="flex gap-2 mt-4">
                        <Button variant="outline" size="sm" className="flex-1">
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        <Button variant="outline" size="sm" className="flex-1">
                          <Copy className="h-4 w-4 mr-1" />
                          Use
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}

              <Card className="bg-gray-800 border-gray-700 border-dashed flex flex-col items-center justify-center h-[250px] cursor-pointer hover:bg-gray-750">
                <Plus className="h-8 w-8 mb-2 text-gray-500" />
                <p className="text-gray-500">Create New Template</p>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="social" className="space-y-4">
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-4">
                <h3 className="font-medium text-lg mb-4">Social Media Post Creator</h3>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Platform</label>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex items-center gap-2">
                        <Facebook className="h-4 w-4" />
                        Facebook
                      </Button>
                      <Button variant="outline" size="sm" className="flex items-center gap-2">
                        <Instagram className="h-4 w-4" />
                        Instagram
                      </Button>
                      <Button variant="outline" size="sm" className="flex items-center gap-2">
                        <Twitter className="h-4 w-4" />
                        Twitter
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Content</label>
                    <Textarea
                      className="bg-gray-700 border-gray-600 min-h-[150px]"
                      placeholder="Write your post content here..."
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Media</label>
                    <div className="border border-dashed border-gray-600 rounded-md p-8 text-center">
                      <Upload className="h-8 w-8 mx-auto mb-2 text-gray-500" />
                      <p className="text-gray-500 mb-2">Drag and drop files here or click to browse</p>
                      <Button variant="outline" size="sm">
                        Upload Media
                      </Button>
                    </div>
                  </div>

                  <div className="flex justify-between">
                    <Button variant="outline">Save as Draft</Button>
                    <div className="flex gap-2">
                      <Button variant="outline">Schedule</Button>
                      <Button>Post Now</Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-4">
                <h3 className="font-medium text-lg mb-4">Scheduled Posts</h3>

                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-gray-700 rounded-md">
                    <div className="flex items-center gap-3">
                      <Instagram className="h-5 w-5 text-pink-400" />
                      <div>
                        <div className="font-medium">Summer Jam Festival Reminder</div>
                        <div className="text-xs text-gray-400">Scheduled for June 14, 2025 at 10:00 AM</div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-700 rounded-md">
                    <div className="flex items-center gap-3">
                      <Facebook className="h-5 w-5 text-blue-400" />
                      <div>
                        <div className="font-medium">Midnight Echo Ticket Sale</div>
                        <div className="text-xs text-gray-400">Scheduled for June 20, 2025 at 9:00 AM</div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-700 rounded-md">
                    <div className="flex items-center gap-3">
                      <Twitter className="h-5 w-5 text-blue-400" />
                      <div>
                        <div className="font-medium">Jazz Night Announcement</div>
                        <div className="text-xs text-gray-400">Scheduled for June 25, 2025 at 12:00 PM</div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium">Social Reach</h3>
                    <Badge variant="outline" className="bg-green-900/20 text-green-400 border-green-800">
                      +12%
                    </Badge>
                  </div>
                  <div className="text-3xl font-bold mb-1">24,850</div>
                  <p className="text-sm text-gray-400">Total impressions across all platforms</p>

                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Facebook className="h-4 w-4 text-blue-400" />
                        <span className="text-sm">Facebook</span>
                      </div>
                      <span className="text-sm">10,250</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Instagram className="h-4 w-4 text-pink-400" />
                        <span className="text-sm">Instagram</span>
                      </div>
                      <span className="text-sm">9,320</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Twitter className="h-4 w-4 text-blue-400" />
                        <span className="text-sm">Twitter</span>
                      </div>
                      <span className="text-sm">5,280</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium">Engagement Rate</h3>
                    <Badge variant="outline" className="bg-green-900/20 text-green-400 border-green-800">
                      +8%
                    </Badge>
                  </div>
                  <div className="text-3xl font-bold mb-1">4.7%</div>
                  <p className="text-sm text-gray-400">Average engagement across all posts</p>

                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Likes</span>
                      <span className="text-sm">1,850</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Comments</span>
                      <span className="text-sm">420</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Shares</span>
                      <span className="text-sm">380</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium">Ticket Sales</h3>
                    <Badge variant="outline" className="bg-green-900/20 text-green-400 border-green-800">
                      +15%
                    </Badge>
                  </div>
                  <div className="text-3xl font-bold mb-1">$12,450</div>
                  <p className="text-sm text-gray-400">Revenue from social media campaigns</p>

                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Conversion Rate</span>
                      <span className="text-sm">3.2%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Avg. Order Value</span>
                      <span className="text-sm">$45.80</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Total Tickets</span>
                      <span className="text-sm">272</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-4">
                <h3 className="font-medium text-lg mb-4">Top Performing Content</h3>

                <ScrollArea className="h-[300px] pr-4">
                  <div className="space-y-3">
                    <div className="p-3 bg-gray-700 rounded-md">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Instagram className="h-4 w-4 text-pink-400" />
                          <span className="font-medium">Summer Jam Festival Announcement</span>
                        </div>
                        <Badge variant="outline" className="bg-green-900/20 text-green-400 border-green-800">
                          4.8k likes
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-400 mb-2">
                        "🎵 JUST ANNOUNCED 🎵 Summer Jam Festival is coming to The Echo Lounge on June 15th!"
                      </p>
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>Posted May 15, 2025</span>
                        <span>820 comments • 145 shares</span>
                      </div>
                    </div>

                    <div className="p-3 bg-gray-700 rounded-md">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Facebook className="h-4 w-4 text-blue-400" />
                          <span className="font-medium">Behind the Scenes: Venue Tour</span>
                        </div>
                        <Badge variant="outline" className="bg-green-900/20 text-green-400 border-green-800">
                          3.2k likes
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-400 mb-2">
                        "Take a look behind the scenes at our newly renovated sound system and stage lighting!"
                      </p>
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>Posted May 10, 2025</span>
                        <span>245 comments • 98 shares</span>
                      </div>
                    </div>

                    <div className="p-3 bg-gray-700 rounded-md">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Twitter className="h-4 w-4 text-blue-400" />
                          <span className="font-medium">Last Minute Tickets: Jazz Night</span>
                        </div>
                        <Badge variant="outline" className="bg-green-900/20 text-green-400 border-green-800">
                          2.7k likes
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-400 mb-2">
                        "⚡ LAST CHANCE ⚡ Only a few tickets remain for Jazz Night tonight at The Echo Lounge!"
                      </p>
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>Posted April 28, 2025</span>
                        <span>120 comments • 85 shares</span>
                      </div>
                    </div>

                    <div className="p-3 bg-gray-700 rounded-md">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Instagram className="h-4 w-4 text-pink-400" />
                          <span className="font-medium">Artist Spotlight: Sarah Williams</span>
                        </div>
                        <Badge variant="outline" className="bg-green-900/20 text-green-400 border-green-800">
                          2.5k likes
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-400 mb-2">
                        "We're excited to welcome @sarahwilliams for her Midnight Echo tour on June 22nd!"
                      </p>
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>Posted May 5, 2025</span>
                        <span>195 comments • 78 shares</span>
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export Analytics Report
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
