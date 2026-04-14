"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { CreateGroupModal } from "../../components/groups/create-group-modal"
import { Search, UserPlus, Users, MessageSquare, Settings, Lock, Globe, Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabase"

interface Group {
  id: string
  name: string
  description: string | null
  member_count: number
  last_activity: string | null
  image_url: string | null
  is_public: boolean
  unread_messages: number
}

export default function GroupsPage() {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [groups, setGroups] = useState<Group[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadGroups() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setIsLoading(false)
          return
        }

        const { data: venueProfile } = await supabase
          .from("venue_profiles")
          .select("id")
          .eq("user_id", user.id)
          .single()

        if (!venueProfile) {
          setIsLoading(false)
          return
        }

        const { data, error } = await supabase
          .from("groups")
          .select("*")
          .or(`created_by.eq.${user.id},venue_id.eq.${venueProfile.id}`)
          .order("updated_at", { ascending: false })

        if (error) {
          // Table may not exist yet — treat as empty
          console.warn("Could not load groups:", error.message)
          setGroups([])
        } else {
          setGroups(
            (data ?? []).map((g: Record<string, unknown>) => ({
              id: g.id as string,
              name: (g.name as string) ?? "Unnamed Group",
              description: (g.description as string) ?? null,
              member_count: (g.member_count as number) ?? 0,
              last_activity: (g.updated_at as string) ?? null,
              image_url: (g.image_url as string) ?? null,
              is_public: (g.is_public as boolean) ?? true,
              unread_messages: 0,
            })),
          )
        }
      } catch (err) {
        console.error("Failed to load groups:", err)
        setGroups([])
      } finally {
        setIsLoading(false)
      }
    }

    loadGroups()
  }, [])

  const filteredGroups = groups.filter(
    (group) =>
      group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (group.description ?? "").toLowerCase().includes(searchQuery.toLowerCase()),
  )

  return (
    <div className="min-w-0 space-y-6 pb-20">
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold">Groups</h1>
          <p className="text-balance text-gray-400">Build community and streamline communication</p>
        </div>

        <Button onClick={() => setShowCreateModal(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Create Group
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search groups..."
          className="pl-10 bg-gray-800 border-gray-700"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading groups…</span>
        </div>
      ) : filteredGroups.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Users className="h-10 w-10 text-muted-foreground mb-3" />
          <h3 className="font-medium">No groups yet</h3>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Create a group to coordinate with your crew, connect with fans, or network with other venues.
          </p>
          <Button className="mt-4" onClick={() => setShowCreateModal(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Create Your First Group
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {filteredGroups.map((group) => (
            <Card key={group.id} className="bg-gray-900 border-gray-800">
              <CardHeader className="pb-2">
                <div className="flex items-start gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={group.image_url ?? undefined} alt={group.name} />
                    <AvatarFallback>
                      {group.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle className="min-w-0 break-words">{group.name}</CardTitle>
                      {group.is_public ? (
                        <Badge variant="outline" className="shrink-0 border-green-600 text-green-500">
                          <Globe className="h-3 w-3 mr-1" />
                          Public
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="shrink-0 border-gray-600">
                          <Lock className="h-3 w-3 mr-1" />
                          Private
                        </Badge>
                      )}
                      {group.unread_messages > 0 && (
                        <Badge className="ml-auto shrink-0 bg-purple-600 sm:ml-0">{group.unread_messages} new</Badge>
                      )}
                    </div>
                    <CardDescription className="mt-1 break-words">{group.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-sm text-gray-400">
                  <div className="flex min-w-0 items-center">
                    <Users className="mr-1 h-4 w-4 shrink-0" />
                    <span className="truncate">{group.member_count} members</span>
                  </div>
                  {group.last_activity && (
                    <div className="min-w-0 shrink-0 text-right sm:text-left">
                      Last activity: {new Date(group.last_activity).toLocaleDateString()}
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button className="flex-1">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Open Chat
                  </Button>
                  <Button variant="outline" className="border-gray-700">
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CreateGroupModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} />
    </div>
  )
}
