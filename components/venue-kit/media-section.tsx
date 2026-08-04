"use client"

import React, { useRef, useState } from "react"
import Image from "next/image"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Upload, Trash2, Star, StarOff, ImagePlus } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/components/ui/use-toast"
import type { VKData } from "@/lib/services/venue-kit.service"
import { epkInput, epkSurface } from "@/components/epk/epk-ui-styles"

type Photo = VKData["photos"][number]

interface Props {
  vkData: VKData
  updateVKData: (updates: Partial<VKData>) => void
}

export default function MediaSection({ vkData, updateVKData }: Props) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const photos = vkData.photos ?? []

  const uploadPhoto = async (file: File) => {
    if (!user?.id) return
    const ext = file.name.split(".").pop()
    const path = `venue-kit/${user.id}/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from("venue-media").upload(path, file, { upsert: true })
    if (error) throw error
    const { data } = supabase.storage.from("venue-media").getPublicUrl(path)
    return data.publicUrl
  }

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setUploading(true)
    try {
      const newPhotos: Photo[] = []
      for (const file of Array.from(files)) {
        const url = await uploadPhoto(file)
        if (url) {
          newPhotos.push({
            id: crypto.randomUUID(),
            url,
            caption: "",
            isHero: photos.length === 0 && newPhotos.length === 0,
          })
        }
      }
      updateVKData({ photos: [...photos, ...newPhotos] })
      toast({ title: `${newPhotos.length} photo(s) uploaded` })
    } catch (err) {
      toast({ title: "Upload failed", description: String(err), variant: "destructive" })
    } finally {
      setUploading(false)
    }
  }

  const removePhoto = (id: string) => {
    const remaining = photos.filter((p) => p.id !== id)
    // Ensure at least one hero
    if (remaining.length > 0 && !remaining.some((p) => p.isHero)) {
      remaining[0].isHero = true
    }
    updateVKData({ photos: remaining })
  }

  const setHero = (id: string) => {
    updateVKData({ photos: photos.map((p) => ({ ...p, isHero: p.id === id })) })
  }

  const updateCaption = (id: string, caption: string) => {
    updateVKData({ photos: photos.map((p) => (p.id === id ? { ...p, caption } : p)) })
  }

  return (
    <div className="space-y-6">
      {/* Cover + Avatar */}
      <Card className={epkSurface}>
        <CardHeader>
          <CardTitle className="text-base">Cover & Avatar</CardTitle>
          <CardDescription>Used in the hero section of your Venue Kit and public profile.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="vk-cover-url">Cover Image URL</Label>
              <Input
                id="vk-cover-url"
                className={epkInput}
                type="url"
                value={vkData.coverUrl}
                onChange={(e) => updateVKData({ coverUrl: e.target.value })}
                placeholder="https://... or upload below"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="vk-avatar-url">Avatar / Logo URL</Label>
              <Input
                id="vk-avatar-url"
                className={epkInput}
                type="url"
                value={vkData.avatarUrl}
                onChange={(e) => updateVKData({ avatarUrl: e.target.value })}
                placeholder="https://..."
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Photo Gallery */}
      <Card className={epkSurface}>
        <CardHeader>
          <CardTitle className="text-base">Gallery Photos</CardTitle>
          <CardDescription>
            Photos appear in the gallery section of your Venue Kit. Star a photo to mark it as the hero.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {photos.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {photos.map((photo) => (
                <div key={photo.id} className="relative group rounded-lg overflow-hidden border border-white/10">
                  <div className="aspect-video relative bg-white/5">
                    <Image src={photo.url} alt={photo.caption || "Gallery photo"} fill className="object-cover" />
                  </div>
                  <div className="p-2 space-y-1">
                    <Input
                      className={`${epkInput} text-xs h-7`}
                      value={photo.caption}
                      onChange={(e) => updateCaption(photo.id, e.target.value)}
                      placeholder="Caption..."
                    />
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground"
                        title={photo.isHero ? "Hero photo" : "Set as hero"}
                        onClick={() => setHero(photo.id)}
                      >
                        {photo.isHero ? (
                          <Star className="h-3.5 w-3.5 text-yellow-400 fill-yellow-400" />
                        ) : (
                          <StarOff className="h-3.5 w-3.5" />
                        )}
                      </Button>
                      {photo.isHero && (
                        <Badge variant="secondary" className="text-[10px] h-5">Hero</Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 ml-auto text-muted-foreground hover:text-destructive"
                        onClick={() => removePhoto(photo.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
          <Button
            variant="outline"
            className="w-full border-dashed border-white/20"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? (
              <span className="text-sm">Uploading...</span>
            ) : (
              <>
                <ImagePlus className="mr-2 h-4 w-4" />
                Upload Photos
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
