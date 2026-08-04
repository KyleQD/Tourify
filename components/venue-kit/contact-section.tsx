"use client"

import React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { ExternalLink, FileDown } from "lucide-react"
import type { VKData } from "@/lib/services/venue-kit.service"
import { epkInput, epkSurface } from "@/components/epk/epk-ui-styles"

interface Props {
  vkData: VKData
  updateVKData: (updates: Partial<VKData>) => void
}

export default function ContactSection({ vkData, updateVKData }: Props) {
  const c = vkData.contact

  const update = (patch: Partial<VKData["contact"]>) => {
    updateVKData({ contact: { ...c, ...patch } })
  }

  return (
    <div className="space-y-6">
      <Card className={epkSurface}>
        <CardHeader>
          <CardTitle className="text-base">Contact Information</CardTitle>
          <CardDescription>
            This information appears in your Venue Kit contact section and public profile.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="vk-email">General Email</Label>
              <Input
                id="vk-email"
                className={epkInput}
                type="email"
                value={c.email}
                onChange={(e) => update({ email: e.target.value })}
                placeholder="hello@yourvenue.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="vk-booking-email">Booking Email</Label>
              <Input
                id="vk-booking-email"
                className={epkInput}
                type="email"
                value={c.bookingEmail}
                onChange={(e) => update({ bookingEmail: e.target.value })}
                placeholder="bookings@yourvenue.com"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="vk-phone">Phone</Label>
              <Input
                id="vk-phone"
                className={epkInput}
                type="tel"
                value={c.phone}
                onChange={(e) => update({ phone: e.target.value })}
                placeholder="+1 (415) 555-0100"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="vk-contact-website">Website</Label>
              <Input
                id="vk-contact-website"
                className={epkInput}
                type="url"
                value={c.website}
                onChange={(e) => update({ website: e.target.value })}
                placeholder="https://yourvenue.com"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className={epkSurface}>
        <CardHeader>
          <CardTitle className="text-base">Booking Assets</CardTitle>
          <CardDescription>
            Link to your tech rider and stage plot. Artists will be able to download these directly from your Venue Kit.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="vk-tech-rider">Tech Rider URL</Label>
            <div className="flex gap-2">
              <Input
                id="vk-tech-rider"
                className={epkInput}
                type="url"
                value={c.techRiderUrl}
                onChange={(e) => update({ techRiderUrl: e.target.value })}
                placeholder="https://drive.google.com/... or storage URL"
              />
              {c.techRiderUrl && (
                <Button
                  variant="outline"
                  size="icon"
                  className="shrink-0 border-white/10"
                  asChild
                >
                  <a href={c.techRiderUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="vk-stage-plot">Stage Plot URL</Label>
            <div className="flex gap-2">
              <Input
                id="vk-stage-plot"
                className={epkInput}
                type="url"
                value={c.stagePlotUrl}
                onChange={(e) => update({ stagePlotUrl: e.target.value })}
                placeholder="https://drive.google.com/... or storage URL"
              />
              {c.stagePlotUrl && (
                <Button
                  variant="outline"
                  size="icon"
                  className="shrink-0 border-white/10"
                  asChild
                >
                  <a href={c.stagePlotUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
