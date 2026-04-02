"use client"

import React from "react"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  Home,
  Users,
  MessageSquare,
  Calendar,
  User,
  Settings,
  Music,
  Ticket,
  Briefcase,
  ShoppingBag,
  BarChart3,
  FileText,
  Globe,
  HelpCircle,
  MessageCircle,
  LogOut,
  Headphones,
  Video,
  ImageIcon,
  PenTool,
  Zap,
  Star,
  TrendingUp,
  Grid3X3,
  X,
  CheckSquare,
  Sparkles,
} from "lucide-react"

interface EnhancedSidebarProps {
  isOpen: boolean
  onClose: () => void
}

export function EnhancedSidebar({ isOpen, onClose }: EnhancedSidebarProps) {
  const pathname = usePathname()

  const isActive = (path: string) => {
    if (path === "/") {
      return pathname === "/"
    }
    return pathname === path || pathname.startsWith(`${path}/`)
  }

  // Main navigation items
  const mainNavItems = [
    { title: "Home", href: "/", icon: Home },
    { title: "Pulse", href: "/feed", icon: Sparkles },
    { title: "Network", href: "/network", icon: Users },
    { title: "Messages", href: "/messages", icon: MessageSquare, badge: 5 },
    { title: "Events", href: "/events", icon: Calendar, badge: 3 },
    { title: "Profile", href: "/profile", icon: User },
    { title: "Teams", href: "/teams", icon: Users, badge: "New" },
  ]

  // Feature categories with their items
  const featureCategories = [
    {
      name: "Music",
      items: [
        { title: "Upload Music", href: "/music/upload", icon: Music, badge: "New" },
        { title: "My Library", href: "/music/library", icon: Headphones },
        { title: "Analytics", href: "/music/analytics", icon: BarChart3 },
        { title: "Promotion", href: "/music/promotion", icon: TrendingUp },
      ],
    },
    {
      name: "Team Management",
      items: [
        { title: "My Teams", href: "/teams", icon: Users },
        { title: "Task Management", href: "/teams?tab=tasks", icon: CheckSquare },
        { title: "Shift Scheduling", href: "/teams?tab=shifts", icon: Calendar },
        { title: "Team Chat", href: "/teams?tab=communication", icon: MessageCircle },
      ],
    },
    {
      name: "Content",
      items: [
        { title: "Posts", href: "/content/posts", icon: PenTool },
        { title: "Videos", href: "/content/videos", icon: Video },
        { title: "Photos", href: "/content/photos", icon: ImageIcon },
        { title: "EPK", href: "/epk", icon: FileText, badge: "Pro" },
      ],
    },
    {
      name: "Events & Touring",
      items: [
        { title: "Calendar", href: "/calendar", icon: Calendar },
        { title: "Event Map", href: "/events/map", icon: Globe },
        { title: "Tickets", href: "/tickets", icon: Ticket },
        { title: "Venues", href: "/venues", icon: Star },
      ],
    },
    {
      name: "Business",
      items: [
        { title: "Jobs", href: "/jobs", icon: Briefcase, badge: 3 },
        { title: "Merch", href: "/merch", icon: ShoppingBag },
        { title: "Promotions", href: "/promotions", icon: Zap },
        { title: "Analytics", href: "/analytics", icon: BarChart3 },
      ],
    },
  ]

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && <div className="fixed inset-0 bg-black/80 z-40 lg:hidden" onClick={onClose} />}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-full w-64 bg-gray-900 border-r border-gray-800 transition-transform duration-300 ease-in-out lg:translate-x-0 lg:z-30",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center justify-between px-4 border-b border-gray-800">
          <Link href="/" className="flex items-center gap-2">
            <img src="/images/tourify-logo-white.png" alt="Tourify" className="h-8" />
          </Link>
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <ScrollArea className="h-[calc(100vh-4rem)]">
          <div className="p-4 space-y-6">
            {/* Main Navigation */}
            <div className="space-y-1">
              {mainNavItems.map((item) => (
                <NavItem
                  key={item.href}
                  href={item.href}
                  icon={item.icon}
                  title={item.title}
                  badge={item.badge}
                  active={isActive(item.href)}
                />
              ))}

              {/* All Features Button - Prominent */}
              <Link
                href="/features"
                className={cn(
                  "flex items-center px-3 py-2.5 mt-2 text-sm font-medium rounded-md border",
                  isActive("/features")
                    ? "bg-purple-600 text-white border-purple-600"
                    : "bg-gray-800/50 text-white border-gray-700 hover:bg-gray-800 hover:border-gray-600",
                )}
              >
                <Grid3X3 className="h-5 w-5 mr-3" />
                All Features
              </Link>
            </div>

            {/* Feature Categories */}
            {featureCategories.map((category) => (
              <div key={category.name} className="space-y-1">
                <h3 className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">{category.name}</h3>
                {category.items.map((item) => (
                  <NavItem
                    key={item.href}
                    href={item.href}
                    icon={item.icon}
                    title={item.title}
                    badge={item.badge}
                    active={isActive(item.href)}
                    compact
                  />
                ))}
              </div>
            ))}

            {/* Settings and Help */}
            <div className="space-y-1">
              <h3 className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Account</h3>
              <NavItem href="/settings" icon={Settings} title="Settings" active={isActive("/settings")} compact />
              <NavItem href="/help" icon={HelpCircle} title="Help & Support" active={isActive("/help")} compact />
              <NavItem href="/feedback" icon={MessageCircle} title="Feedback" active={isActive("/feedback")} compact />
            </div>
          </div>

          <div className="p-4 mt-4">
            <Separator className="bg-gray-800 mb-4" />
            <Button
              variant="destructive"
              className="w-full justify-start bg-red-900/20 hover:bg-red-900/30 text-red-500"
            >
              <LogOut className="h-5 w-5 mr-3" />
              Log Out
            </Button>
          </div>
        </ScrollArea>
      </aside>
    </>
  )
}

interface NavItemProps {
  href: string
  icon: React.ComponentType<{ className?: string }>
  title: string
  badge?: number | string
  active?: boolean
  compact?: boolean
}

function NavItem({ href, icon: Icon, title, badge, active, compact }: NavItemProps) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center rounded-md",
        compact ? "px-3 py-1.5 text-sm" : "px-3 py-2 text-sm font-medium",
        active ? "bg-gray-800 text-white" : "text-gray-300 hover:text-white hover:bg-gray-800/70",
      )}
    >
      <Icon className={cn("mr-3", compact ? "h-4 w-4" : "h-5 w-5")} />
      <span>{title}</span>
      {typeof badge === "number" && (
        <Badge className="ml-auto bg-purple-600 text-white text-xs h-5 min-w-5 flex items-center justify-center px-1">
          {badge}
        </Badge>
      )}
      {typeof badge === "string" && (
        <Badge className="ml-auto bg-gradient-to-r from-purple-600 to-blue-500 text-white text-xs px-2">{badge}</Badge>
      )}
    </Link>
  )
}
