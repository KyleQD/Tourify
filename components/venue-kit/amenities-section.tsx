"use client"

import React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Wifi, Car, Accessibility, Music2, Lightbulb, Beer,
  UtensilsCrossed, ShieldCheck, Shirt, Radio, Video, MapPin,
} from "lucide-react"
import type { VKData } from "@/lib/services/venue-kit.service"
import { epkSurface } from "@/components/epk/epk-ui-styles"
import { cn } from "@/lib/utils"

const AMENITY_LIST = [
  { id: "Wi-Fi",            label: "Wi-Fi",             icon: Wifi },
  { id: "Parking",          label: "Parking",           icon: Car },
  { id: "ADA Accessible",   label: "ADA Accessible",    icon: Accessibility },
  { id: "Green Room",       label: "Green Room",        icon: MapPin },
  { id: "Sound System",     label: "Sound System",      icon: Music2 },
  { id: "Lighting Rig",     label: "Lighting Rig",      icon: Lightbulb },
  { id: "Full Bar",         label: "Full Bar",           icon: Beer },
  { id: "Kitchen",          label: "Kitchen",           icon: UtensilsCrossed },
  { id: "Security",         label: "Security",          icon: ShieldCheck },
  { id: "Coat Check",       label: "Coat Check",        icon: Shirt },
  { id: "Merch Table",      label: "Merch Table",       icon: Radio },
  { id: "Livestream Setup", label: "Livestream Setup",  icon: Video },
]

interface Props {
  vkData: VKData
  updateVKData: (updates: Partial<VKData>) => void
}

export default function AmenitiesSection({ vkData, updateVKData }: Props) {
  const active = new Set(vkData.amenities ?? [])

  const toggle = (id: string) => {
    const next = new Set(active)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    updateVKData({ amenities: Array.from(next) })
  }

  return (
    <Card className={epkSurface}>
      <CardHeader>
        <CardTitle className="text-base">Amenities</CardTitle>
        <CardDescription>Toggle which amenities your venue offers.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {AMENITY_LIST.map(({ id, label, icon: Icon }) => {
            const on = active.has(id)
            return (
              <button
                key={id}
                type="button"
                onClick={() => toggle(id)}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-xl border p-4 text-center text-sm transition-colors",
                  on
                    ? "border-primary/60 bg-primary/10 text-primary"
                    : "border-white/10 bg-white/5 text-muted-foreground opacity-60 hover:opacity-80"
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="leading-tight">{label}</span>
              </button>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

// Also export the static display version for use in the VK document renderer
export function AmenitiesGrid({ amenities }: { amenities: string[] }) {
  const active = new Set(amenities)
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {AMENITY_LIST.map(({ id, label, icon: Icon }) => {
        const on = active.has(id)
        return (
          <div
            key={id}
            className={cn(
              "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm",
              on
                ? "border-primary/40 bg-primary/10 text-foreground"
                : "border-white/5 bg-white/5 text-muted-foreground opacity-40"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span>{label}</span>
          </div>
        )
      })}
    </div>
  )
}
