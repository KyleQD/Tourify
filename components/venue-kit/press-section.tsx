"use client"

import React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Trash2 } from "lucide-react"
import type { VKData } from "@/lib/services/venue-kit.service"
import { epkInput, epkSurface } from "@/components/epk/epk-ui-styles"

type PressItem = VKData["press"][number]

interface Props {
  vkData: VKData
  updateVKData: (updates: Partial<VKData>) => void
}

const EMPTY_PRESS = (): PressItem => ({
  id: crypto.randomUUID(),
  title: "",
  outlet: "",
  url: "",
  date: "",
  excerpt: "",
})

export default function PressSection({ vkData, updateVKData }: Props) {
  const press = vkData.press ?? []

  const update = (id: string, patch: Partial<PressItem>) => {
    updateVKData({ press: press.map((p) => (p.id === id ? { ...p, ...patch } : p)) })
  }

  const add = () => updateVKData({ press: [...press, EMPTY_PRESS()] })
  const remove = (id: string) => updateVKData({ press: press.filter((p) => p.id !== id) })

  return (
    <Card className={epkSurface}>
      <CardHeader>
        <CardTitle className="text-base">Press & Reviews</CardTitle>
        <CardDescription>
          Add press mentions, reviews, and media features that credentialize your venue.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {press.length === 0 && (
          <p className="rounded-lg border border-dashed border-white/10 py-8 text-center text-sm text-muted-foreground">
            No press added yet. Click "Add Press Item" to get started.
          </p>
        )}

        {press.map((item, idx) => (
          <div
            key={item.id}
            className="relative rounded-xl border border-white/10 bg-white/5 p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Press Item {idx + 1}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={() => remove(item.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Outlet / Publication</Label>
                <Input
                  className={epkInput}
                  value={item.outlet}
                  onChange={(e) => update(item.id, { outlet: e.target.value })}
                  placeholder="Rolling Stone"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input
                  className={epkInput}
                  type="date"
                  value={item.date}
                  onChange={(e) => update(item.id, { date: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Headline / Title</Label>
              <Input
                className={epkInput}
                value={item.title}
                onChange={(e) => update(item.id, { title: e.target.value })}
                placeholder="The Fillmore: A San Francisco Icon Reborn"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Excerpt</Label>
              <Textarea
                className={epkInput}
                rows={3}
                value={item.excerpt}
                onChange={(e) => update(item.id, { excerpt: e.target.value })}
                placeholder="A short quote or summary from the article..."
              />
            </div>

            <div className="space-y-1.5">
              <Label>Article URL</Label>
              <Input
                className={epkInput}
                type="url"
                value={item.url}
                onChange={(e) => update(item.id, { url: e.target.value })}
                placeholder="https://rollingstone.com/..."
              />
            </div>
          </div>
        ))}

        <Button variant="outline" className="w-full border-dashed border-white/20" onClick={add}>
          <Plus className="mr-2 h-4 w-4" />
          Add Press Item
        </Button>
      </CardContent>
    </Card>
  )
}
