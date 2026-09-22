"use client"

import React, { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Trash2, CalendarDays, ExternalLink } from "lucide-react"
import type { VKData } from "@/lib/services/venue-kit.service"
import { epkInput, epkSurface } from "@/components/epk/epk-ui-styles"

type Show = VKData["upcomingShows"][number]

interface Props {
  vkData: VKData
  updateVKData: (updates: Partial<VKData>) => void
}

const EMPTY_SHOW = (): Show => ({
  id: crypto.randomUUID(),
  date: "",
  artistName: "",
  title: "",
  ticketUrl: "",
  status: "upcoming",
})

export default function ShowsSection({ vkData, updateVKData }: Props) {
  const shows = vkData.upcomingShows ?? []

  const update = (id: string, patch: Partial<Show>) => {
    updateVKData({
      upcomingShows: shows.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    })
  }

  const add = () => {
    updateVKData({ upcomingShows: [...shows, EMPTY_SHOW()] })
  }

  const remove = (id: string) => {
    updateVKData({ upcomingShows: shows.filter((s) => s.id !== id) })
  }

  return (
    <Card className={epkSurface}>
      <CardHeader>
        <CardTitle className="text-base">Upcoming Shows</CardTitle>
        <CardDescription>
          Shows appear on your Venue Kit and public profile. Add dates artists are performing at your venue.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {shows.length === 0 && (
          <p className="rounded-lg border border-dashed border-white/10 py-8 text-center text-sm text-muted-foreground">
            No shows added yet. Click "Add Show" to get started.
          </p>
        )}

        {shows.map((show, idx) => (
          <div
            key={show.id}
            className="relative rounded-xl border border-white/10 bg-white/5 p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Show {idx + 1}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={() => remove(show.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input
                  className={epkInput}
                  type="date"
                  value={show.date}
                  onChange={(e) => update(show.id, { date: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select
                  value={show.status}
                  onValueChange={(v) => update(show.id, { status: v as Show["status"] })}
                >
                  <SelectTrigger className={epkInput}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="upcoming">Upcoming</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Artist / Performer Name</Label>
              <Input
                className={epkInput}
                value={show.artistName}
                onChange={(e) => update(show.id, { artistName: e.target.value })}
                placeholder="The Rolling Stones"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Event Title (optional)</Label>
              <Input
                className={epkInput}
                value={show.title}
                onChange={(e) => update(show.id, { title: e.target.value })}
                placeholder="An Evening with The Rolling Stones"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Ticket URL</Label>
              <Input
                className={epkInput}
                type="url"
                value={show.ticketUrl}
                onChange={(e) => update(show.id, { ticketUrl: e.target.value })}
                placeholder="https://tickets.yourvenue.com/event"
              />
            </div>
          </div>
        ))}

        <Button variant="outline" className="w-full border-dashed border-white/20" onClick={add}>
          <Plus className="mr-2 h-4 w-4" />
          Add Show
        </Button>
      </CardContent>
    </Card>
  )
}
