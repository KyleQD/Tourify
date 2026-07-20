"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  Home,
  Calendar,
  Users,
  BarChart3,
  Settings,
  FileText,
  DollarSign,
  MessageSquare,
  ChevronRight,
  Mic,
  Clock,
  Building,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { useToast } from "@/hooks/use-toast"

export function VenueSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { toast } = useToast()

  // Track expanded state of collapsible sections
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    main: true,
    management: true,
    analytics: false,
  })

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }))
  }

  // Check if a route is active
  const isActive = (href: string) => {
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  // Handle navigation
  const handleNavigation = (href: string) => {
    router.push(href)
    toast({
      title: "Navigating",
      description: `Going to ${href}`,
    })
  }

  // Render a navigation item
  const NavItem = ({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) => (
    <Button
      variant="ghost"
      className={cn(
        "w-full justify-start gap-3 px-3 py-2 text-sm",
        isActive(href) ? "bg-white/10 text-white font-medium" : "text-gray-300 hover:bg-white/5 hover:text-white",
      )}
      onClick={() => handleNavigation(href)}
    >
      {icon}
      {label}
    </Button>
  )

  // Render a navigation group with collapsible content
  const NavGroup = ({
    title,
    children,
    defaultOpen = false,
  }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) => {
    const sectionKey = title.toLowerCase()
    const isOpen = expandedSections[sectionKey] ?? defaultOpen

    return (
      <Collapsible open={isOpen} onOpenChange={() => toggleSection(sectionKey)}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between px-3 py-1.5 text-sm font-medium text-gray-300">
            {title}
            <ChevronRight className={cn("h-4 w-4 transition-transform", isOpen && "rotate-90")} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-1 px-1 py-1">{children}</CollapsibleContent>
      </Collapsible>
    )
  }

  return (
    <div className="hidden md:flex w-64 flex-col bg-gray-900 md:sticky md:top-16 md:h-[calc(100vh-4rem)] z-10">
      <ScrollArea className="flex-1 px-2 py-4">
        <div className="space-y-4">
          {/* Main Navigation */}
          <NavGroup title="Main" defaultOpen={true}>
            <NavItem href="/venue/dashboard" icon={<Home className="h-4 w-4" />} label="Dashboard" />
            <NavItem href="/venue/events" icon={<Calendar className="h-4 w-4" />} label="Events" />
            <NavItem href="/venue/bookings" icon={<Clock className="h-4 w-4" />} label="Bookings" />
            <NavItem href="/venue/staff" icon={<Users className="h-4 w-4" />} label="Team" />
            <NavItem href="/venue/messages" icon={<MessageSquare className="h-4 w-4" />} label="Messages" />
          </NavGroup>

          {/* Management */}
          <NavGroup title="Management" defaultOpen={true}>
            <NavItem href="/venue/equipment" icon={<Mic className="h-4 w-4" />} label="Equipment" />
            <NavItem href="/venue/finances" icon={<DollarSign className="h-4 w-4" />} label="Finances" />
            <NavItem href="/venue/documents" icon={<FileText className="h-4 w-4" />} label="Documents" />
            <NavItem href="/venue/settings" icon={<Settings className="h-4 w-4" />} label="Settings" />
          </NavGroup>

          {/* Analytics */}
          <NavGroup title="Analytics">
            <NavItem href="/venue/analytics" icon={<BarChart3 className="h-4 w-4" />} label="Event Analytics" />
            <NavItem
              href="/venue/analytics"
              icon={<DollarSign className="h-4 w-4" />}
              label="Financial Reports"
            />
            <NavItem href="/venue/analytics" icon={<Users className="h-4 w-4" />} label="Audience Insights" />
          </NavGroup>
        </div>
      </ScrollArea>

      <div className="mt-auto border-t border-gray-800 p-4">
        <Link href="/venues" className="flex items-center gap-3 text-gray-300 hover:text-white">
          <Building className="h-5 w-5" />
          <span className="text-sm font-medium">Back to Venues</span>
        </Link>
      </div>
    </div>
  )
}
