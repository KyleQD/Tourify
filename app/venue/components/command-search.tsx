"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useKeyboardShortcut } from "../../../hooks/venue/use-keyboard-shortcut"
import { useSearch } from "../../../hooks/venue/use-search"
import { Button } from "@/components/ui/button"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import {
  Calendar,
  Clock,
  FileText,
  Search,
  Users,
  X,
  Loader2,
  CalendarIcon,
  ClockIcon,
  FileTextIcon,
  UsersIcon,
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export function CommandSearch() {
  const router = useRouter()
  const { isOpen, query, setQuery, results, isLoading, toggleSearch, closeSearch } = useSearch()
  const [mounted, setMounted] = useState(false)

  // Use keyboard shortcut to open search (Cmd+K or Ctrl+K)
  useKeyboardShortcut("k", toggleSearch, {
    metaKey: true,
    ctrlKey: true,
  })

  // Handle mounting to avoid hydration issues
  useEffect(() => {
    setMounted(true)
  }, [])

  const handleSelect = (url: string) => {
    router.push(url)
    closeSearch()
  }

  // Render icon based on result type
  const renderIcon = (type: string, icon?: string) => {
    switch (type) {
      case "event":
        return <CalendarIcon className="h-4 w-4 text-purple-400" />
      case "booking":
        return <ClockIcon className="h-4 w-4 text-blue-400" />
      case "document":
        return <FileTextIcon className="h-4 w-4 text-orange-400" />
      case "team":
        return <UsersIcon className="h-4 w-4 text-green-400" />
      default:
        return <Search className="h-4 w-4" />
    }
  }

  if (!mounted) return null

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="w-full justify-between text-muted-foreground bg-gray-800 border-gray-700"
        onClick={toggleSearch}
      >
        <div className="flex items-center">
          <Search className="mr-2 h-4 w-4" />
          <span>Search...</span>
        </div>
        <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border border-gray-700 bg-gray-900 px-1.5 font-mono text-xs font-medium opacity-100 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>

      <CommandDialog open={isOpen} onOpenChange={(nextOpen) => !nextOpen && closeSearch()}>
        <div className="flex items-center border-b border-gray-700 px-3">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <CommandInput
            placeholder="Search events, bookings, team members..."
            value={query}
            onValueChange={setQuery}
            className="border-0 focus:ring-0 focus:border-0"
          />
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={closeSearch}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <CommandList>
          {isLoading ? (
            <div className="py-6 text-center">
              <Loader2 className="h-6 w-6 animate-spin mx-auto text-gray-400" />
              <p className="text-sm text-gray-400 mt-2">Searching...</p>
            </div>
          ) : query.length > 0 && results.length === 0 ? (
            <CommandEmpty>No results found.</CommandEmpty>
          ) : (
            <>
              {results.length > 0 && (
                <>
                  <CommandGroup heading="Results">
                    {results.map((result) => (
                      <CommandItem
                        key={result.id}
                        onSelect={() => handleSelect(result.url || "#")}
                        className="flex items-center"
                      >
                        {result.image ? (
                          <Avatar className="h-6 w-6 mr-2">
                            <AvatarImage src={result.image || "/placeholder.svg"} alt={result.title} />
                            <AvatarFallback>{result.title.charAt(0)}</AvatarFallback>
                          </Avatar>
                        ) : (
                          <div className="mr-2">{renderIcon(result.type, result.icon)}</div>
                        )}
                        <div className="flex flex-col">
                          <span>{result.title}</span>
                          {result.subtitle && <span className="text-xs text-gray-400">{result.subtitle}</span>}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}

              {query.length === 0 && (
                <>
                  <CommandGroup heading="Quick Actions">
                    <CommandItem onSelect={() => handleSelect("/venue/dashboard/calendar")}>
                      <Calendar className="mr-2 h-4 w-4 text-purple-400" />
                      <span>Create New Event</span>
                    </CommandItem>
                    <CommandItem onSelect={() => handleSelect("/venue/bookings")}>
                      <Clock className="mr-2 h-4 w-4 text-blue-400" />
                      <span>View Booking Requests</span>
                    </CommandItem>
                    <CommandItem onSelect={() => handleSelect("/documents")}>
                      <FileText className="mr-2 h-4 w-4 text-orange-400" />
                      <span>Upload Documents</span>
                    </CommandItem>
                    <CommandItem onSelect={() => handleSelect("/venue/staff")}>
                      <Users className="mr-2 h-4 w-4 text-green-400" />
                      <span>Manage Team</span>
                    </CommandItem>
                  </CommandGroup>

                  <CommandSeparator />

                  <CommandGroup heading="Recent">
                    <CommandItem onSelect={() => handleSelect("/venue/dashboard/events")}>
                      <Calendar className="mr-2 h-4 w-4 text-purple-400" />
                      <div className="flex flex-col">
                        <span>Summer Jam Festival</span>
                        <span className="text-xs text-gray-400">Event on June 15, 2025</span>
                      </div>
                    </CommandItem>
                    <CommandItem onSelect={() => handleSelect("/venue/bookings")}>
                      <Clock className="mr-2 h-4 w-4 text-blue-400" />
                      <div className="flex flex-col">
                        <span>Electronic Music Showcase</span>
                        <span className="text-xs text-gray-400">Booking request from Pulse Productions</span>
                      </div>
                    </CommandItem>
                  </CommandGroup>
                </>
              )}
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  )
}
