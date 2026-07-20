"use client"

import { Calendar } from "@/components/ui/calendar"

import { useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Bell, Menu, Search, Settings, LogOut, User, HelpCircle, Command, MessageSquare } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { TourifyLogo } from "@/components/tourify-logo"
import { EnhancedNotificationCenter } from "@/components/notifications/enhanced-notification-center"

interface TopNavigationProps {
  onSidebarOpen: () => void
  onCommandOpen: () => void
}

export function TopNavigation({ onSidebarOpen, onCommandOpen }: TopNavigationProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { toast } = useToast()
  const [searchOpen, setSearchOpen] = useState(false)

  // Check if we're in a venue route
  const isVenueRoute = pathname.startsWith("/(venue)") || pathname.startsWith("/venue")

  const handleNavigation = (path: string) => {
    router.push(path)
    toast({
      title: "Navigating",
      description: `Going to ${path}`,
    })
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-4 sm:px-6">
      {/* Mobile menu button - only show on non-venue routes */}
      {!isVenueRoute && (
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={onSidebarOpen}>
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      )}

      {/* Logo (mobile only) */}
      <div className="flex lg:hidden">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <TourifyLogo variant="light" size="md" />
        </Link>
      </div>

      {/* Spacer to push content to the right on desktop */}
      <div className="hidden lg:block lg:w-64"></div>

      {/* Search */}
      <div className={`relative flex-1 ${searchOpen ? "block" : "hidden md:block"}`}>
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search..."
          className="w-full bg-background pl-8 md:w-2/3 lg:w-1/3"
          onFocus={() => setSearchOpen(true)}
          onBlur={() => setSearchOpen(false)}
        />
      </div>

      {/* Right side actions */}
      <div className="flex items-center gap-2">
        {/* Command menu button */}
        <Button variant="outline" size="sm" className="hidden md:flex" onClick={onCommandOpen}>
          <Command className="mr-2 h-4 w-4" />
          <span>Command</span>
          <kbd className="ml-2 pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
            <span className="text-xs">⌘</span>K
          </kbd>
        </Button>

        {/* Notifications */}
        <EnhancedNotificationCenter />

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative h-8 w-8 rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarImage src="/images/alex-profile.jpeg" alt="Alex Johnson" />
                <AvatarFallback>AJ</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleNavigation("/profile")}>
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleNavigation("/settings")}>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleNavigation("/faq")}>
              <HelpCircle className="mr-2 h-4 w-4" />
              Help & Support
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleNavigation("/logout")}>
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
