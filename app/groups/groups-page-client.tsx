"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { formatDistanceToNow } from "date-fns"
import { Compass, Loader2, MessageCircle, Search, Users } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { GroupCreateDialog } from "@/components/messages/group-create-dialog"
import { toast } from "sonner"

interface GroupSummary {
  id: string
  name: string
  description: string | null
  thread_type: string
  created_by: string
  updated_at: string
  membership?: { role: string } | null
  last_message?: { id: string; content: string; created_at: string; sender_id: string } | null
}

type GroupFilter = "all" | "created"

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "G"
}

export function GroupsPageClient() {
  const { isAuthenticated } = useAuth()
  const router = useRouter()
  const [groups, setGroups] = useState<GroupSummary[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [filter, setFilter] = useState<GroupFilter>("all")
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const loadGroups = useCallback(async (showRefreshState = false) => {
    if (showRefreshState) setRefreshing(true)
    try {
      const response = await fetch("/api/groups/threads?limit=100", { credentials: "include" })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        if (response.status === 401) return
        throw new Error(data.error || "Failed to load groups")
      }
      setGroups(data.threads || [])
    } catch (error) {
      console.error("Groups load error:", error)
      toast.error(error instanceof Error ? error.message : "Failed to load groups")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    if (isAuthenticated) void loadGroups()
  }, [isAuthenticated, loadGroups])

  const filteredGroups = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    return groups.filter((group) => {
      if (filter === "created" && group.membership?.role !== "owner") return false
      if (!query) return true
      return `${group.name} ${group.description || ""} ${group.thread_type}`.toLowerCase().includes(query)
    })
  }, [filter, groups, searchTerm])

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4">
        <Card className="border-slate-700/60 bg-slate-900/70">
          <CardContent className="p-8 text-center">
            <h1 className="mb-2 text-xl font-semibold text-white">Sign in to find your communities</h1>
            <p className="mb-5 text-sm text-slate-400">Join conversations with the people you work and create with.</p>
            <Link href="/login">
              <Button className="bg-gradient-to-r from-purple-600 to-blue-600">Sign in</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-4 py-8 text-white">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-purple-300">
              <Compass className="h-4 w-4" /> Community
            </div>
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Find your people</h1>
            <p className="mt-2 max-w-2xl text-slate-400">
              Discover the groups you belong to, pick up the latest conversation, and keep your community moving.
            </p>
          </div>
          <GroupCreateDialog onCreated={(threadId) => router.push(`/groups/${threadId}`)} />
        </header>

        <section className="rounded-2xl border border-purple-500/20 bg-gradient-to-r from-purple-950/50 to-blue-950/40 p-5 md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-purple-500/15 p-2.5 text-purple-200">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-medium text-white">Your community groups</h2>
                <p className="mt-1 text-sm text-slate-400">Every group is a shared feed with conversation, members, and clear roles.</p>
              </div>
            </div>
            <div className="relative w-full md:max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search your groups"
                aria-label="Search your groups"
                className="border-slate-700 bg-slate-950/50 pl-9 text-white placeholder:text-slate-500"
              />
            </div>
          </div>
        </section>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex rounded-lg border border-slate-700/70 bg-slate-900/60 p-1" role="tablist" aria-label="Group filters">
            {(["all", "created"] as const).map((value) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={filter === value}
                onClick={() => setFilter(value)}
                className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                  filter === value ? "bg-slate-700 text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                {value === "all" ? "All groups" : "Created by me"}
              </button>
            ))}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void loadGroups(true)}
            disabled={refreshing}
            className="text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            {refreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Refresh
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-400">
            <Loader2 className="mr-2 h-5 w-5 animate-spin text-purple-400" /> Loading groups…
          </div>
        ) : filteredGroups.length === 0 ? (
          <Card className="border-dashed border-slate-700 bg-slate-900/50">
            <CardContent className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <div className="mb-4 rounded-full bg-slate-800 p-4 text-slate-400"><Users className="h-7 w-7" /></div>
              <h2 className="text-lg font-medium text-white">{groups.length ? "No groups match that search" : "Your community starts here"}</h2>
              <p className="mt-2 max-w-md text-sm text-slate-400">
                {groups.length ? "Try a different name or switch back to all groups." : "Create a group for a shared interest, project, tour, or crew conversation."}
              </p>
              {!groups.length ? <div className="mt-5"><GroupCreateDialog onCreated={(threadId) => router.push(`/groups/${threadId}`)} /></div> : null}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {filteredGroups.map((group) => (
              <Link key={group.id} href={`/groups/${group.id}`} className="group">
                <Card className="h-full border-slate-700/60 bg-slate-900/70 transition-colors hover:border-purple-500/50 hover:bg-slate-900">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar className="h-11 w-11 border border-slate-700">
                          <AvatarFallback className="bg-gradient-to-br from-purple-600/60 to-blue-600/60 text-white">{getInitials(group.name)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <CardTitle className="truncate text-base text-white group-hover:text-purple-200">{group.name}</CardTitle>
                          <p className="mt-1 text-xs capitalize text-slate-500">{group.thread_type} community</p>
                        </div>
                      </div>
                      <Badge className="shrink-0 bg-slate-800 text-slate-300">{group.membership?.role || "member"}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="min-h-10 line-clamp-2 text-slate-400">{group.description || "A shared space for the community."}</CardDescription>
                    <div className="mt-5 flex items-center justify-between gap-3 border-t border-slate-800 pt-4 text-xs text-slate-500">
                      <span className="flex items-center gap-1.5"><MessageCircle className="h-3.5 w-3.5" />{group.last_message?.content || "Start the conversation"}</span>
                      <span className="shrink-0">{formatDistanceToNow(new Date(group.updated_at), { addSuffix: true })}</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
