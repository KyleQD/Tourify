"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import {
  Music,
  Calendar,
  Users,
  MessageSquare,
  FileText,
  Ticket,
  ShoppingBag,
  BarChart3,
  Upload,
  PenTool,
  Briefcase,
  Zap,
  X,
  Plus,
  Search,
} from "lucide-react"

interface QuickAccessPanelProps {
  isOpen: boolean
  onClose: () => void
}

export function QuickAccessPanel({ isOpen, onClose }: QuickAccessPanelProps) {
  const router = useRouter()

  const quickActions = [
    { title: "Upload Music", icon: Upload, color: "bg-purple-500", href: "/music/upload" },
    { title: "Create Post", icon: PenTool, color: "bg-blue-500", href: "/content/posts/new" },
    { title: "Schedule Event", icon: Calendar, color: "bg-green-500", href: "/events/new" },
    { title: "Create Job", icon: Briefcase, color: "bg-amber-500", href: "/jobs" },
    { title: "Launch Promotion", icon: Zap, color: "bg-red-500", href: "/promotions/new" },
  ]

  const frequentlyUsed = [
    { title: "Music Library", icon: Music, href: "/music/library" },
    { title: "Messages", icon: MessageSquare, href: "/messages", badge: 5 },
    { title: "Network", icon: Users, href: "/network" },
    { title: "Events", icon: Calendar, href: "/events", badge: 3 },
    { title: "EPK", icon: FileText, href: "/epk" },
    { title: "Analytics", icon: BarChart3, href: "/analytics" },
    { title: "Tickets", icon: Ticket, href: "/tickets" },
    { title: "Merch", icon: ShoppingBag, href: "/merch" },
  ]

  const handleNavigation = (href: string) => {
    router.push(href)
    onClose()
  }

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && <div className="fixed inset-0 bg-black/80 z-40" onClick={onClose} />}

      {/* Quick Access Panel */}
      <aside
        className={cn(
          "fixed top-0 right-0 z-50 h-full w-80 bg-gray-900 border-l border-gray-800 transition-transform duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="flex h-16 items-center justify-between px-4 border-b border-gray-800">
          <h2 className="text-lg font-semibold">Quick Access</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <ScrollArea className="h-[calc(100vh-4rem)]">
          <div className="p-4 space-y-6">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search features..."
                className="w-full bg-gray-800 border border-gray-700 rounded-md py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            {/* Quick Actions */}
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-3">Quick Actions</h3>
              <div className="grid grid-cols-2 gap-3">
                {quickActions.map((action) => (
                  <Button
                    key={action.title}
                    variant="outline"
                    className="flex flex-col items-center justify-center h-24 border-gray-700 hover:bg-gray-800 hover:border-gray-600"
                    onClick={() => handleNavigation(action.href)}
                  >
                    <div className={`${action.color} p-2 rounded-full mb-2`}>
                      <action.icon className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-sm">{action.title}</span>
                  </Button>
                ))}
                <Button
                  variant="outline"
                  className="flex flex-col items-center justify-center h-24 border-dashed border-gray-700 hover:bg-gray-800 hover:border-gray-600"
                >
                  <div className="bg-gray-800 p-2 rounded-full mb-2">
                    <Plus className="h-5 w-5" />
                  </div>
                  <span className="text-sm">Add Custom</span>
                </Button>
              </div>
            </div>

            {/* Frequently Used */}
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-3">Frequently Used</h3>
              <div className="space-y-1">
                {frequentlyUsed.map((item) => (
                  <Button
                    key={item.title}
                    variant="ghost"
                    className="w-full justify-start text-gray-300 hover:text-white hover:bg-gray-800"
                    onClick={() => handleNavigation(item.href)}
                  >
                    <item.icon className="h-5 w-5 mr-3" />
                    {item.title}
                    {item.badge && (
                      <span className="ml-auto bg-purple-600 text-white text-xs rounded-full h-5 min-w-5 flex items-center justify-center px-1">
                        {item.badge}
                      </span>
                    )}
                  </Button>
                ))}
              </div>
            </div>

            {/* Recent */}
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-3">Recent</h3>
              <div className="space-y-1">
                <Button
                  variant="ghost"
                  className="w-full justify-start text-gray-300 hover:text-white hover:bg-gray-800"
                  onClick={() => handleNavigation("/music/tracks/summer-vibes")}
                >
                  <Music className="h-5 w-5 mr-3" />
                  Summer Vibes (Track)
                  <span className="ml-auto text-xs text-gray-400">2m ago</span>
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-gray-300 hover:text-white hover:bg-gray-800"
                  onClick={() => handleNavigation("/events/summer-tour")}
                >
                  <Calendar className="h-5 w-5 mr-3" />
                  Summer Tour
                  <span className="ml-auto text-xs text-gray-400">1h ago</span>
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-gray-300 hover:text-white hover:bg-gray-800"
                  onClick={() => handleNavigation("/analytics/audience")}
                >
                  <BarChart3 className="h-5 w-5 mr-3" />
                  Audience Analytics
                  <span className="ml-auto text-xs text-gray-400">3h ago</span>
                </Button>
              </div>
            </div>
          </div>
        </ScrollArea>
      </aside>
    </>
  )
}
