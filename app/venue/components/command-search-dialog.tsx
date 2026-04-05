"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Home,
  Calendar,
  Clock,
  Users,
  BarChart2,
  Settings,
  FileText,
  ImageIcon,
  Mic,
  DollarSign,
  Ticket,
  PlusCircle,
} from "lucide-react"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import { useCommandSearch } from "@/hooks/venue/use-command-search"

export function CommandSearchDialog() {
  const router = useRouter()
  const { isOpen, toggle, close } = useCommandSearch()

  // Handle keyboard shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        toggle()
      }
    }

    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [toggle])

  const runCommand = (command: () => void) => {
    close()
    command()
  }

  return (
    <CommandDialog open={isOpen} onOpenChange={(nextOpen) => !nextOpen && close()}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Navigation">
          <CommandItem onSelect={() => runCommand(() => router.push("/venue/dashboard/dashboard"))}>
            <Home className="mr-2 h-4 w-4" />
            <span>Dashboard</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/venue/dashboard/events"))}>
            <Calendar className="mr-2 h-4 w-4" />
            <span>Events</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/venue/bookings"))}>
            <Clock className="mr-2 h-4 w-4" />
            <span>Bookings</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/venue/staff"))}>
            <Users className="mr-2 h-4 w-4" />
            <span>Team</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/venue/analytics"))}>
            <BarChart2 className="mr-2 h-4 w-4" />
            <span>Analytics</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Resources">
          <CommandItem onSelect={() => runCommand(() => router.push("/documents"))}>
            <FileText className="mr-2 h-4 w-4" />
            <span>Documents</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/gallery"))}>
            <ImageIcon className="mr-2 h-4 w-4" />
            <span>Gallery</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/settings"))}>
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Create New">
          <CommandItem onSelect={() => runCommand(() => router.push("/venue/dashboard/calendar"))}>
            <PlusCircle className="mr-2 h-4 w-4" />
            <span>Create Event</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/venue/bookings"))}>
            <PlusCircle className="mr-2 h-4 w-4" />
            <span>Create Booking</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/venue/staff"))}>
            <PlusCircle className="mr-2 h-4 w-4" />
            <span>Invite Team Member</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Venue Management">
          <CommandItem onSelect={() => runCommand(() => router.push("/equipment"))}>
            <Mic className="mr-2 h-4 w-4" />
            <span>Equipment Management</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/venue/finances"))}>
            <DollarSign className="mr-2 h-4 w-4" />
            <span>Financial Management</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/venue/dashboard/tickets"))}>
            <Ticket className="mr-2 h-4 w-4" />
            <span>Ticket Management</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
