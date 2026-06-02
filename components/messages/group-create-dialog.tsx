"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Loader2, Plus, Search, X } from "lucide-react"
import { toast } from "sonner"

interface GroupCreateDialogProps {
  onCreated?: (threadId: string) => void
}

interface UserOption {
  id: string
  username: string
  full_name: string
  avatar_url?: string | null
}

export function GroupCreateDialog({ onCreated }: GroupCreateDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [results, setResults] = useState<UserOption[]>([])
  const [selectedMembers, setSelectedMembers] = useState<UserOption[]>([])
  const [isSearching, setIsSearching] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    const trimmed = searchTerm.trim()
    if (trimmed.length === 0) {
      setResults([])
      return
    }
    const controller = new AbortController()
    const timeoutId = setTimeout(async () => {
      setIsSearching(true)
      try {
        const response = await fetch(
          `/api/messages/user-search?q=${encodeURIComponent(trimmed)}`,
          { credentials: "include", signal: controller.signal },
        )
        if (!response.ok) return
        const data = await response.json()
        setResults(data.users || [])
      } catch (error) {
        if ((error as Error).name === "AbortError") return
        console.error("User search failed:", error)
      } finally {
        setIsSearching(false)
      }
    }, 250)

    return () => {
      clearTimeout(timeoutId)
      controller.abort()
    }
  }, [searchTerm, isOpen])

  const selectedIds = useMemo(
    () => new Set(selectedMembers.map((member) => member.id)),
    [selectedMembers],
  )

  function toggleMember(member: UserOption) {
    setSelectedMembers((prev) =>
      prev.some((m) => m.id === member.id) ? prev.filter((m) => m.id !== member.id) : [...prev, member],
    )
  }

  function reset() {
    setName("")
    setDescription("")
    setSearchTerm("")
    setSelectedMembers([])
    setResults([])
  }

  async function handleCreate() {
    if (!name.trim() || isCreating) return
    setIsCreating(true)

    try {
      const response = await fetch("/api/groups/threads", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          thread_type: "social",
          member_ids: selectedMembers.map((member) => member.id),
        }),
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        toast.error(data.error || "Failed to create group")
        return
      }

      toast.success(`Group "${data.thread.name}" created`)
      onCreated?.(data.thread.id)
      reset()
      setIsOpen(false)
    } catch (error) {
      console.error("Failed to create group thread:", error)
      toast.error("Failed to create group")
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(next) => {
        setIsOpen(next)
        if (!next) reset()
      }}
    >
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="border-purple-500/40 text-purple-200 hover:bg-purple-500/10"
        >
          <Plus className="h-4 w-4 mr-1" />
          New Group
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-slate-900 border-slate-700 text-white sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Group</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="group-name">Name</Label>
            <Input
              id="group-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Crew night, FOH leads…"
              className="bg-slate-800 border-slate-600"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="group-description">Description</Label>
            <Textarea
              id="group-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Optional — what is this thread for?"
              rows={2}
              className="bg-slate-800 border-slate-600 resize-none"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Add members</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search by name or @handle"
                className="pl-10 bg-slate-800 border-slate-600"
              />
            </div>
            {selectedMembers.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {selectedMembers.map((member) => (
                  <Badge
                    key={member.id}
                    variant="secondary"
                    className="bg-purple-500/15 text-purple-200 border border-purple-500/30"
                  >
                    {member.full_name || `@${member.username}`}
                    <button
                      type="button"
                      onClick={() => toggleMember(member)}
                      className="ml-1 hover:text-white"
                      aria-label={`Remove ${member.full_name}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            {searchTerm.trim().length > 0 && (
              <ScrollArea className="max-h-48 rounded-md border border-slate-700/60 bg-slate-800/40">
                {isSearching ? (
                  <div className="flex items-center justify-center py-4 text-slate-400">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" /> Searching…
                  </div>
                ) : results.length === 0 ? (
                  <div className="py-4 text-center text-sm text-slate-500">No matches</div>
                ) : (
                  <ul className="divide-y divide-slate-700/60">
                    {results.map((member) => {
                      const isSelected = selectedIds.has(member.id)
                      return (
                        <li key={member.id}>
                          <button
                            type="button"
                            onClick={() => toggleMember(member)}
                            className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-slate-700/30 focus:outline-none focus:bg-slate-700/40"
                          >
                            <Avatar className="h-7 w-7">
                              <AvatarImage src={member.avatar_url || ""} />
                              <AvatarFallback className="bg-slate-700 text-white text-[10px]">
                                {member.full_name?.charAt(0).toUpperCase() ?? "?"}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-white truncate">{member.full_name}</p>
                              <p className="text-xs text-slate-400 truncate">@{member.username}</p>
                            </div>
                            {isSelected && (
                              <Badge className="bg-purple-500/30 text-purple-100">Added</Badge>
                            )}
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </ScrollArea>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setIsOpen(false)
              reset()
            }}
            className="border-slate-600 text-slate-200 hover:bg-slate-800"
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={isCreating || !name.trim()}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
          >
            {isCreating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" /> Creating…
              </>
            ) : (
              "Create Group"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
