"use client"

import React, { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import {
  Users, Search, Plus, Music, MapPin, MessageCircle,
  UserPlus, Star, TrendingUp, Globe, Instagram,
  Twitter, Youtube, Music2, UserMinus, Loader2,
} from "lucide-react"

interface NetworkUser {
  id: string
  name: string
  username: string | null
  role: string | null
  location: string | null
  avatar: string | null
  isFollowing: boolean
}

function UserCard({ user, onToggleFollow, isProcessing }: {
  user: NetworkUser
  onToggleFollow: (userId: string, currentlyFollowing: boolean) => void
  isProcessing: boolean
}) {
  return (
    <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm transition-all duration-300 hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/10 rounded-xl shadow-lg">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <Avatar className="h-14 w-14">
            <AvatarImage src={user.avatar ?? undefined} />
            <AvatarFallback className="bg-purple-600 text-white">
              {(user.name || "?").split(" ").map((n) => n[0]).join("").slice(0, 2)}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-semibold text-white text-lg truncate">
                {user.name || "Unknown"}
              </h3>
              <Button
                size="sm"
                disabled={isProcessing}
                onClick={() => onToggleFollow(user.id, user.isFollowing)}
                className={
                  user.isFollowing
                    ? "border-slate-600 text-gray-300 hover:text-red-400 hover:border-red-500/50 rounded-xl"
                    : "bg-purple-600 text-white hover:bg-purple-700 rounded-xl"
                }
                variant={user.isFollowing ? "outline" : "default"}
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : user.isFollowing ? (
                  <>
                    <UserMinus className="h-4 w-4 mr-1" />
                    Unfollow
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-1" />
                    Follow
                  </>
                )}
              </Button>
            </div>
            {user.username && (
              <p className="text-purple-400 text-sm mb-1">@{user.username}</p>
            )}
            {user.role && (
              <p className="text-gray-400 text-sm mb-1">{user.role}</p>
            )}
            {user.location && (
              <div className="flex items-center gap-1.5 text-gray-500 text-sm">
                <MapPin className="h-3.5 w-3.5" />
                <span>{user.location}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function NetworkStats({ connectionCount, followerCount, followingCount }: {
  connectionCount: number
  followerCount: number
  followingCount: number
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm rounded-xl shadow-lg">
        <CardContent className="p-6 text-center">
          <Users className="h-8 w-8 text-purple-500 mx-auto mb-2" />
          <div className="text-2xl font-bold text-white">{connectionCount}</div>
          <div className="text-sm text-gray-400">Mutual Connections</div>
        </CardContent>
      </Card>

      <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm rounded-xl shadow-lg">
        <CardContent className="p-6 text-center">
          <UserPlus className="h-8 w-8 text-purple-500 mx-auto mb-2" />
          <div className="text-2xl font-bold text-white">{followerCount}</div>
          <div className="text-sm text-gray-400">Followers</div>
        </CardContent>
      </Card>

      <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm rounded-xl shadow-lg">
        <CardContent className="p-6 text-center">
          <TrendingUp className="h-8 w-8 text-purple-500 mx-auto mb-2" />
          <div className="text-2xl font-bold text-white">{followingCount}</div>
          <div className="text-sm text-gray-400">Following</div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function ArtistNetworkPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("discover")
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  const [following, setFollowing] = useState<NetworkUser[]>([])
  const [followers, setFollowers] = useState<NetworkUser[]>([])
  const [discoverUsers, setDiscoverUsers] = useState<NetworkUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set())

  const followingIds = new Set(following.map((u) => u.id))
  const followerIds = new Set(followers.map((u) => u.id))
  const mutualCount = following.filter((u) => followerIds.has(u.id)).length

  useEffect(() => {
    loadNetwork()
  }, [])

  async function loadNetwork() {
    setIsLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setCurrentUserId(user.id)

      const [followingRes, followersRes] = await Promise.all([
        supabase
          .from("follows")
          .select("following_id")
          .eq("follower_id", user.id),
        supabase
          .from("follows")
          .select("follower_id")
          .eq("following_id", user.id),
      ])

      const followingIdsArr = (followingRes.data ?? []).map((r: any) => r.following_id)
      const followerIdsArr = (followersRes.data ?? []).map((r: any) => r.follower_id)

      const allProfileIds = [...new Set([...followingIdsArr, ...followerIdsArr])]

      let profileMap: Record<string, any> = {}
      if (allProfileIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, username, avatar_url, location, account_type")
          .in("id", allProfileIds)

        for (const p of profiles ?? []) {
          profileMap[p.id] = p
        }
      }

      function toNetworkUser(userId: string, isFollowingUser: boolean): NetworkUser {
        const p = profileMap[userId]
        return {
          id: userId,
          name: p?.full_name ?? "Unknown User",
          username: p?.username ?? null,
          role: p?.account_type ?? null,
          location: p?.location ?? null,
          avatar: p?.avatar_url ?? null,
          isFollowing: isFollowingUser,
        }
      }

      const followingUsers = followingIdsArr.map((id: string) => toNetworkUser(id, true))
      const followerUsers = followerIdsArr.map((id: string) =>
        toNetworkUser(id, followingIdsArr.includes(id))
      )

      setFollowing(followingUsers)
      setFollowers(followerUsers)

      const { data: discoverProfiles } = await supabase
        .from("profiles")
        .select("id, full_name, username, avatar_url, location, account_type")
        .neq("id", user.id)
        .not("id", "in", `(${[...followingIdsArr, user.id].join(",")})`)
        .limit(30)

      const discoverMapped = (discoverProfiles ?? []).map((p: any) => ({
        id: p.id,
        name: p.full_name ?? "Unknown User",
        username: p.username ?? null,
        role: p.account_type ?? null,
        location: p.location ?? null,
        avatar: p.avatar_url ?? null,
        isFollowing: false,
      }))

      setDiscoverUsers(discoverMapped)
    } catch (err) {
      console.error("Failed to load network:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleFollow = useCallback(
    async (userId: string, currentlyFollowing: boolean) => {
      if (!currentUserId) return

      setProcessingIds((prev) => new Set(prev).add(userId))
      try {
        if (currentlyFollowing) {
          const { error } = await supabase
            .from("follows")
            .delete()
            .eq("follower_id", currentUserId)
            .eq("following_id", userId)

          if (error) throw error
          toast.success("Unfollowed")
        } else {
          const { error } = await supabase.from("follows").insert({
            follower_id: currentUserId,
            following_id: userId,
          })

          if (error) throw error
          toast.success("Followed!")
        }

        await loadNetwork()
      } catch (err: any) {
        toast.error(err?.message ?? "Failed to update follow")
      } finally {
        setProcessingIds((prev) => {
          const next = new Set(prev)
          next.delete(userId)
          return next
        })
      }
    },
    [currentUserId]
  )

  function filterUsers(users: NetworkUser[]) {
    if (!searchQuery.trim()) return users
    const q = searchQuery.toLowerCase()
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        (u.username?.toLowerCase().includes(q) ?? false) ||
        (u.role?.toLowerCase().includes(q) ?? false) ||
        (u.location?.toLowerCase().includes(q) ?? false)
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="border-b border-slate-800/50 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
                Network
              </h1>
              <p className="text-sm text-slate-400">Connect with artists, fans, and industry professionals</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-8">
        <NetworkStats
          connectionCount={mutualCount}
          followerCount={followers.length}
          followingCount={following.length}
        />

        {/* Search */}
        <Card className="mb-8 bg-slate-900/50 border-slate-700/50 backdrop-blur-sm rounded-xl shadow-lg">
          <CardContent className="p-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                placeholder="Search for artists, producers, engineers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-slate-800/50 border-slate-700/50 text-white focus:border-purple-500/50 focus:ring-purple-500/20 rounded-xl"
              />
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-slate-800/50 border-slate-700/50 rounded-xl p-1">
            <TabsTrigger value="discover" className="rounded-lg">Discover</TabsTrigger>
            <TabsTrigger value="following" className="rounded-lg">
              Following ({following.length})
            </TabsTrigger>
            <TabsTrigger value="followers" className="rounded-lg">
              Followers ({followers.length})
            </TabsTrigger>
          </TabsList>

          {/* Discover */}
          <TabsContent value="discover" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-white">Discover People</h2>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="h-32 bg-slate-800/50 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : filterUsers(discoverUsers).length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <Users className="h-12 w-12 mx-auto mb-4" />
                <p>{searchQuery ? "No users match your search" : "No more people to discover right now"}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filterUsers(discoverUsers).map((user) => (
                  <UserCard
                    key={user.id}
                    user={user}
                    onToggleFollow={handleToggleFollow}
                    isProcessing={processingIds.has(user.id)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Following */}
          <TabsContent value="following" className="space-y-6">
            <h2 className="text-xl font-semibold text-white">People You Follow</h2>

            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-32 bg-slate-800/50 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : filterUsers(following).length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <Users className="h-12 w-12 mx-auto mb-4" />
                <p>{searchQuery ? "No matches" : "You're not following anyone yet"}</p>
                <Button
                  className="mt-4 bg-purple-600 hover:bg-purple-700 rounded-xl"
                  onClick={() => setActiveTab("discover")}
                >
                  Discover People
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filterUsers(following).map((user) => (
                  <UserCard
                    key={user.id}
                    user={user}
                    onToggleFollow={handleToggleFollow}
                    isProcessing={processingIds.has(user.id)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Followers */}
          <TabsContent value="followers" className="space-y-6">
            <h2 className="text-xl font-semibold text-white">Your Followers</h2>

            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-32 bg-slate-800/50 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : filterUsers(followers).length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <UserPlus className="h-12 w-12 mx-auto mb-4" />
                <p>{searchQuery ? "No matches" : "No followers yet"}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filterUsers(followers).map((user) => (
                  <UserCard
                    key={user.id}
                    user={user}
                    onToggleFollow={handleToggleFollow}
                    isProcessing={processingIds.has(user.id)}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
