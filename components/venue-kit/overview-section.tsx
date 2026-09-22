"use client"

import React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { X, Plus } from "lucide-react"
import type { VKData } from "@/lib/services/venue-kit.service"
import { epkInput, epkSurface } from "@/components/epk/epk-ui-styles"

const VENUE_TYPE_OPTIONS = [
  "Music Venue", "Bar / Nightclub", "Concert Hall", "Amphitheater", "Festival Grounds",
  "Theater", "Gallery", "Rooftop", "Warehouse", "Studio", "Hotel Ballroom", "Outdoor",
]

interface Props {
  vkData: VKData
  updateVKData: (updates: Partial<VKData>) => void
}

export default function OverviewSection({ vkData, updateVKData }: Props) {
  const toggleVenueType = (type: string) => {
    const current = vkData.venueTypes ?? []
    const next = current.includes(type)
      ? current.filter((t) => t !== type)
      : [...current, type]
    updateVKData({ venueTypes: next })
  }

  return (
    <div className="space-y-6">
      {/* Identity */}
      <Card className={epkSurface}>
        <CardHeader>
          <CardTitle className="text-base">Identity</CardTitle>
          <CardDescription>How your venue appears on your kit and public profile.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="vk-venue-name">Venue Name</Label>
              <Input
                id="vk-venue-name"
                className={epkInput}
                value={vkData.venueName}
                onChange={(e) => updateVKData({ venueName: e.target.value })}
                placeholder="The Fillmore"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="vk-tagline">
                Tagline{" "}
                <span className="text-xs text-muted-foreground">
                  ({(vkData.tagline ?? "").length}/100)
                </span>
              </Label>
              <Input
                id="vk-tagline"
                className={epkInput}
                maxLength={100}
                value={vkData.tagline}
                onChange={(e) => updateVKData({ tagline: e.target.value })}
                placeholder="Where legends are made."
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="vk-bio">Description / Bio</Label>
            <Textarea
              id="vk-bio"
              className={epkInput}
              rows={5}
              value={vkData.bio}
              onChange={(e) => updateVKData({ bio: e.target.value })}
              placeholder="Tell artists and bookers what makes your venue special..."
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="vk-website">Website</Label>
            <Input
              id="vk-website"
              className={epkInput}
              type="url"
              value={vkData.website}
              onChange={(e) => updateVKData({ website: e.target.value })}
              placeholder="https://yourvenue.com"
            />
          </div>
        </CardContent>
      </Card>

      {/* Venue Types */}
      <Card className={epkSurface}>
        <CardHeader>
          <CardTitle className="text-base">Venue Types</CardTitle>
          <CardDescription>Select all that apply.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {VENUE_TYPE_OPTIONS.map((type) => {
              const active = (vkData.venueTypes ?? []).includes(type)
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => toggleVenueType(type)}
                  className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                    active
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-white/10 bg-white/5 text-muted-foreground hover:border-white/20"
                  }`}
                >
                  {type}
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Location */}
      <Card className={epkSurface}>
        <CardHeader>
          <CardTitle className="text-base">Location</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="vk-address">Street Address</Label>
            <Input
              id="vk-address"
              className={epkInput}
              value={vkData.location.address}
              onChange={(e) =>
                updateVKData({ location: { ...vkData.location, address: e.target.value } })
              }
              placeholder="1805 Geary Blvd"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="vk-city">City</Label>
              <Input
                id="vk-city"
                className={epkInput}
                value={vkData.location.city}
                onChange={(e) =>
                  updateVKData({ location: { ...vkData.location, city: e.target.value } })
                }
                placeholder="San Francisco"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="vk-state">State / Region</Label>
              <Input
                id="vk-state"
                className={epkInput}
                value={vkData.location.state}
                onChange={(e) =>
                  updateVKData({ location: { ...vkData.location, state: e.target.value } })
                }
                placeholder="CA"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="vk-country">Country</Label>
              <Input
                id="vk-country"
                className={epkInput}
                value={vkData.location.country}
                onChange={(e) =>
                  updateVKData({ location: { ...vkData.location, country: e.target.value } })
                }
                placeholder="US"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
