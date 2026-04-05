"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  Home,
  Calendar,
  Music,
  Users,
  MessageSquare,
  BarChart3,
  Settings,
  Building,
  Briefcase,
  FileText,
  ImageIcon,
  Video,
  Mic,
  ShoppingBag,
  Ticket,
  DollarSign,
  HelpCircle,
  ChevronRight,
  X,
  Search,
  PlusCircle,
  Clock,
  Zap,
  Map,
  BookOpen,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { useToast } from "@/hooks/use-toast"

interface NavItemProps {
  href: string
  icon: React.ReactNode
  label: string
  badge?: string | number
  isNew?: boolean
  onClick?: () => void
}

interface NavGroupProps {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
}

interface MainSidebarProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  className?: string
}

export function MainSidebar({ open, onOpenChange, className = "" }: MainSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { toast } = useToast()

  // Track expanded state of collapsible sections
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    main: true,
    content: false,
    venues: false,
    business: false,
  })

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }))
  }

  // Check if a route is active
  const isActive = (href: string) => {
    if (href === "/") return pathname === "/"

    // Handle route groups by normalizing paths
    const normalizedPathname = pathname.replace(/^\/(main|venue)\//, "/")
    const normalizedHref = href.replace(/^\/(main|venue)\//, "/")

    return (
      normalizedPathname === normalizedHref ||
      normalizedPathname.startsWith(`${normalizedHref}/`) ||
      normalizedPathname.startsWith(`${normalizedHref}?`)
    )
  }

  // Handle navigation with active link checking
  const handleNavigation = (href: string, onClick?: () => void) => (e: React.MouseEvent) => {
    e.preventDefault()

    // Close mobile sidebar if open
    if (open) {
      onOpenChange(false)
    }

    // Execute any additional onClick handler
    if (onClick) onClick()

    // Navigate to the page
    router.push(href)

    // Show toast for demonstration
    toast({
      title: "Navigating",
      description: `Navigating to ${href}`,
    })
  }

  // Render a navigation item
  const NavItem = ({ href, icon, label, badge, isNew, onClick }: NavItemProps) => (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <a
            href={href}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
              isActive(href)
                ? "bg-primary/10 text-primary font-medium"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
            onClick={handleNavigation(href, onClick)}
          >
            <span className="flex shrink-0 items-center justify-center">{icon}</span>
            <span className="flex-1 truncate">{label}</span>
            {isNew && (
              <Badge variant="outline" className="ml-auto h-5 text-xs bg-purple-100 text-purple-800 border-purple-300">
                New
              </Badge>
            )}
            {typeof badge === "number" && (
              <Badge className="ml-auto bg-primary text-primary-foreground text-xs h-5 min-w-5 flex items-center justify-center px-1">
                {badge}
              </Badge>
            )}
            {typeof badge === "string" && (
              <Badge className="ml-auto bg-gradient-to-r from-purple-600 to-blue-500 text-white text-xs px-2">
                {badge}
              </Badge>
            )}
          </a>
        </TooltipTrigger>
        <TooltipContent side="right" className="hidden lg:block">
          {label}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )

  // Render a navigation group with collapsible content
  const NavGroup = ({ title, children, defaultOpen = false }: NavGroupProps) => {
    const sectionKey = title.toLowerCase()
    const isOpen = expandedSections[sectionKey] ?? defaultOpen

    return (
      <Collapsible open={isOpen} onOpenChange={() => toggleSection(sectionKey)}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between px-3 py-1.5 text-sm font-medium">
            {title}
            <ChevronRight className={cn("h-4 w-4 transition-transform", isOpen && "rotate-90")} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-1 px-1 py-1">{children}</CollapsibleContent>
      </Collapsible>
    )
  }

  // Sidebar content - used in both desktop and mobile views
  const SidebarContent = () => (
    <>
      <div className="flex h-14 items-center border-b px-4">
        <div className="flex-1" />
        <Button variant="ghost" size="icon" className="ml-auto lg:hidden" onClick={() => onOpenChange(false)}>
          <X className="h-5 w-5" />
          <span className="sr-only">Close sidebar</span>
        </Button>
      </div>

      <ScrollArea className="flex-1 px-2 py-4">
        <div className="space-y-4">
          {/* Quick Actions */}
          <div className="px-3 py-2">
            <div className="mb-4 flex items-center justify-between">
              <Button variant="outline" size="sm" className="w-full gap-1" onClick={handleNavigation("/search")}>
                <Search className="h-4 w-4" />
                <span>Search</span>
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                className="justify-start gap-1"
                onClick={handleNavigation("/venue/dashboard/calendar")}
              >
                <PlusCircle className="h-4 w-4" />
                <span>Event</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="justify-start gap-1"
                onClick={handleNavigation("/music/upload")}
              >
                <Music className="h-4 w-4" />
                <span>Upload</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="justify-start gap-1"
                onClick={handleNavigation("/venue/bookings")}
              >
                <Clock className="h-4 w-4" />
                <span>Booking</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="justify-start gap-1"
                onClick={handleNavigation("/jobs/create")}
              >
                <Briefcase className="h-4 w-4" />
                <span>Job</span>
              </Button>
            </div>
          </div>

          {/* Main Navigation */}
          <NavGroup title="Main" defaultOpen={true}>
            <NavItem href="/" icon={<Home className="h-4 w-4" />} label="Home" />
            <NavItem href="/dashboard" icon={<BarChart3 className="h-4 w-4" />} label="Dashboard" />
            <NavItem href="/venue/dashboard/events" icon={<Calendar className="h-4 w-4" />} label="Events" badge={3} />
            <NavItem href="/music" icon={<Music className="h-4 w-4" />} label="Music" />
            <NavItem href="/network" icon={<Users className="h-4 w-4" />} label="Network" />
            <NavItem href="/messages" icon={<MessageSquare className="h-4 w-4" />} label="Messages" badge={2} />
            <NavItem href="/venue/bookings" icon={<Clock className="h-4 w-4" />} label="Bookings" badge={5} />
            <NavItem href="/venue/staff" icon={<Users className="h-4 w-4" />} label="Team" isNew={true} />
          </NavGroup>

          {/* Content */}
          <NavGroup title="Content">
            <NavItem href="/content/posts" icon={<FileText className="h-4 w-4" />} label="Posts" />
            <NavItem href="/content/photos" icon={<ImageIcon className="h-4 w-4" />} label="Photos" />
            <NavItem href="/content/videos" icon={<Video className="h-4 w-4" />} label="Videos" />
            <NavItem href="/epk" icon={<FileText className="h-4 w-4" />} label="EPK" badge="Free" />
          </NavGroup>

          {/* Venues & Events */}
          <NavGroup title="Venues & Events">
            <NavItem href="/venues" icon={<Building className="h-4 w-4" />} label="Venues" />
            <NavItem href="/equipment" icon={<Mic className="h-4 w-4" />} label="Equipment" isNew={true} />
            <NavItem href="/venue/dashboard/events/map" icon={<Map className="h-4 w-4" />} label="Event Map" />
            <NavItem href="/venue/dashboard/tickets" icon={<Ticket className="h-4 w-4" />} label="Tickets" />
          </NavGroup>

          {/* Business */}
          <NavGroup title="Business">
            <NavItem href="/jobs" icon={<Briefcase className="h-4 w-4" />} label="Jobs" badge={3} />
            <NavItem href="/merch" icon={<ShoppingBag className="h-4 w-4" />} label="Merchandise" />
            <NavItem href="/promotions" icon={<Zap className="h-4 w-4" />} label="Promotions" />
            <NavItem href="/venue/analytics" icon={<BarChart3 className="h-4 w-4" />} label="Analytics" />
            <NavItem href="/venue/finances" icon={<DollarSign className="h-4 w-4" />} label="Finances" isNew={true} />
          </NavGroup>

          {/* Resources */}
          <NavGroup title="Resources">
            <NavItem href="/documents" icon={<FileText className="h-4 w-4" />} label="Documents" />
            <NavItem href="/gallery" icon={<ImageIcon className="h-4 w-4" />} label="Gallery" />
            <NavItem href="/help" icon={<HelpCircle className="h-4 w-4" />} label="Help & Support" />
            <NavItem href="/docs" icon={<BookOpen className="h-4 w-4" />} label="Documentation" />
          </NavGroup>
        </div>
      </ScrollArea>

      <div className="mt-auto border-t p-4">
        <div className="flex items-center gap-3 mb-4">
          <Avatar>
            <AvatarImage src="/images/alex-profile.jpeg" alt="Alex Johnson" />
            <AvatarFallback>AJ</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="text-sm font-medium">Alex Johnson</span>
            <span className="text-xs text-muted-foreground">alex@example.com</span>
          </div>
          <Button variant="ghost" size="icon" className="ml-auto" onClick={handleNavigation("/settings")}>
            <Settings className="h-4 w-4" />
            <span className="sr-only">Settings</span>
          </Button>
        </div>
        <Button variant="outline" className="w-full justify-start gap-2" onClick={handleNavigation("/settings")}>
          <Settings className="h-4 w-4" />
          <span>Settings</span>
        </Button>
      </div>
    </>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <div className={cn("hidden lg:flex w-64 flex-col border-r bg-background sticky top-16 h-[calc(100vh-4rem)] z-10", className)}>
        <SidebarContent />
      </div>

      {/* Mobile sidebar (slide-out) */}
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="left" className="p-0 w-[280px]">
          <SidebarContent />
        </SheetContent>
      </Sheet>
    </>
  )
}
