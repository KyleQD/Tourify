"use client"

import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { JukeboxPlayer } from "@/components/dashboard/jukebox-player"
import type { LucideIcon } from "lucide-react"
import {
  ArrowRight,
  BarChart3,
  BriefcaseBusiness,
  Calendar,
  FileText,
  Music,
  Settings,
  Star,
  Zap,
} from "lucide-react"

interface QuickAction {
  id: string
  title: string
  description: string
  icon: LucideIcon
  href: string
  iconColor: string
}

interface EnhancedQuickActionsProps {
  hideJukebox?: boolean
}

const GENERAL_QUICK_ACTIONS: QuickAction[] = [
  {
    id: "work-hub",
    title: "Work Hub",
    description: "Search gigs, track applications, and manage upcoming work",
    icon: BriefcaseBusiness,
    href: "/work",
    iconColor: "from-cyan-500 to-blue-500",
  },
  {
    id: "events",
    title: "Events",
    description: "Find local events, track plans, and promote what matters",
    icon: Calendar,
    href: "/events",
    iconColor: "from-emerald-500 to-teal-500",
  },
  {
    id: "blogs-articles",
    title: "Blogs/Articles",
    description: "Manage drafts, publish articles, and review your writing",
    icon: FileText,
    href: "/blog/manage",
    iconColor: "from-amber-500 to-orange-500",
  },
  {
    id: "analytics-dashboard",
    title: "Analytics Dashboard",
    description: "Review dashboard-level performance and activity signals",
    icon: BarChart3,
    href: "/analytics?scope=dashboard",
    iconColor: "from-violet-500 to-fuchsia-500",
  },
  {
    id: "music",
    title: "Music",
    description: "Listen, save tracks, and build playlists",
    icon: Music,
    href: "/music",
    iconColor: "from-pink-500 to-rose-500",
  },
  {
    id: "manage-profile",
    title: "Manage Profile",
    description: "Update your general profile and visibility settings",
    icon: Settings,
    href: "/settings/profile",
    iconColor: "from-slate-500 to-gray-500",
  },
]

export function EnhancedQuickActions({ hideJukebox = false }: EnhancedQuickActionsProps) {
  const router = useRouter()

  const handleActionClick = (action: QuickAction) => {
    try {
      router.push(action.href)
    } catch (error) {
      console.error('Navigation error:', error)
      window.location.href = action.href
    }
  }

  return (
    <div className="space-y-6 max-w-full overflow-hidden">
      {/* Jukebox Player - Replaces Recent Actions */}
      {!hideJukebox ? <JukeboxPlayer /> : null}

      {/* Quick Actions */}
      <Card className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-white flex items-center gap-2 text-lg">
            <Zap className="h-5 w-5 text-purple-400" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 px-4 pb-4">
          {GENERAL_QUICK_ACTIONS.map((action) => {
            return (
              <Button
                key={action.id}
                variant="ghost"
                className="w-full justify-start p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all duration-300 group h-auto"
                onClick={() => handleActionClick(action)}
              >
                <div className={`w-8 h-8 bg-gradient-to-br ${action.iconColor} rounded-lg flex items-center justify-center mr-3 flex-shrink-0`}>
                  <action.icon className="h-4 w-4 text-white" />
                </div>
                
                <div className="flex-1 text-left min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-white truncate text-sm sm:text-base">{action.title}</span>
                    </div>
                    <p className="text-xs text-gray-400 truncate">{action.description}</p>
                  </div>
                
                <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-white transition-colors flex-shrink-0 ml-2" />
              </Button>
            )
          })}
        </CardContent>
      </Card>

      {/* Platform Features Summary */}
      <Card className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 backdrop-blur-xl rounded-2xl overflow-hidden">
        <CardContent className="p-6">
          <div className="text-center">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Star className="h-6 w-6 text-white" />
            </div>
            <h3 className="font-semibold text-white mb-2">Platform Features</h3>
            <p className="text-sm text-gray-300 mb-4">
              Explore all the tools available to you
            </p>
            <div className="flex items-center justify-center space-x-4 text-xs text-gray-400 mb-4">
              <span>4/13 Features Used</span>
              <div className="w-16 h-1 bg-white/20 rounded-full">
                <div className="w-8 h-1 bg-purple-500 rounded-full"></div>
              </div>
              <span>31%</span>
            </div>
            <Button 
              size="sm"
              variant="outline"
              className="border-purple-500/50 text-purple-300 hover:bg-purple-500/20"
              onClick={() => router.push('/faq')}
            >
              Explore Features
              <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 
