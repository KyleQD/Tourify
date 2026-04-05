"use client"

import { useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import {
  Menu,
  Home,
  Calendar,
  Music,
  Users,
  MessageSquare,
  Settings,
  Building,
  Search,
  Bell,
  Briefcase,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export function MobileNavigation() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const { toast } = useToast()

  // Check if a route is active
  const isActive = (path: string) => {
    return pathname === path || pathname.startsWith(`${path}/`)
  }

  const handleNavigation = (path: string) => {
    router.push(path)
    toast({
      title: "Navigating",
      description: `Going to ${path}`,
    })
  }

  // Check if we're in a venue route
  const isVenueRoute = pathname.startsWith("/(venue)") || pathname.startsWith("/venue")

  return (
    <>
      {/* Fixed bottom navigation for quick access */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-background border-t md:hidden">
        <div className="grid grid-cols-5 h-16">
          <Button
            variant="ghost"
            className={`flex flex-col h-full rounded-none ${isActive("/") ? "text-primary" : ""}`}
            onClick={() => handleNavigation("/")}
          >
            <Home className="h-5 w-5" />
            <span className="text-xs mt-1">Home</span>
          </Button>
          <Button
            variant="ghost"
            className={`flex flex-col h-full rounded-none ${isActive("/venue/dashboard/events") ? "text-primary" : ""}`}
            onClick={() => handleNavigation("/venue/dashboard/events")}
          >
            <Calendar className="h-5 w-5" />
            <span className="text-xs mt-1">Events</span>
          </Button>
          <Button
            variant="ghost"
            className={`flex flex-col h-full rounded-none ${isActive("/venue/staff") ? "text-primary" : ""}`}
            onClick={() => handleNavigation("/venue/staff")}
          >
            <Users className="h-5 w-5" />
            <span className="text-xs mt-1">Team</span>
          </Button>
          <Button
            variant="ghost"
            className={`flex flex-col h-full rounded-none ${isActive("/messages") ? "text-primary" : ""}`}
            onClick={() => handleNavigation("/messages")}
          >
            <MessageSquare className="h-5 w-5" />
            <span className="text-xs mt-1">Messages</span>
          </Button>
          <Button variant="ghost" className="flex flex-col h-full rounded-none" onClick={() => setOpen(true)}>
            <Menu className="h-5 w-5" />
            <span className="text-xs mt-1">More</span>
          </Button>
        </div>
      </div>

      {/* Full menu sheet */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-[85%] sm:w-[350px] p-0">
          <div className="flex flex-col h-full">
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold">Menu</h2>
            </div>
            <div className="flex-1 overflow-auto p-4 space-y-4">
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Main</h3>
                {[
                  { href: "/", icon: <Home className="h-4 w-4 mr-3" />, label: "Home" },
                  { href: "/dashboard", icon: <Search className="h-4 w-4 mr-3" />, label: "Dashboard" },
                  { href: "/venue/dashboard/events", icon: <Calendar className="h-4 w-4 mr-3" />, label: "Events" },
                  { href: "/venue/staff", icon: <Users className="h-4 w-4 mr-3" />, label: "Team" },
                  { href: "/messages", icon: <MessageSquare className="h-4 w-4 mr-3" />, label: "Messages" },
                ].map((item) => (
                  <Button
                    key={item.href}
                    variant="ghost"
                    className={`w-full justify-start ${isActive(item.href) ? "bg-muted" : ""}`}
                    onClick={() => {
                      setOpen(false)
                      handleNavigation(item.href)
                    }}
                  >
                    {item.icon}
                    {item.label}
                  </Button>
                ))}
              </div>

              <div className="space-y-1">
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Venues</h3>
                {[
                  { href: "/venues", icon: <Building className="h-4 w-4 mr-3" />, label: "Venues" },
                  { href: "/equipment", icon: <Music className="h-4 w-4 mr-3" />, label: "Equipment" },
                  { href: "/venue/bookings", icon: <Calendar className="h-4 w-4 mr-3" />, label: "Bookings" },
                  { href: "/venue/finances", icon: <Briefcase className="h-4 w-4 mr-3" />, label: "Finances" },
                ].map((item) => (
                  <Button
                    key={item.href}
                    variant="ghost"
                    className={`w-full justify-start ${isActive(item.href) ? "bg-muted" : ""}`}
                    onClick={() => {
                      setOpen(false)
                      handleNavigation(item.href)
                    }}
                  >
                    {item.icon}
                    {item.label}
                  </Button>
                ))}
              </div>

              <div className="space-y-1">
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Account</h3>
                {[
                  { href: "/settings", icon: <Settings className="h-4 w-4 mr-3" />, label: "Settings" },
                  { href: "/notifications", icon: <Bell className="h-4 w-4 mr-3" />, label: "Notifications" },
                ].map((item) => (
                  <Button
                    key={item.href}
                    variant="ghost"
                    className={`w-full justify-start ${isActive(item.href) ? "bg-muted" : ""}`}
                    onClick={() => {
                      setOpen(false)
                      handleNavigation(item.href)
                    }}
                  >
                    {item.icon}
                    {item.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
