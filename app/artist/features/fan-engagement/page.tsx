"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Heart,
  Users,
  TrendingUp,
  ArrowLeft,
  MessageSquare,
  Star,
  UserPlus,
} from "lucide-react"
import { FanClubManager } from "./fan-club"

interface FollowerProfile {
  id: string
  full_name: string | null
  username: string | null
  avatar_url: string | null
  is_verified: boolean
  created_at: string
}

export default function FanEngagementPage() {
  const [followers, setFollowers] = useState<FollowerProfile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [followersCount, setFollowersCount] = useState(0)

  useEffect(() => {
    async function loadFollowers() {
      try {
        const res = await fetch('/api/community/stats')
        if (res.ok) {
          const data = await res.json()
          setFollowersCount(data.featureStats?.fanEngagement?.total || 0)
        }
      } catch {
        // Graceful fallback
      } finally {
        setIsLoading(false)
      }
    }
    loadFollowers()
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Header */}
      <div className="border-b border-slate-800/50 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="p-6">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center justify-between"
          >
            <div className="flex items-center space-x-4">
              <Link href="/artist/community">
                <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Community Hub
                </Button>
              </Link>
              <div className="space-y-1">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-pink-400 to-rose-400 bg-clip-text text-transparent">
                  Fan Engagement
                </h1>
                <p className="text-sm text-slate-400">Manage your fan club and connect with your audience</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="p-6 space-y-8">
        {/* Stats overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="grid gap-6 md:grid-cols-3"
        >
          {[
            { label: "Total Followers", value: isLoading ? '...' : followersCount.toLocaleString(), icon: Users, color: "pink" },
            { label: "Engagement Rate", value: isLoading ? '...' : '—', icon: TrendingUp, color: "rose" },
            { label: "Fan Club Members", value: "0", icon: Star, color: "purple" },
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
            >
              <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-400">{stat.label}</p>
                      <p className="text-2xl font-bold text-white">{stat.value}</p>
                    </div>
                    <div className={`h-12 w-12 bg-gradient-to-br from-${stat.color}-500 to-${stat.color}-600 rounded-xl flex items-center justify-center`}>
                      <stat.icon className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Fan Club Manager */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <FanClubManager />
        </motion.div>

        {/* Quick links */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.7 }}
        >
          <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-slate-200">Related Features</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Link href="/artist/network">
                  <Button variant="outline" className="w-full h-auto p-4 flex flex-col items-center gap-2 border-slate-700 hover:bg-slate-800/50">
                    <UserPlus className="h-6 w-6 text-blue-400" />
                    <span className="text-slate-300">Grow Network</span>
                  </Button>
                </Link>
                <Link href="/artist/messages">
                  <Button variant="outline" className="w-full h-auto p-4 flex flex-col items-center gap-2 border-slate-700 hover:bg-slate-800/50">
                    <MessageSquare className="h-6 w-6 text-purple-400" />
                    <span className="text-slate-300">Messages</span>
                  </Button>
                </Link>
                <Link href="/artist/events">
                  <Button variant="outline" className="w-full h-auto p-4 flex flex-col items-center gap-2 border-slate-700 hover:bg-slate-800/50">
                    <Heart className="h-6 w-6 text-pink-400" />
                    <span className="text-slate-300">Fan Events</span>
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
