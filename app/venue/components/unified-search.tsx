"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useRouter } from "next/navigation"
import { Calendar, Globe, MapPin, MessageSquare, Music, Search, User } from "lucide-react"
import { formatSafeDate } from "@/lib/events/admin-event-normalization"

interface UnifiedSearchProps {
  trigger?: React.ReactNode
}

export function UnifiedSearch({ trigger }: UnifiedSearchProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const mockResults = {
    users: [
      { id: "user-1", name: "Jane Smith", username: "janesmith", avatar: "/placeholder.svg?height=40&width=40&text=JS", type: "user" },
      { id: "user-2", name: "Mike Johnson", username: "mikej", avatar: "/placeholder.svg?height=40&width=40&text=MJ", type: "user" },
    ],
    events: [
      { id: "event-1", title: "Summer Jam Festival", date: "2025-06-15", location: "New York, NY", type: "event" },
      { id: "event-2", title: "Acoustic Sessions", date: "2025-06-05", location: "Nashville, TN", type: "event" },
    ],
    posts: [
      { id: "post-1", title: "New Album Announcement", content: "Excited to announce my new album coming next month!", author: "Alex Johnson", type: "post" },
      { id: "post-2", title: "Tour Dates Announced", content: "Check out the dates for my upcoming summer tour!", author: "Alex Johnson", type: "post" },
    ],
    jobs: [
      { id: "job-1", title: "Drummer Needed for Summer Tour", location: "Multiple Cities", type: "job" },
      { id: "job-2", title: "Sound Engineer for Nashville Show", location: "Nashville, TN", type: "job" },
    ],
    music: [
      { id: "track-1", title: "Summer Vibes", artist: "Alex Johnson", album: "Seasonal Sounds", type: "track" },
      { id: "track-2", title: "Midnight Drive", artist: "Alex Johnson", album: "Night Sessions", type: "track" },
    ],
  }

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      return
    }

    setIsLoading(true)
    const timeoutId = setTimeout(() => {
      const query = searchQuery.toLowerCase()
      const results = [
        ...mockResults.users.filter(u => u.name.toLowerCase().includes(query) || u.username.toLowerCase().includes(query)),
        ...mockResults.events.filter(e => e.title.toLowerCase().includes(query) || e.location.toLowerCase().includes(query)),
        ...mockResults.posts.filter(p => p.title.toLowerCase().includes(query) || p.content.toLowerCase().includes(query)),
        ...mockResults.jobs.filter(j => j.title.toLowerCase().includes(query) || j.location.toLowerCase().includes(query)),
        ...mockResults.music.filter(t => t.title.toLowerCase().includes(query) || t.album.toLowerCase().includes(query)),
      ]
      setSearchResults(results)
      setIsLoading(false)
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [searchQuery])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setOpen(true)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  useEffect(() => {
    if (open && inputRef.current) setTimeout(() => inputRef.current?.focus(), 100)
  }, [open])

  function handleSelect(result: any) {
    setOpen(false)
    switch (result.type) {
      case "user":
        router.push(`/profile/${result.username}`)
        return
      case "event":
        router.push(`/events/${result.id}`)
        return
      case "post":
        router.push(`/posts/${result.id}`)
        return
      case "job":
        router.push(`/jobs/${result.id}`)
        return
      case "track":
        router.push(`/music/${result.id}`)
        return
      default:
        return
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="w-full justify-start text-sm text-muted-foreground sm:pr-12 md:w-40 lg:w-64">
            <Search className="mr-2 h-4 w-4" />
            <span>Search...</span>
            <kbd className="pointer-events-none absolute right-1.5 top-1.5 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
              <span className="text-xs">⌘</span>K
            </kbd>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px] bg-gray-900 border-gray-800 text-white p-0">
        <Command className="bg-transparent">
          <CommandInput
            ref={inputRef}
            placeholder="Search for people, events, posts, jobs, music..."
            value={searchQuery}
            onValueChange={setSearchQuery}
            className="border-none focus:ring-0 outline-none"
          />
          <CommandList>
            <CommandEmpty>
              {isLoading ? (
                <div className="py-6 text-center">
                  <div className="animate-spin inline-block w-6 h-6 border-2 border-current border-t-transparent text-purple-500 rounded-full" aria-hidden="true"></div>
                  <p className="mt-2 text-gray-400">Searching...</p>
                </div>
              ) : (
                <p className="py-6 text-center text-gray-400">No results found.</p>
              )}
            </CommandEmpty>

            {searchResults.length > 0 && (
              <>
                {searchResults.some(r => r.type === "user") && (
                  <CommandGroup heading="People">
                    {searchResults.filter(r => r.type === "user").map(result => (
                      <CommandItem key={result.id} onSelect={() => handleSelect(result)} className="cursor-pointer">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={result.avatar} alt={result.name} />
                            <AvatarFallback>{result.name.split(" ").map((n: string) => n[0]).join("")}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{result.name}</p>
                            <p className="text-sm text-gray-400">@{result.username}</p>
                          </div>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}

                {searchResults.some(r => r.type === "event") && (
                  <CommandGroup heading="Events">
                    {searchResults.filter(r => r.type === "event").map(result => (
                      <CommandItem key={result.id} onSelect={() => handleSelect(result)} className="cursor-pointer">
                        <div className="flex items-center gap-3">
                          <div className="bg-purple-900/30 text-purple-400 p-2 rounded-lg">
                            <Calendar className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-medium">{result.title}</p>
                            <div className="flex items-center text-sm text-gray-400">
                              <MapPin className="h-3 w-3 mr-1" />
                              <span>{result.location}</span>
                              <span className="mx-1">•</span>
                              <span>{formatSafeDate(result.date)}</span>
                            </div>
                          </div>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}

                {searchResults.some(r => r.type === "post") && (
                  <CommandGroup heading="Posts">
                    {searchResults.filter(r => r.type === "post").map(result => (
                      <CommandItem key={result.id} onSelect={() => handleSelect(result)} className="cursor-pointer">
                        <div className="flex items-center gap-3">
                          <div className="bg-blue-900/30 text-blue-400 p-2 rounded-lg">
                            <MessageSquare className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-medium">{result.title}</p>
                            <p className="text-sm text-gray-400 truncate">{result.content}</p>
                          </div>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}

                {searchResults.some(r => r.type === "job") && (
                  <CommandGroup heading="Jobs">
                    {searchResults.filter(r => r.type === "job").map(result => (
                      <CommandItem key={result.id} onSelect={() => handleSelect(result)} className="cursor-pointer">
                        <div className="flex items-center gap-3">
                          <div className="bg-green-900/30 text-green-400 p-2 rounded-lg">
                            <Globe className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-medium">{result.title}</p>
                            <div className="flex items-center text-sm text-gray-400">
                              <MapPin className="h-3 w-3 mr-1" />
                              <span>{result.location}</span>
                            </div>
                          </div>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}

                {searchResults.some(r => r.type === "track") && (
                  <CommandGroup heading="Music">
                    {searchResults.filter(r => r.type === "track").map(result => (
                      <CommandItem key={result.id} onSelect={() => handleSelect(result)} className="cursor-pointer">
                        <div className="flex items-center gap-3">
                          <div className="bg-red-900/30 text-red-400 p-2 rounded-lg">
                            <Music className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-medium">{result.title}</p>
                            <p className="text-sm text-gray-400">{result.album}</p>
                          </div>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
              </>
            )}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  )
}
