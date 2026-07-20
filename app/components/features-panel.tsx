"use client"

import React from "react"
import { useRouter } from "next/navigation"
import { Music, Upload, Library, BarChart3, Download, Users, MessageSquare, Group, ShoppingBag, Briefcase, Zap, Settings, HelpCircle, Globe, Calendar, FileVideo, Image, FileText, Tag } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"

interface FeatureSection {
  title: string
  items: {
    name: string
    icon: React.ReactNode
    path: string
    isPro?: boolean
  }[]
}

const featureSections: FeatureSection[] = [
  {
    title: "Music",
    items: [
      { name: "Music Upload", icon: <Upload className="h-4 w-4" />, path: "/artist/music/upload" },
      { name: "Music Library", icon: <Library className="h-4 w-4" />, path: "/artist/music/library" },
      { name: "Music Analytics", icon: <BarChart3 className="h-4 w-4" />, path: "/artist/music/analytics" },
      { name: "Distribution", icon: <Download className="h-4 w-4" />, path: "/artist/music/distribution", isPro: true },
    ]
  },
  {
    title: "Content",
    items: [
      { name: "Posts", icon: <FileText className="h-4 w-4" />, path: "/artist/posts" },
      { name: "Videos", icon: <FileVideo className="h-4 w-4" />, path: "/artist/videos" },
      { name: "Photos", icon: <Image className="h-4 w-4" />, path: "/artist/photos" },
      { name: "EPK", icon: <Tag className="h-4 w-4" />, path: "/artist/epk", isPro: true },
      { name: "Press", icon: <FileText className="h-4 w-4" />, path: "/artist/press" },
    ]
  },
  {
    title: "Events",
    items: [
      { name: "Events", icon: <Calendar className="h-4 w-4" />, path: "/artist/events" },
      { name: "Event Map", icon: <Globe className="h-4 w-4" />, path: "/artist/event-map" },
      { name: "Tickets", icon: <Tag className="h-4 w-4" />, path: "/artist/tickets" },
      { name: "Tour Planning", icon: <Globe className="h-4 w-4" />, path: "/artist/tour-planning", isPro: true },
    ]
  },
  {
    title: "Social",
    items: [
      { name: "Network", icon: <Users className="h-4 w-4" />, path: "/artist/network" },
      { name: "Messages", icon: <MessageSquare className="h-4 w-4" />, path: "/artist/messages" },
      { name: "Groups", icon: <Group className="h-4 w-4" />, path: "/artist/groups" },
    ]
  },
  {
    title: "Business",
    items: [
      { name: "Merchandise", icon: <ShoppingBag className="h-4 w-4" />, path: "/artist/store?tab=listings&type=merch" },
      { name: "Jobs", icon: <Briefcase className="h-4 w-4" />, path: "/artist/jobs" },
      { name: "Promotions", icon: <Zap className="h-4 w-4" />, path: "/artist/promotions" },
    ]
  },
  {
    title: "Account",
    items: [
      { name: "Settings", icon: <Settings className="h-4 w-4" />, path: "/artist/settings" },
      { name: "Help & Support", icon: <HelpCircle className="h-4 w-4" />, path: "/artist/support" },
    ]
  }
]

export function FeaturesPanel() {
  const router = useRouter()

  return (
    <ScrollArea className="h-[calc(100vh-4rem)] bg-[#13151c] border-r border-gray-800">
      <div className="p-4 space-y-6">
        {featureSections.map((section) => (
          <div key={section.title} className="space-y-2">
            <h3 className="text-sm font-medium text-gray-400 ml-2">{section.title}</h3>
            <div className="space-y-1">
              {section.items.map((item) => (
                <Button
                  key={item.name}
                  variant="ghost"
                  className="w-full justify-start gap-2 text-gray-300 hover:text-white hover:bg-gray-800"
                  onClick={() => router.push(item.path)}
                >
                  {item.icon}
                  <span>{item.name}</span>
                  {item.isPro && (
                    <span className="ml-auto text-xs bg-purple-600 text-white px-1.5 py-0.5 rounded">
                      Pro
                    </span>
                  )}
                </Button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  )
} 