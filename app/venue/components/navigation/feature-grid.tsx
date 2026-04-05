"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  Music,
  Calendar,
  Users,
  MessageSquare,
  FileText,
  Ticket,
  ShoppingBag,
  BarChart3,
  Upload,
  PenTool,
  Video,
  Briefcase,
  Zap,
  Globe,
  Search,
  Headphones,
  TrendingUp,
  Layers,
  Settings,
  HelpCircle,
  BookOpen,
  Mic,
  Share2,
  DollarSign,
  CreditCard,
  Map,
  Building,
  Award,
  Heart,
  Bell,
  Filter,
  ImageIcon,
} from "lucide-react"

export function FeatureGrid() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  const categories = [
    { id: "music", name: "Music" },
    { id: "content", name: "Content" },
    { id: "events", name: "Events" },
    { id: "business", name: "Business" },
    { id: "networking", name: "Networking" },
    { id: "analytics", name: "Analytics" },
    { id: "account", name: "Account" },
  ]

  const features = [
    // Music Features
    {
      id: "music-upload",
      title: "Music Upload",
      description: "Upload your tracks, albums, and EPs",
      icon: Upload,
      href: "/music/upload",
      category: "music",
      color: "bg-purple-500/20 text-purple-400",
    },
    {
      id: "music-library",
      title: "Music Library",
      description: "Manage your uploaded music",
      icon: Music,
      href: "/music/library",
      category: "music",
      color: "bg-purple-500/20 text-purple-400",
    },
    {
      id: "music-analytics",
      title: "Music Analytics",
      description: "Track your music performance",
      icon: BarChart3,
      href: "/music/analytics",
      category: "music",
      color: "bg-purple-500/20 text-purple-400",
    },
    {
      id: "music-promotion",
      title: "Music Promotion",
      description: "Promote your music to new audiences",
      icon: TrendingUp,
      href: "/music/promotion",
      category: "music",
      color: "bg-purple-500/20 text-purple-400",
    },
    {
      id: "playlists",
      title: "Playlists",
      description: "Create and share playlists",
      icon: Layers,
      href: "/music/playlists",
      category: "music",
      color: "bg-purple-500/20 text-purple-400",
    },
    {
      id: "distribution",
      title: "Distribution",
      description: "Distribute your music to platforms",
      icon: Share2,
      href: "/music/distribution",
      category: "music",
      color: "bg-purple-500/20 text-purple-400",
      badge: "Pro",
    },

    // Content Features
    {
      id: "posts",
      title: "Posts",
      description: "Create and manage your posts",
      icon: PenTool,
      href: "/content/posts",
      category: "content",
      color: "bg-blue-500/20 text-blue-400",
    },
    {
      id: "videos",
      title: "Videos",
      description: "Upload and manage your videos",
      icon: Video,
      href: "/content/videos",
      category: "content",
      color: "bg-blue-500/20 text-blue-400",
    },
    {
      id: "photos",
      title: "Photos",
      description: "Upload and manage your photos",
      icon: ImageIcon, // Changed from Image to ImageIcon
      href: "/content/photos",
      category: "content",
      color: "bg-blue-500/20 text-blue-400",
    },
    {
      id: "epk",
      title: "EPK",
      description: "Create your electronic press kit",
      icon: FileText,
      href: "/epk",
      category: "content",
      color: "bg-blue-500/20 text-blue-400",
      badge: "Pro",
    },
    {
      id: "blog",
      title: "Blog",
      description: "Write and publish blog posts",
      icon: BookOpen,
      href: "/content/blog",
      category: "content",
      color: "bg-blue-500/20 text-blue-400",
    },
    {
      id: "podcasts",
      title: "Podcasts",
      description: "Create and manage podcasts",
      icon: Mic,
      href: "/content/podcasts",
      category: "content",
      color: "bg-blue-500/20 text-blue-400",
      badge: "New",
    },

    // Events Features
    {
      id: "events",
      title: "Events",
      description: "Create and manage your events",
      icon: Calendar,
      href: "/venue/dashboard/events",
      category: "events",
      color: "bg-green-500/20 text-green-400",
    },
    {
      id: "event-map",
      title: "Event Map",
      description: "Discover events on the map",
      icon: Map,
      href: "/venue/dashboard/events/map",
      category: "events",
      color: "bg-green-500/20 text-green-400",
    },
    {
      id: "tickets",
      title: "Tickets",
      description: "Sell tickets for your events",
      icon: Ticket,
      href: "/venue/dashboard/tickets",
      category: "events",
      color: "bg-green-500/20 text-green-400",
    },
    {
      id: "venues",
      title: "Venues",
      description: "Discover and manage venues",
      icon: Building,
      href: "/venues",
      category: "events",
      color: "bg-green-500/20 text-green-400",
    },
    {
      id: "tour-planning",
      title: "Tour Planning",
      description: "Plan and manage your tours",
      icon: Globe,
      href: "/venue/dashboard/events",
      category: "events",
      color: "bg-green-500/20 text-green-400",
      badge: "Pro",
    },
    {
      id: "event-analytics",
      title: "Event Analytics",
      description: "Track your event performance",
      icon: BarChart3,
      href: "/venue/analytics",
      category: "events",
      color: "bg-green-500/20 text-green-400",
    },

    // Business Features
    {
      id: "merch",
      title: "Merchandise",
      description: "Sell your merchandise",
      icon: ShoppingBag,
      href: "/merch",
      category: "business",
      color: "bg-amber-500/20 text-amber-400",
    },
    {
      id: "jobs",
      title: "Jobs",
      description: "Find and post music industry jobs",
      icon: Briefcase,
      href: "/jobs",
      category: "business",
      color: "bg-amber-500/20 text-amber-400",
    },
    {
      id: "promotions",
      title: "Promotions",
      description: "Create promotional campaigns",
      icon: Zap,
      href: "/promotions",
      category: "business",
      color: "bg-amber-500/20 text-amber-400",
    },
    {
      id: "payments",
      title: "Payments",
      description: "Manage your payments",
      icon: DollarSign,
      href: "/payments",
      category: "business",
      color: "bg-amber-500/20 text-amber-400",
      badge: "Pro",
    },
    {
      id: "subscriptions",
      title: "Subscriptions",
      description: "Manage your subscriptions",
      icon: CreditCard,
      href: "/subscriptions",
      category: "business",
      color: "bg-amber-500/20 text-amber-400",
    },
    {
      id: "licensing",
      title: "Licensing",
      description: "License your music",
      icon: Award,
      href: "/licensing",
      category: "business",
      color: "bg-amber-500/20 text-amber-400",
      badge: "Pro",
    },

    // Networking Features
    {
      id: "network",
      title: "Network",
      description: "Connect with other musicians",
      icon: Users,
      href: "/network",
      category: "networking",
      color: "bg-red-500/20 text-red-400",
    },
    {
      id: "messages",
      title: "Messages",
      description: "Chat with your connections",
      icon: MessageSquare,
      href: "/messages",
      category: "networking",
      color: "bg-red-500/20 text-red-400",
    },
    {
      id: "groups",
      title: "Groups",
      description: "Join and create groups",
      icon: Users,
      href: "/groups",
      category: "networking",
      color: "bg-red-500/20 text-red-400",
    },
    {
      id: "collaborations",
      title: "Collaborations",
      description: "Find collaboration opportunities",
      icon: Headphones,
      href: "/collaborations",
      category: "networking",
      color: "bg-red-500/20 text-red-400",
    },
    {
      id: "fans",
      title: "Fan Management",
      description: "Manage your fan relationships",
      icon: Heart,
      href: "/fans",
      category: "networking",
      color: "bg-red-500/20 text-red-400",
      badge: "Pro",
    },
    {
      id: "notifications",
      title: "Notifications",
      description: "Manage your notifications",
      icon: Bell,
      href: "/notifications",
      category: "networking",
      color: "bg-red-500/20 text-red-400",
    },

    // Analytics Features
    {
      id: "analytics",
      title: "Analytics Dashboard",
      description: "View your overall performance",
      icon: BarChart3,
      href: "/venue/analytics",
      category: "analytics",
      color: "bg-indigo-500/20 text-indigo-400",
    },
    {
      id: "audience",
      title: "Audience Insights",
      description: "Understand your audience",
      icon: Users,
      href: "/venue/analytics",
      category: "analytics",
      color: "bg-indigo-500/20 text-indigo-400",
    },
    {
      id: "content-performance",
      title: "Content Performance",
      description: "Track your content performance",
      icon: TrendingUp,
      href: "/venue/analytics",
      category: "analytics",
      color: "bg-indigo-500/20 text-indigo-400",
    },
    {
      id: "revenue",
      title: "Revenue Analytics",
      description: "Track your revenue",
      icon: DollarSign,
      href: "/venue/analytics",
      category: "analytics",
      color: "bg-indigo-500/20 text-indigo-400",
      badge: "Pro",
    },

    // Account Features
    {
      id: "settings",
      title: "Settings",
      description: "Manage your account settings",
      icon: Settings,
      href: "/settings",
      category: "account",
      color: "bg-gray-500/20 text-gray-400",
    },
    {
      id: "help",
      title: "Help & Support",
      description: "Get help and support",
      icon: HelpCircle,
      href: "/help",
      category: "account",
      color: "bg-gray-500/20 text-gray-400",
    },
  ]

  // Filter features based on search query and selected category
  const filteredFeatures = features.filter((feature) => {
    const matchesSearch =
      feature.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      feature.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory ? feature.category === selectedCategory : true
    return matchesSearch && matchesCategory
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-center">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search features..."
            className="pl-10 bg-gray-800 border-gray-700"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 w-full md:w-auto">
          <Button
            variant={selectedCategory === null ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory(null)}
            className={selectedCategory === null ? "bg-purple-600 hover:bg-purple-700" : "border-gray-700"}
          >
            All
          </Button>

          {categories.map((category) => (
            <Button
              key={category.id}
              variant={selectedCategory === category.id ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(category.id)}
              className={selectedCategory === category.id ? "bg-purple-600 hover:bg-purple-700" : "border-gray-700"}
            >
              {category.name}
            </Button>
          ))}
        </div>
      </div>

      {filteredFeatures.length === 0 ? (
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-800 mb-4">
            <Filter className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-xl font-medium mb-2">No features found</h3>
          <p className="text-gray-400">Try adjusting your search or filter to find what you're looking for</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredFeatures.map((feature) => (
            <Link key={feature.id} href={feature.href} className="group">
              <div className="border border-gray-800 rounded-lg p-5 hover:bg-gray-800/50 hover:border-gray-700 transition-all">
                <div className="flex items-start">
                  <div className={cn("p-2 rounded-md mr-4", feature.color)}>
                    <feature.icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium group-hover:text-white">{feature.title}</h3>
                      {feature.badge && (
                        <Badge className="bg-gradient-to-r from-purple-600 to-blue-500">{feature.badge}</Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-400 mt-1">{feature.description}</p>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
