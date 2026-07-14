"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  readVenueSpotlightDismissedVersion,
  writeVenueSpotlightDismissedVersion,
  VENUE_SPOTLIGHT_CURRENT_VERSION,
} from "@/lib/product-education/storage"
import { X, ChevronLeft, ChevronRight, Music, Calendar, Users, BarChart3, Grid3X3 } from "lucide-react"

const spotlightSteps = [
  {
    title: "Venue workspace",
    description:
      "Your venue hub groups social posts, events, teams, documents, and equipment. Use the main Tourify navigation (News, Discover, Jobs) for the wider network; use the venue dashboard for day-to-day operations.",
    icon: Grid3X3,
  },
  {
    title: "Organize by area",
    description:
      "Jump between sections from the venue sidebar. Keep documents and equipment lists current so touring crews and in-house staff share one source of truth.",
    icon: Users,
  },
  {
    title: "Music & releases",
    description:
      "Upload and manage audio assets tied to your room. Pair releases with events so fans see what is coming up.",
    icon: Music,
  },
  {
    title: "Events",
    description:
      "Create and promote shows with consistent door times, capacity, and production notes. Link posts back to dated events for clearer discovery.",
    icon: Calendar,
  },
  {
    title: "Performance",
    description:
      "Review analytics to learn what content and show formats resonate. Adjust programming using those signals.",
    icon: BarChart3,
  },
]

export function VenueNavSpotlight() {
  const pathname = usePathname()
  const [visible, setVisible] = useState(false)
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (!pathname.startsWith("/venue/dashboard")) {
      setVisible(false)
      return
    }
    const dismissed = readVenueSpotlightDismissedVersion()
    if (dismissed != null && dismissed >= VENUE_SPOTLIGHT_CURRENT_VERSION) {
      setVisible(false)
      return
    }
    setVisible(true)
    setStep(0)
  }, [pathname])

  function dismiss() {
    writeVenueSpotlightDismissedVersion(VENUE_SPOTLIGHT_CURRENT_VERSION)
    setVisible(false)
  }

  if (!visible) return null

  const current = spotlightSteps[step]
  const Icon = current.icon

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/70 p-4">
      <div className="relative w-full max-w-md overflow-hidden rounded-lg bg-gray-900">
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-2 top-2 z-10 text-gray-400 hover:text-white"
          onClick={dismiss}
          aria-label="Close venue tour"
        >
          <X className="h-5 w-5" />
        </Button>

        <div className="p-6">
          <div className="mb-4 flex items-center">
            <div className="mr-4 rounded-full bg-purple-600/20 p-3">
              <Icon className="h-6 w-6 text-purple-400" />
            </div>
            <h2 className="text-xl font-semibold text-white">{current.title}</h2>
          </div>

          <p className="mb-6 text-sm leading-relaxed text-gray-300">{current.description}</p>

          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
              className={cn("text-gray-400 hover:text-white", step === 0 && "cursor-not-allowed opacity-50")}
            >
              <ChevronLeft className="mr-1 h-5 w-5" />
              Previous
            </Button>

            <div className="flex space-x-1">
              {spotlightSteps.map((_, index) => (
                <div
                  key={index}
                  className={cn("h-1.5 w-6 rounded-full", index === step ? "bg-purple-500" : "bg-gray-700")}
                />
              ))}
            </div>

            <Button
              variant={step === spotlightSteps.length - 1 ? "default" : "ghost"}
              onClick={() => {
                if (step < spotlightSteps.length - 1) setStep((s) => s + 1)
                else dismiss()
              }}
              className={
                step === spotlightSteps.length - 1
                  ? "bg-purple-600 hover:bg-purple-700"
                  : "text-gray-400 hover:text-white"
              }
            >
              {step === spotlightSteps.length - 1 ? "Get started" : "Next"}
              {step !== spotlightSteps.length - 1 ? <ChevronRight className="ml-1 h-5 w-5" /> : null}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
