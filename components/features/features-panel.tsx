"use client"

import React from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  Music,
  FileText,
  Calendar,
  Users,
  Building2,
  UserCircle,
  Upload,
  BarChart2,
  MessageSquare,
  Share2,
  Ticket,
  Settings,
  Bell,
  CreditCard,
  Lock,
  Star,
  Headphones,
  Radio,
  PlayCircle,
  ListMusic,
  Mic2,
  PieChart,
  MapPin,
  CalendarClock,
  UserPlus,
  MessageCircle,
  Heart,
  Briefcase,
  ShieldCheck,
  FileKey,
  Wallet,
  LayoutDashboard,
} from "lucide-react"

interface FeaturesPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface Feature {
  name: string
  description: string
  icon: React.ElementType
  isPro?: boolean
  shortcut?: string
  href?: string
}

interface FeatureSection {
  title: string
  features: Feature[]
}

const featureSections: FeatureSection[] = [
  {
    title: "Music",
    features: [
      {
        name: "Upload Music",
        description: "Upload and manage your tracks",
        icon: Upload,
        shortcut: "⌘U",
        href: "/artist/music/upload",
      },
      {
        name: "Music Library",
        description: "Browse and organize your music",
        icon: Headphones,
        href: "/artist/music",
      },
      {
        name: "Radio",
        description: "Stream your music live",
        icon: Radio,
        isPro: true,
        href: "/artist/music",
      },
      {
        name: "Player",
        description: "Customizable web player",
        icon: PlayCircle,
        href: "/artist/music",
      },
      {
        name: "Playlists",
        description: "Create and share playlists",
        icon: ListMusic,
        href: "/artist/music",
      },
      {
        name: "Recording",
        description: "Record audio directly",
        icon: Mic2,
        isPro: true,
        href: "/artist/music",
      },
    ],
  },
  {
    title: "Content",
    features: [
      {
        name: "Documents",
        description: "Store and manage files",
        icon: FileText,
        href: "/documents",
      },
      {
        name: "Analytics",
        description: "Track performance metrics",
        icon: BarChart2,
        isPro: true,
        href: "/analytics",
      },
      {
        name: "Insights",
        description: "Advanced data analysis",
        icon: PieChart,
        isPro: true,
        href: "/insights",
      },
    ],
  },
  {
    title: "Events",
    features: [
      {
        name: "Calendar",
        description: "Schedule and manage events",
        icon: Calendar,
        href: "/events",
      },
      {
        name: "Venues",
        description: "Find and book venues",
        icon: MapPin,
        href: "/venues",
      },
      {
        name: "Bookings",
        description: "Manage event bookings",
        icon: CalendarClock,
        href: "/bookings",
      },
    ],
  },
  {
    title: "Social",
    features: [
      {
        name: "Network",
        description: "Connect with others",
        icon: Users,
        href: "/discover",
      },
      {
        name: "Messaging",
        description: "Chat with your network",
        icon: MessageSquare,
        href: "/messages",
      },
      {
        name: "Share",
        description: "Share your content",
        icon: Share2,
        href: "/share",
      },
      {
        name: "Following",
        description: "Manage subscriptions",
        icon: Heart,
        href: "/following",
      },
    ],
  },
  {
    title: "Business",
    features: [
      {
        name: "Tickets",
        description: "Sell event tickets",
        icon: Ticket,
        isPro: true,
        href: "/tickets/my-tickets",
      },
      {
        name: "Team",
        description: "Manage your team",
        icon: UserPlus,
        isPro: true,
        href: "/venue/staff",
      },
      {
        name: "Messaging",
        description: "Business communication",
        icon: MessageCircle,
        isPro: true,
        href: "/business/messages",
      },
      {
        name: "Career",
        description: "Professional tools",
        icon: Briefcase,
        isPro: true,
        href: "/career",
      },
    ],
  },
  {
    title: "Account",
    features: [
      {
        name: "Settings",
        description: "Account preferences",
        icon: Settings,
        href: "/settings",
      },
      {
        name: "Notifications",
        description: "Manage alerts",
        icon: Bell,
        href: "/notifications",
      },
      {
        name: "Billing",
        description: "Subscription & payments",
        icon: CreditCard,
        href: "/settings",
      },
      {
        name: "Security",
        description: "Privacy & security",
        icon: Lock,
        href: "/security",
      },
    ],
  },
]

export function FeaturesPanel({ open, onOpenChange }: FeaturesPanelProps) {
  const [activeSection, setActiveSection] = React.useState("Music")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 gap-0 bg-[#13151c] border-[#2a2f3e]">
        <div className="flex h-[80vh]">
          {/* Sections sidebar */}
          <div className="w-48 border-r border-[#2a2f3e] p-2 flex flex-col gap-1">
            {featureSections.map((section) => (
              <Button
                key={section.title}
                variant="ghost"
                className={cn(
                  "justify-start font-normal",
                  activeSection === section.title
                    ? "bg-[#2a2f3e] text-white"
                    : "text-white/70 hover:text-white hover:bg-[#2a2f3e]"
                )}
                onClick={() => setActiveSection(section.title)}
              >
                {section.title}
              </Button>
            ))}
          </div>

          {/* Features grid */}
          <div className="flex-1 p-6">
            <ScrollArea className="h-full">
              <div className="space-y-6">
                {featureSections
                  .filter((section) => section.title === activeSection)
                  .map((section) => (
                    <div key={section.title}>
                      <h2 className="text-lg font-semibold text-white mb-4">{section.title}</h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {section.features.map((feature) => (
                          <Button
                            key={feature.name}
                            variant="outline"
                            className="h-auto p-4 justify-start border-[#2a2f3e] hover:bg-[#2a2f3e] hover:text-white"
                          >
                            <div className="flex items-start gap-3">
                              {React.createElement(feature.icon as React.ComponentType<any>, { className: "h-5 w-5 text-purple-400 mt-0.5" })}
                              <div className="text-left">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{feature.name}</span>
                                  {feature.isPro && (
                                    <div className="bg-purple-500/20 text-purple-400 text-xs font-medium px-1.5 py-0.5 rounded">
                                      Pro
                                    </div>
                                  )}
                                  {feature.shortcut && (
                                    <kbd className="ml-auto text-xs bg-[#2a2f3e] text-white/70 px-1.5 py-0.5 rounded">
                                      {feature.shortcut}
                                    </kbd>
                                  )}
                                </div>
                                <p className="text-sm text-white/60 mt-0.5">{feature.description}</p>
                              </div>
                            </div>
                          </Button>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 