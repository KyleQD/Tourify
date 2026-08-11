"use client"

import React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Trash2, ExternalLink } from "lucide-react"
import type { VKData } from "@/lib/services/venue-kit.service"
import { epkInput, epkSurface } from "@/components/epk/epk-ui-styles"

type SocialLink = VKData["social"][number]

const PLATFORMS = [
  { id: "Instagram",  baseUrl: "https://instagram.com/",  placeholder: "@yourvenue" },
  { id: "Facebook",   baseUrl: "https://facebook.com/",   placeholder: "facebook.com/yourvenue" },
  { id: "Twitter",    baseUrl: "https://x.com/",          placeholder: "@yourvenue" },
  { id: "TikTok",     baseUrl: "https://tiktok.com/@",    placeholder: "@yourvenue" },
  { id: "YouTube",    baseUrl: "https://youtube.com/@",   placeholder: "@yourchannel" },
  { id: "Spotify",    baseUrl: "https://open.spotify.com/", placeholder: "Spotify artist URL" },
  { id: "Bandcamp",   baseUrl: "https://",               placeholder: "yourvenue.bandcamp.com" },
  { id: "Website",    baseUrl: "https://",               placeholder: "https://yourvenue.com" },
]

interface Props {
  vkData: VKData
  updateVKData: (updates: Partial<VKData>) => void
}

export default function SocialSection({ vkData, updateVKData }: Props) {
  const links = vkData.social ?? []

  const update = (id: string, patch: Partial<SocialLink>) => {
    updateVKData({ social: links.map((l) => (l.id === id ? { ...l, ...patch } : l)) })
  }

  const add = () => {
    updateVKData({
      social: [
        ...links,
        { id: crypto.randomUUID(), platform: "Instagram", url: "", username: "" },
      ],
    })
  }

  const remove = (id: string) => {
    updateVKData({ social: links.filter((l) => l.id !== id) })
  }

  return (
    <Card className={epkSurface}>
      <CardHeader>
        <CardTitle className="text-base">Social Links</CardTitle>
        <CardDescription>Add your social media profiles and website links.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {links.length === 0 && (
          <p className="rounded-lg border border-dashed border-white/10 py-8 text-center text-sm text-muted-foreground">
            No links added yet.
          </p>
        )}

        {links.map((link) => {
          const meta = PLATFORMS.find((p) => p.id === link.platform) ?? PLATFORMS[0]
          return (
            <div key={link.id} className="flex items-end gap-2">
              <div className="space-y-1.5 w-36 shrink-0">
                <Label>Platform</Label>
                <Select
                  value={link.platform}
                  onValueChange={(v) => update(link.id, { platform: v })}
                >
                  <SelectTrigger className={epkInput}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PLATFORMS.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1 space-y-1.5">
                <Label>URL</Label>
                <Input
                  className={epkInput}
                  type="url"
                  value={link.url}
                  onChange={(e) => update(link.id, { url: e.target.value })}
                  placeholder={meta.placeholder}
                />
              </div>

              {link.url && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 text-muted-foreground"
                  asChild
                >
                  <a href={link.url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              )}

              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => remove(link.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )
        })}

        <Button variant="outline" className="w-full border-dashed border-white/20 mt-2" onClick={add}>
          <Plus className="mr-2 h-4 w-4" />
          Add Social Link
        </Button>
      </CardContent>
    </Card>
  )
}
