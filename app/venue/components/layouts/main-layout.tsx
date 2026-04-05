"use client"

import type React from "react"

import { useState } from "react"
import { usePathname } from "next/navigation"
import { Bell, Grid3X3, MessageSquare, Moon, Music, Search, Sun, User, Users, TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { MegaMenu } from "../navigation/mega-menu"
import { useToast } from "@/hooks/use-toast"

interface MainLayoutProps {
  children: React.ReactNode
}

export function MainLayout({ children }: MainLayoutProps) {
  const [darkMode, setDarkMode] = useState(true)
  const [isMegaMenuOpen, setIsMegaMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const pathname = usePathname()
  const { toast } = useToast()

  // Mock user data
  const user = {
    fullName: "Alex Johnson",
    username: "alexj",
    avatar: "/images/alex-profile.jpeg",
  }

  // Toggle dark mode
  const toggleDarkMode = () => {
    setDarkMode(!darkMode)
    document.documentElement.classList.toggle("dark", !darkMode)
    toast({
      title: darkMode ? "Light mode activated" : "Dark mode activated",
      description: darkMode ? "Switched to light theme" : "Switched to dark theme",
    })
  }

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) return

    toast({
      title: "Search results",
      description: `Found results for "${searchQuery}"`,
    })
  }

  // Navigation items
  const mainNavItems = [
    { name: "Feed", href: "/feed", icon: "home" },
    { name: "Team", href: "/venue/staff", icon: "users" },
    { name: "Messages", href: "/messages", icon: "message-square" },
    { name: "Events", href: "/venue/dashboard/events", icon: "calendar" },
    { name: "Music", href: "/music", icon: "music" },
    { name: "All Features", href: "/features", icon: "grid" },
  ]

  return (
    <div className={darkMode ? "bg-gray-900 text-white min-h-screen" : "bg-gray-100 text-gray-900 min-h-screen"}>
      {/* Header */}
      <header
        className={`sticky top-0 z-10 ${
          darkMode ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"
        } border-b`}
      >
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="h-8">
                {darkMode ? (
                  <img src="/images/tourify-logo-white.png" alt="Tourify Logo" className="h-full" />
                ) : (
                  <div className="flex items-center">
                    <Music className="h-6 w-6 text-purple-500 mr-2" />
                    <span className="text-xl font-bold">Tourify</span>
                  </div>
                )}
              </div>
              <form onSubmit={handleSearch} className="relative hidden md:block">
                <Input
                  placeholder="Search..."
                  className={`pl-9 w-64 ${darkMode ? "bg-gray-800 border-gray-700" : "bg-gray-100 border-gray-300"}`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button type="submit" className="absolute left-3 top-1/2 transform -translate-y-1/2">
                  <Search className="h-4 w-4 text-gray-400" />
                </button>
              </form>
            </div>

            <div className="flex items-center space-x-1 md:space-x-2">
              <Button
                variant="ghost"
                size="sm"
                className="hidden md:flex items-center text-purple-400 hover:text-purple-300 hover:bg-gray-800"
                onClick={() => setIsMegaMenuOpen(!isMegaMenuOpen)}
              >
                <Grid3X3 className="h-5 w-5 mr-2" />
                All Features
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setIsMegaMenuOpen(!isMegaMenuOpen)}
              >
                <Grid3X3 className="h-5 w-5" />
              </Button>

              <Button variant="ghost" size="icon" onClick={toggleDarkMode}>
                {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </Button>

              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                <span className="absolute top-0 right-0 h-4 w-4 bg-purple-500 rounded-full text-xs flex items-center justify-center">
                  3
                </span>
              </Button>

              <Button variant="ghost" size="icon">
                <MessageSquare className="h-5 w-5" />
              </Button>

              <div className="flex items-center space-x-2">
                <Avatar>
                  <AvatarImage src={user.avatar || "/placeholder.svg"} alt={user.fullName} />
                  <AvatarFallback>
                    {user.fullName
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden md:inline font-medium">{user.fullName}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Mega Menu */}
        <MegaMenu isOpen={isMegaMenuOpen} onClose={() => setIsMegaMenuOpen(false)} />
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Left Sidebar */}
          <div className="md:col-span-3 space-y-4">
            <div className={`rounded-lg p-4 ${darkMode ? "bg-gray-800" : "bg-white"} shadow`}>
              <div className="flex items-center space-x-3 mb-6">
                <Avatar className="h-14 w-14">
                  <AvatarImage src={user.avatar || "/placeholder.svg"} alt={user.fullName} />
                  <AvatarFallback>
                    {user.fullName
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="font-bold">{user.fullName}</h2>
                  <p className="text-sm text-gray-500">@{user.username}</p>
                </div>
              </div>

              <nav className="space-y-1">
                {mainNavItems.map((item) => {
                  let Icon
                  switch (item.icon) {
                    case "home":
                      Icon = () => (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="h-5 w-5 mr-3"
                        >
                          <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                          <polyline points="9 22 9 12 15 12 15 22" />
                        </svg>
                      )
                      break
                    case "users":
                      Icon = () => (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="h-5 w-5 mr-3"
                        >
                          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                          <circle cx="9" cy="7" r="4" />
                          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                        </svg>
                      )
                      break
                    case "message-square":
                      Icon = () => <MessageSquare className="h-5 w-5 mr-3" />
                      break
                    case "calendar":
                      Icon = () => (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="h-5 w-5 mr-3"
                        >
                          <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                          <line x1="16" x2="16" y1="2" y2="6" />
                          <line x1="8" x2="8" y1="2" y2="6" />
                          <line x1="3" x2="21" y1="10" y2="10" />
                        </svg>
                      )
                      break
                    case "music":
                      Icon = () => <Music className="h-5 w-5 mr-3" />
                      break
                    case "grid":
                      Icon = () => <Grid3X3 className="h-5 w-5 mr-3" />
                      break
                    default:
                      Icon = () => <div className="h-5 w-5 mr-3" />
                  }

                  return (
                    <Button
                      key={item.name}
                      variant="ghost"
                      className={`w-full justify-start rounded-md px-3 py-2 text-sm ${
                        pathname === item.href ? "bg-purple-900/20 text-purple-400" : ""
                      }`}
                      asChild
                    >
                      <a href={item.href}>
                        <Icon />
                        {item.name}
                        {item.name === "All Features" && (
                          <span className="ml-auto bg-gradient-to-r from-purple-600 to-blue-500 text-white text-xs px-2 py-0.5 rounded-full">
                            New
                          </span>
                        )}
                      </a>
                    </Button>
                  )
                })}
              </nav>
            </div>

            {/* Quick Access */}
            <div className={`rounded-lg p-4 ${darkMode ? "bg-gray-800" : "bg-white"} shadow`}>
              <h3 className="font-semibold mb-3 flex items-center">
                <Zap className="h-4 w-4 mr-2 text-purple-400" />
                Quick Access
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" className="justify-start">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload
                </Button>
                <Button variant="outline" size="sm" className="justify-start">
                  <Calendar className="h-4 w-4 mr-2" />
                  Events
                </Button>
                <Button variant="outline" size="sm" className="justify-start">
                  <Users className="h-4 w-4 mr-2" />
                  Network
                </Button>
                <Button variant="outline" size="sm" className="justify-start">
                  <Ticket className="h-4 w-4 mr-2" />
                  Tickets
                </Button>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="md:col-span-6">{children}</div>

          {/* Right Sidebar */}
          <div className="md:col-span-3 space-y-4">
            {/* Feature Spotlight */}
            <div className={`rounded-lg p-4 ${darkMode ? "bg-gray-800" : "bg-white"} shadow`}>
              <h3 className="font-semibold mb-3 flex items-center">
                <Sparkles className="h-4 w-4 mr-2 text-purple-400" />
                Feature Spotlight
              </h3>
              <div className="space-y-3">
                <div className="rounded-md bg-gradient-to-r from-purple-900/20 to-blue-900/20 p-3 border border-purple-500/20">
                  <h4 className="font-medium text-purple-400">EPK Creator</h4>
                  <p className="text-sm text-gray-400 mt-1">
                    Create professional electronic press kits for your music career.
                  </p>
                  <Button size="sm" variant="link" className="text-purple-400 p-0 h-auto mt-2">
                    Try it now →
                  </Button>
                </div>
                <div className="rounded-md bg-gradient-to-r from-purple-900/20 to-blue-900/20 p-3 border border-purple-500/20">
                  <h4 className="font-medium text-purple-400">Tour Calendar</h4>
                  <p className="text-sm text-gray-400 mt-1">
                    Plan and manage your tour dates with our interactive calendar.
                  </p>
                  <Button size="sm" variant="link" className="text-purple-400 p-0 h-auto mt-2">
                    Explore →
                  </Button>
                </div>
              </div>
              <Button variant="outline" className="w-full mt-3">
                View All Features
              </Button>
            </div>

            {/* Trending Topics */}
            <div className={`rounded-lg p-4 ${darkMode ? "bg-gray-800" : "bg-white"} shadow`}>
              <h3 className="font-semibold mb-3 flex items-center">
                <TrendingUp className="h-4 w-4 mr-2 text-purple-400" />
                Trending Topics
              </h3>
              <div className="space-y-2">
                {["TourLife", "SummerFestivals", "SoundEngineering", "MusicProduction"].map((tag) => (
                  <div key={tag} className="flex justify-between items-center">
                    <Badge
                      className="bg-purple-900/20 hover:bg-purple-900/30 text-purple-400 border-purple-500/20 cursor-pointer"
                    >
                      #{tag}
                    </Badge>
                    <span className="text-xs text-gray-500">{Math.floor(Math.random() * 1000) + 100} posts</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-gray-800 border-t border-gray-700 z-10">
        <div className="flex justify-around">
          <Button
            variant="ghost"
            className={`flex-1 flex flex-col items-center py-2 ${pathname === "/feed" ? "text-purple-400" : ""}`}
            asChild
          >
            <a href="/feed">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
              >
                <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              <span className="text-xs mt-1">Home</span>
            </a>
          </Button>
          <Button
            variant="ghost"
            className={`flex-1 flex flex-col items-center py-2 ${pathname === "/venue/staff" ? "text-purple-400" : ""}`}
            asChild
          >
            <a href="/venue/staff">
              <Users className="h-5 w-5" />
              <span className="text-xs mt-1">Team</span>
            </a>
          </Button>
          <Button
            variant="ghost"
            className="flex-1 flex flex-col items-center py-2"
            onClick={() => setIsMegaMenuOpen(!isMegaMenuOpen)}
          >
            <Grid3X3 className="h-5 w-5" />
            <span className="text-xs mt-1">Features</span>
          </Button>
          <Button
            variant="ghost"
            className={`flex-1 flex flex-col items-center py-2 ${pathname === "/messages" ? "text-purple-400" : ""}`}
            asChild
          >
            <a href="/messages">
              <MessageSquare className="h-5 w-5" />
              <span className="text-xs mt-1">Messages</span>
            </a>
          </Button>
          <Button
            variant="ghost"
            className={`flex-1 flex flex-col items-center py-2 ${pathname === "/profile" ? "text-purple-400" : ""}`}
            asChild
          >
            <a href="/profile">
              <User className="h-5 w-5" />
              <span className="text-xs mt-1">Profile</span>
            </a>
          </Button>
        </div>
      </div>
    </div>
  )
}

// Import missing icons
import { Zap, Upload, Ticket, Sparkles, Calendar, Badge } from "lucide-react"
