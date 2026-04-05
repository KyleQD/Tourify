"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { CommandSearchButton } from "./command-search-button"
import {
  Bell,
  Calendar,
  Clock,
  Home,
  LayoutDashboard,
  Menu,
  MessageSquare,
  Music,
  Settings,
  Users,
  Building,
  Mic,
  DollarSign,
} from "lucide-react"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function MainNav() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)

  const routes = [
    {
      href: "/",
      label: "Home",
      icon: <Home className="h-4 w-4 mr-2" />,
      active: pathname === "/",
    },
    {
      href: "/dashboard",
      label: "Dashboard",
      icon: <LayoutDashboard className="h-4 w-4 mr-2" />,
      active: pathname === "/dashboard",
    },
    {
      href: "/venues",
      label: "Venues",
      icon: <Building className="h-4 w-4 mr-2" />,
      active: pathname.startsWith("/venues"),
    },
    {
      href: "/venue/dashboard/events",
      label: "Events",
      icon: <Calendar className="h-4 w-4 mr-2" />,
      active: pathname.startsWith("/venue/dashboard/events"),
      badge: 3,
    },
    {
      href: "/venue/bookings",
      label: "Bookings",
      icon: <Clock className="h-4 w-4 mr-2" />,
      active: pathname.startsWith("/venue/bookings"),
      badge: 5,
    },
    {
      href: "/music",
      label: "Music",
      icon: <Music className="h-4 w-4 mr-2" />,
      active: pathname.startsWith("/music"),
    },
    {
      href: "/venue/staff",
      label: "Teams",
      icon: <Users className="h-4 w-4 mr-2" />,
      active: pathname.startsWith("/venue/staff"),
      isNew: true,
    },
    {
      href: "/messages",
      label: "Messages",
      icon: <MessageSquare className="h-4 w-4 mr-2" />,
      active: pathname.startsWith("/messages"),
      badge: 2,
    },
    {
      href: "/equipment",
      label: "Equipment",
      icon: <Mic className="h-4 w-4 mr-2" />,
      active: pathname.startsWith("/equipment"),
      isNew: true,
    },
    {
      href: "/venue/finances",
      label: "Finances",
      icon: <DollarSign className="h-4 w-4 mr-2" />,
      active: pathname.startsWith("/venue/finances"),
      isNew: true,
    },
  ]

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="md:hidden mr-2">
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[240px] sm:w-[300px]">
              <nav className="flex flex-col gap-4 mt-6">
                {routes.map((route) => (
                  <Link
                    key={route.href}
                    href={route.href}
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      "flex items-center px-3 py-2 text-sm rounded-md hover:bg-accent",
                      route.active ? "bg-accent" : "transparent",
                    )}
                  >
                    {route.icon}
                    <span>{route.label}</span>
                    {route.badge && <Badge className="ml-auto bg-purple-600 text-white text-xs">{route.badge}</Badge>}
                    {route.isNew && (
                      <Badge
                        variant="outline"
                        className="ml-auto text-xs bg-purple-100 text-purple-800 border-purple-300"
                      >
                        New
                      </Badge>
                    )}
                  </Link>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
        <Link href="/" className="flex items-center space-x-2 mr-6">
          <img src="/images/tourify-logo.png" alt="Tourify" className="h-8 w-auto" />
        </Link>
        <nav className="hidden md:flex items-center space-x-1 lg:space-x-2 mx-6 overflow-x-auto">
          {routes.map((route) => (
            <Link
              key={route.href}
              href={route.href}
              className={cn(
                "flex items-center text-sm font-medium px-3 py-2 rounded-md transition-colors hover:bg-accent hover:text-accent-foreground",
                route.active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {route.icon}
              {route.label}
              {route.badge && <Badge className="ml-2 bg-purple-600 text-white text-xs">{route.badge}</Badge>}
              {route.isNew && (
                <Badge variant="outline" className="ml-2 text-xs bg-purple-100 text-purple-800 border-purple-300">
                  New
                </Badge>
              )}
            </Link>
          ))}
        </nav>
        <div className="flex items-center ml-auto space-x-2">
          <CommandSearchButton />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                <span className="sr-only">Notifications</span>
                <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-red-600"></span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel>Notifications</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="max-h-80 overflow-y-auto">
                <DropdownMenuItem className="flex flex-col items-start py-2">
                  <div className="font-medium">New booking request</div>
                  <div className="text-xs text-muted-foreground">The Echo Lounge - June 15, 2025</div>
                  <div className="text-xs text-muted-foreground mt-1">5 minutes ago</div>
                </DropdownMenuItem>
                <DropdownMenuItem className="flex flex-col items-start py-2">
                  <div className="font-medium">Team member invitation accepted</div>
                  <div className="text-xs text-muted-foreground">Sarah Williams joined your team</div>
                  <div className="text-xs text-muted-foreground mt-1">1 hour ago</div>
                </DropdownMenuItem>
                <DropdownMenuItem className="flex flex-col items-start py-2">
                  <div className="font-medium">New message</div>
                  <div className="text-xs text-muted-foreground">From: Blue Note Venue</div>
                  <div className="text-xs text-muted-foreground mt-1">3 hours ago</div>
                </DropdownMenuItem>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild className="justify-center font-medium">
                <Link href="/notifications">View all notifications</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="ghost" size="icon" asChild>
            <Link href="/settings">
              <Settings className="h-5 w-5" />
              <span className="sr-only">Settings</span>
            </Link>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src="/placeholder.svg?height=32&width=32&text=AJ" alt="User" />
                  <AvatarFallback>AJ</AvatarFallback>
                </Avatar>
                <span className="sr-only">User menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/profile">Profile</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings">Settings</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/billing">Billing</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Log out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
