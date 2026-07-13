"use client"

import React, { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  Link as LinkIcon,
  Globe,
  Save,
  Sparkles,
  ExternalLink,
  Download,
  Share2,
  Loader2,
  Layout,
  FileText,
  AlertCircle,
} from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { useEPKSync } from "@/hooks/use-epk-sync"
import { EpkBuilderView } from "@/components/epk/epk-builder-view"
import { EpkEditorTabs } from "@/components/epk/epk-editor-tabs"
import { epkSurface } from "@/components/epk/epk-ui-styles"
import { supabase } from "@/lib/supabase"

type ViewMode = "builder" | "editor"

function QuickActions({
  onOpenBuilder,
  onShare,
  onDownload,
  viewMode,
}: {
  onOpenBuilder: () => void
  onShare: () => void
  onDownload: () => void
  viewMode: ViewMode
}) {
  return (
    <Card className={`${epkSurface} sticky top-4 border-white/10`}>
      <CardContent className="space-y-2 p-4">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold tracking-tight text-white">
          <Sparkles className="h-4 w-4 shrink-0 text-purple-400" />
          Quick Actions
        </div>
        {viewMode === "editor" && (
          <Button
            onClick={onOpenBuilder}
            className="w-full rounded-xl bg-purple-600 text-white hover:bg-purple-700"
          >
            <Layout className="mr-2 h-4 w-4" />
            Open Builder
          </Button>
        )}
        <Button
          onClick={onShare}
          variant="outline"
          className="w-full rounded-xl border-gray-700/80 bg-transparent text-white hover:bg-white/5"
        >
          <Share2 className="mr-2 h-4 w-4" />
          Share EPK
        </Button>
        <Button
          onClick={onDownload}
          variant="outline"
          className="w-full rounded-xl border-gray-700/80 bg-transparent text-white hover:bg-white/5"
        >
          <Download className="mr-2 h-4 w-4" />
          Download PDF
        </Button>
      </CardContent>
    </Card>
  )
}

export default function EPKPage() {
  const { toast } = useToast()
  const {
    epkData,
    isLoading,
    isSaving,
    needsAuth,
    loadError,
    updateEPKData,
    saveEPKData,
    syncWithProfile,
    reloadEPKData,
  } = useEPKSync()

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [activeTab, setActiveTab] = useState("overview")
  const [viewMode, setViewMode] = useState<ViewMode>("builder")
  const [uploadingMedia, setUploadingMedia] = useState(false)

  function buildNoStoreInit(input?: RequestInit): RequestInit {
    return {
      credentials: "include",
      cache: "no-store",
      ...input,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
        ...(input?.headers || {}),
      },
    }
  }

  useEffect(() => {
    if (!epkData?.artistName) return
    const nextSlug = epkData.artistName
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
    if (!epkData.epkSlug) updateEPKData({ epkSlug: nextSlug })
  }, [epkData?.artistName, epkData?.epkSlug, updateEPKData])

  const handleSave = async () => {
    await saveEPKData()
  }

  const handleShare = () => {
    if (!epkData?.epkSlug) return

    const url = `${window.location.origin}/epk/${epkData.epkSlug}`
    navigator.clipboard.writeText(url)
    fetch(
      "/api/epk/telemetry",
      buildNoStoreInit({
        method: "POST",
        body: JSON.stringify({ epkSlug: epkData.epkSlug, eventType: "share_copy" }),
      })
    ).catch(() => null)
    toast({
      title: "EPK URL copied!",
      description: "Share this link to showcase your EPK.",
    })
  }

  const handleDownload = async () => {
    if (!epkData) return
    try {
      const [{ pdf }, { EPKDocument }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("@/components/epk/EPKDocument"),
      ])

      const doc = (
        <EPKDocument
          data={{
            artistName: epkData.artistName,
            bio: epkData.bio,
            genre: epkData.genre,
            location: epkData.location,
            avatarUrl: epkData.avatarUrl,
            stats: epkData.stats,
            music: epkData.music.map((track) => ({
              title: track.title,
              url: track.url,
              releaseDate: track.releaseDate,
              streams: track.streams,
            })),
            photos: epkData.photos.map((photo) => photo.url),
            press: epkData.press.map((item) => ({
              title: item.title,
              url: item.url,
              date: item.date,
              outlet: item.outlet,
            })),
            contact: {
              email: epkData.contact.email,
              phone: epkData.contact.phone,
              website: epkData.contact.website,
              bookingEmail: epkData.contact.bookingEmail,
              managementEmail: epkData.contact.managementEmail,
            },
            social: epkData.social.map((link) => ({ platform: link.platform, url: link.url })),
            upcomingShows: epkData.upcomingShows.map((show) => ({
              date: show.date,
              venue: show.venue,
              location: show.location,
              ticketUrl: show.ticketUrl,
            })),
          }}
        />
      )
      const blob = await pdf(doc).toBlob()
      const downloadUrl = URL.createObjectURL(blob)
      const anchor = document.createElement("a")
      anchor.href = downloadUrl
      anchor.download = `${epkData.epkSlug || "artist"}-epk.pdf`
      anchor.click()
      URL.revokeObjectURL(downloadUrl)
      fetch(
        "/api/epk/telemetry",
        buildNoStoreInit({
          method: "POST",
          body: JSON.stringify({ epkSlug: epkData.epkSlug, eventType: "pdf_download" }),
        })
      ).catch(() => null)
      toast({
        title: "PDF downloaded",
        description: "Your EPK PDF was generated successfully.",
      })
    } catch {
      toast({
        title: "PDF generation failed",
        description: "Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "avatar" | "cover" | "photos"
  ) => {
    const files = e.target.files
    if (!files || !epkData) return
    setUploadingMedia(true)
    try {
      const uploadedUrls: string[] = []
      for (const file of Array.from(files)) {
        const extension = file.name.split(".").pop() || "jpg"
        const fileName = `epk-${type}-${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`
        const path = `${epkData.epkSlug || "artist"}/${fileName}`
        const { data, error } = await supabase.storage
          .from("post-media")
          .upload(path, file, { upsert: false })
        if (error) throw error
        const { data: publicUrlData } = supabase.storage.from("post-media").getPublicUrl(data.path)
        uploadedUrls.push(publicUrlData.publicUrl)
      }

      if (type === "avatar" && uploadedUrls[0]) updateEPKData({ avatarUrl: uploadedUrls[0] })
      if (type === "cover" && uploadedUrls[0]) updateEPKData({ coverUrl: uploadedUrls[0] })
      if (type === "photos") {
        const nextPhotos = uploadedUrls.map((url) => ({
          id: `${Date.now()}-${Math.random()}`,
          url,
          caption: "",
          isHero: false,
        }))
        updateEPKData({ photos: [...epkData.photos, ...nextPhotos] })
      }
    } catch {
      toast({
        title: "Upload failed",
        description: "Could not upload selected media.",
        variant: "destructive",
      })
    } finally {
      setUploadingMedia(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#181b23]">
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-purple-500" />
          <h2 className="mb-2 text-xl font-semibold text-white">Loading your EPK...</h2>
          <p className="text-gray-400">This might take a moment</p>
        </div>
      </div>
    )
  }

  if (needsAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#181b23]">
        <Card className={`${epkSurface} max-w-md border-white/10 p-8 text-center`}>
          <h2 className="mb-2 text-xl font-semibold text-white">Sign in required</h2>
          <p className="mb-4 text-gray-400">Please sign in to create and edit your EPK.</p>
          <Button asChild className="rounded-xl bg-purple-600 hover:bg-purple-700">
            <Link href="/login">Sign in</Link>
          </Button>
        </Card>
      </div>
    )
  }

  if (!epkData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#181b23]">
        <Card className={`${epkSurface} max-w-md border-white/10 p-8 text-center`}>
          <AlertCircle className="mx-auto mb-4 h-10 w-10 text-red-400" />
          <h2 className="mb-2 text-xl font-semibold text-white">Could not load EPK</h2>
          <p className="mb-4 text-gray-400">{loadError || "Something went wrong loading your EPK data."}</p>
          <Button onClick={() => void reloadEPKData()} className="rounded-xl bg-purple-600 hover:bg-purple-700">
            Try again
          </Button>
        </Card>
      </div>
    )
  }

  if (viewMode === "builder") {
    return (
      <>
        {loadError && (
          <div className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-center text-sm text-amber-200">
            {loadError}
          </div>
        )}
        <EpkBuilderView
          epkData={epkData}
          updateEPKData={updateEPKData}
          onSave={handleSave}
          onShare={handleShare}
          onExitPreview={() => setViewMode("editor")}
          onNavigateToTab={(tab) => {
            setActiveTab(tab)
            setViewMode("editor")
          }}
          isSaving={isSaving}
        />
        <div className="fixed bottom-20 right-4 z-50 flex gap-2 md:bottom-6">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setViewMode("editor")}
            className="rounded-xl border-gray-700/80 bg-[#181b23]/95 text-white backdrop-blur hover:bg-white/5"
          >
            <FileText className="mr-2 h-4 w-4" />
            Editor
          </Button>
        </div>
      </>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#181b23] lg:flex-row">
      <main className="min-w-0 flex-1 px-4 py-4 sm:px-6 lg:py-5 lg:pl-8 lg:pr-3">
        <div className="mx-auto max-w-[1200px] xl:max-w-none">
          {loadError && (
            <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-200">
              {loadError}
            </div>
          )}

          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                Electronic Press Kit
              </h1>
              <p className="mt-0.5 text-sm text-gray-400 sm:text-base">
                Edit sections, templates, and settings
              </p>
            </div>
            <div className="flex flex-shrink-0 flex-wrap gap-2">
              <Button
                onClick={() => setViewMode("builder")}
                className="rounded-xl bg-purple-600 text-white hover:bg-purple-700"
              >
                <Layout className="mr-2 h-4 w-4" />
                Builder
              </Button>
              <Button
                onClick={() => void syncWithProfile()}
                variant="outline"
                className="rounded-xl border-gray-700/80 text-white hover:bg-white/5"
              >
                <LinkIcon className="mr-2 h-4 w-4" />
                Sync with Profile
              </Button>
              <Button
                variant="outline"
                onClick={() => void handleSave()}
                disabled={isSaving}
                className="rounded-xl border-gray-700/80 text-white hover:bg-white/5"
              >
                {isSaving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save Changes
              </Button>
            </div>
          </div>

          <Card className={`${epkSurface} mb-4 border-white/10`}>
            <CardContent className="p-3 sm:p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Globe className="h-5 w-5 shrink-0 text-purple-400" />
                    <span className="text-sm font-medium text-white sm:text-base">Public EPK</span>
                  </div>
                  <Switch
                    checked={epkData.isPublic}
                    onCheckedChange={(checked) => updateEPKData({ isPublic: checked })}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={epkData.isPublic ? "default" : "secondary"} className="rounded-lg bg-purple-600">
                    {epkData.isPublic ? "Live" : "Draft"}
                  </Badge>
                  {epkData.isPublic && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleShare}
                      className="rounded-xl text-purple-400 hover:bg-white/5 hover:text-purple-300"
                    >
                      <ExternalLink className="mr-1 h-4 w-4" />
                      View Live
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <EpkEditorTabs
            epkData={epkData}
            updateEPKData={updateEPKData}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            syncWithProfile={syncWithProfile}
            onFileUpload={handleFileUpload}
            uploadingMedia={uploadingMedia}
            fileInputRef={fileInputRef}
            onOpenBuilder={() => setViewMode("builder")}
          />
        </div>
      </main>

      <aside className="flex w-full shrink-0 flex-col gap-3 border-t border-gray-800/80 bg-[#181b23] p-4 lg:w-[280px] lg:border-l lg:border-t-0 lg:py-5 lg:pl-3 lg:pr-4">
        <QuickActions
          onOpenBuilder={() => setViewMode("builder")}
          onShare={handleShare}
          onDownload={handleDownload}
          viewMode={viewMode}
        />
      </aside>
    </div>
  )
}
