"use client"

import { useState, useEffect } from "react"
import { PageHeader } from "../../components/navigation/page-header"
import { FeatureTabs } from "../../components/navigation/feature-tabs"
import { Button } from "@/components/ui/button"
import { Plus, ImageIcon, Video, Music, Filter, Grid3X3, LayoutList, Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabase"

interface GalleryItem {
  id: string
  name: string
  type: "image" | "video" | "audio"
  src: string
}

function inferMediaType(name: string): "image" | "video" | "audio" {
  const ext = name.split(".").pop()?.toLowerCase() ?? ""
  if (["mp4", "mov", "webm"].includes(ext)) return "video"
  if (["mp3", "wav", "ogg", "flac", "aac"].includes(ext)) return "audio"
  return "image"
}

export default function GalleryPage() {
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const tabs = [
    { id: "all", label: "All Media" },
    { id: "images", label: "Images" },
    { id: "videos", label: "Videos" },
    { id: "audio", label: "Audio" },
  ]

  useEffect(() => {
    async function loadGallery() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setIsLoading(false)
          return
        }

        const folder = user.id
        const { data: files, error } = await supabase.storage
          .from("venue-media")
          .list(folder, { limit: 100, sortBy: { column: "created_at", order: "desc" } })

        if (error) {
          console.warn("Could not list venue media:", error.message)
          setGalleryItems([])
          setIsLoading(false)
          return
        }

        const items: GalleryItem[] = (files ?? [])
          .filter((f) => f.name && !f.name.startsWith("."))
          .map((f) => {
            const { data: urlData } = supabase.storage
              .from("venue-media")
              .getPublicUrl(`${folder}/${f.name}`)

            return {
              id: f.id ?? f.name,
              name: f.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " "),
              type: inferMediaType(f.name),
              src: urlData.publicUrl,
            }
          })

        setGalleryItems(items)
      } catch (err) {
        console.error("Failed to load gallery:", err)
        setGalleryItems([])
      } finally {
        setIsLoading(false)
      }
    }

    loadGallery()
  }, [])

  return (
    <div className="min-w-0 space-y-6">
      <PageHeader
        title="Media Gallery"
        description="Manage your photos, videos, and audio files"
        breadcrumbs={[
          { label: "Resources", href: "/resources" },
          { label: "Gallery", href: "/gallery" },
        ]}
        actions={
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            <span>Upload Media</span>
          </Button>
        }
      />

      <div className="flex min-w-0 flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <FeatureTabs tabs={tabs} defaultTab="all" className="min-w-0 flex-1" />
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8">
            <Grid3X3 className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8">
            <LayoutList className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading media…</span>
        </div>
      ) : galleryItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <ImageIcon className="h-10 w-10 text-muted-foreground mb-3" />
          <h3 className="font-medium">No media yet</h3>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Upload photos, videos, and audio to showcase your venue.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {galleryItems.map((item) => (
            <div key={item.id} className="group relative overflow-hidden rounded-md border bg-background">
              <div className="aspect-square overflow-hidden">
                <img
                  src={item.src || "/placeholder.svg"}
                  alt={item.name}
                  className="h-full w-full object-cover transition-all group-hover:scale-105"
                />
              </div>
              <div className="min-w-0 p-3">
                <h3 className="truncate font-medium capitalize" title={item.name}>
                  {item.name}
                </h3>
                <div className="mt-2 flex min-w-0 items-center justify-between gap-2">
                  <div className="flex items-center text-xs text-muted-foreground">
                    {item.type === "image" && <ImageIcon className="h-3 w-3 mr-1" />}
                    {item.type === "video" && <Video className="h-3 w-3 mr-1" />}
                    {item.type === "audio" && <Music className="h-3 w-3 mr-1" />}
                    <span className="capitalize">{item.type}</span>
                  </div>
                  <Button variant="ghost" size="sm" className="h-7 px-2">
                    <span className="sr-only">Options</span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-4 w-4"
                    >
                      <circle cx="12" cy="12" r="1" />
                      <circle cx="19" cy="12" r="1" />
                      <circle cx="5" cy="12" r="1" />
                    </svg>
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
