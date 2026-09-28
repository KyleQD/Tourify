"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
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
  Home,
  LayoutDashboard,
  MessageSquare,
  Settings,
  Users,
  HelpCircle,
  LogOut,
  Mic,
} from "lucide-react"
import { getActiveVenueRoutes } from "@/lib/venue/route-registry"

interface CommandMenuProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Registry-driven Venue navigation entries (VEN-298). */
function venueCommandItems() {
  return getActiveVenueRoutes().filter((route) => route.commandNav)
}

export function CommandMenu({ open, onOpenChange }: CommandMenuProps) {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)

  // Only show the command menu when the component is mounted
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  const runCommand = (command: () => void) => {
    onOpenChange(false)
    command()
  }

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Navigation">
          <CommandItem onSelect={() => runCommand(() => router.push("/"))}>
            <Home className="mr-2 h-4 w-4" />
            <span>Home</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/dashboard"))}>
            <LayoutDashboard className="mr-2 h-4 w-4" />
            <span>Dashboard</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/events"))}>
            <Calendar className="mr-2 h-4 w-4" />
            <span>Events</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/teams"))}>
            <Users className="mr-2 h-4 w-4" />
            <span>Team</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/messages"))}>
            <MessageSquare className="mr-2 h-4 w-4" />
            <span>Messages</span>
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Venue Operations">
          {venueCommandItems().map((route) => (
            <CommandItem
              key={route.id}
              onSelect={() => runCommand(() => router.push(route.href))}
            >
              <Mic className="mr-2 h-4 w-4" />
              <span>{route.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Account">
          <CommandItem onSelect={() => runCommand(() => router.push("/settings"))}>
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/faq"))}>
            <HelpCircle className="mr-2 h-4 w-4" />
            <span>Help & Support</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/logout"))}>
            <LogOut className="mr-2 h-4 w-4" />
            <span>Log out</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
