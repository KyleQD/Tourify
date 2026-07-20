"use client"

import { useState } from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { venueDashboardTabListClass } from "@/app/venue/lib/dashboard-ui"
import {
  Calendar,
  Users,
  MessageSquare,
  Ticket,
  ShoppingBag,
  BarChart3,
  PenTool,
  Video,
  ImageIcon,
  Briefcase,
  Globe,
  Headphones,
  TrendingUp,
  BookOpen,
  Mic,
  DollarSign,
  CreditCard,
  Map,
  Building,
  Award,
  Bell,
} from "lucide-react"

import type { LucideIcon } from "lucide-react"

interface TabNavItem {
  title: string
  icon: LucideIcon
  href: string
  description: string
  badge?: string
}

export function TabbedNavigation() {
  const [activeTab, setActiveTab] = useState("events")

  const tabs = [
    { id: "content", label: "Content", icon: PenTool },
    { id: "events", label: "Events", icon: Calendar },
    { id: "business", label: "Business", icon: Briefcase },
    { id: "networking", label: "Networking", icon: Users },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
  ]

  const tabContent: Record<string, TabNavItem[]> = {
    content: [
      { title: "Posts", icon: PenTool, href: "/venue/dashboard", description: "Create and manage your posts" },
      { title: "Videos", icon: Video, href: "/venue/dashboard", description: "Upload and manage your videos" },
      { title: "Photos", icon: ImageIcon, href: "/venue/documents", description: "Upload and manage your photos" },
      { title: "Blog", icon: BookOpen, href: "/venue/dashboard", description: "Write and publish blog posts" },
      {
        title: "Podcasts",
        icon: Mic,
        href: "/venue/dashboard",
        description: "Create and manage podcasts",
        badge: "New",
      },
    ],
    events: [
      { title: "Events", icon: Calendar, href: "/venue/dashboard/events", description: "Create and manage your events" },
      { title: "Event Map", icon: Map, href: "/venue/dashboard/events/map", description: "Discover events on the map" },
      { title: "Tickets", icon: Ticket, href: "/venue/dashboard/tickets", description: "Sell tickets for your events" },
      { title: "Venues", icon: Building, href: "/venues", description: "Discover and manage venues" },
      {
        title: "Tour Planning",
        icon: Globe,
        href: "/venue/dashboard/events",
        description: "Plan and manage your tours",
        badge: "Pro",
      },
      {
        title: "Event Analytics",
        icon: BarChart3,
        href: "/venue/analytics",
        description: "Track your event performance",
      },
    ],
    business: [
      { title: "Merchandise", icon: ShoppingBag, href: "/venue/dashboard/store", description: "Sell your merchandise" },
      { title: "Jobs", icon: Briefcase, href: "/jobs", description: "Find and post music industry jobs" },
      { title: "Payments", icon: DollarSign, href: "/venue/finances", description: "Manage your payments", badge: "Pro" },
      { title: "Subscriptions", icon: CreditCard, href: "/venue/settings", description: "Manage your subscriptions" },
      { title: "Licensing", icon: Award, href: "/licensing", description: "License your music", badge: "Pro" },
    ],
    networking: [
      { title: "Discover", icon: Users, href: "/discover", description: "Discover artists and venues" },
      { title: "Messages", icon: MessageSquare, href: "/messages", description: "Chat with your connections" },
      {
        title: "Collaborations",
        icon: Headphones,
        href: "/projects",
        description: "Find collaboration opportunities",
      },
      { title: "Notifications", icon: Bell, href: "/notifications", description: "Manage your notifications" },
    ],
    analytics: [
      {
        title: "Analytics Dashboard",
        icon: BarChart3,
        href: "/venue/analytics",
        description: "View your overall performance",
      },
      { title: "Audience Insights", icon: Users, href: "/venue/analytics", description: "Understand your audience" },
      {
        title: "Content Performance",
        icon: TrendingUp,
        href: "/venue/analytics",
        description: "Track your content performance",
      },
      {
        title: "Revenue Analytics",
        icon: DollarSign,
        href: "/venue/analytics",
        description: "Track your revenue",
        badge: "Pro",
      },
    ],
  }

  return (
    <Tabs defaultValue="events" value={activeTab} onValueChange={setActiveTab} className="w-full min-w-0">
      <TabsList className={cn(venueDashboardTabListClass, "rounded-lg")}>
        {tabs.map((tab) => (
          <TabsTrigger
            key={tab.id}
            value={tab.id}
            className={cn(
              "flex shrink-0 items-center gap-2 data-[state=active]:bg-gray-700",
              "data-[state=active]:text-white data-[state=active]:shadow-none",
            )}
          >
            <tab.icon className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">{tab.label}</span>
          </TabsTrigger>
        ))}
      </TabsList>

      {Object.entries(tabContent).map(([key, items]) => (
        <TabsContent key={key} value={key} className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((item) => (
              <a key={item.title} href={item.href} className="group">
                <div className="border border-gray-800 rounded-lg p-5 hover:bg-gray-800/50 hover:border-gray-700 transition-all">
                  <div className="flex items-start">
                    <div
                      className={cn(
                        "p-2 rounded-md mr-4",
                        key === "music"
                          ? "bg-purple-500/20 text-purple-400"
                          : key === "content"
                            ? "bg-blue-500/20 text-blue-400"
                            : key === "events"
                              ? "bg-green-500/20 text-green-400"
                              : key === "business"
                                ? "bg-amber-500/20 text-amber-400"
                                : key === "networking"
                                  ? "bg-red-500/20 text-red-400"
                                  : "bg-indigo-500/20 text-indigo-400",
                      )}
                    >
                      <item.icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                        <h3 className="font-medium break-words group-hover:text-white">{item.title}</h3>
                        {item.badge && (
                          <span className="shrink-0 text-xs px-2 py-0.5 rounded-full bg-gradient-to-r from-purple-600 to-blue-500 text-white">
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-400 mt-1">{item.description}</p>
                    </div>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </TabsContent>
      ))}
    </Tabs>
  )
}
