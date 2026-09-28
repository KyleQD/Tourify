"use client"
/**
 * /venue/kit — Venue Kit Builder Page
 * Management/preview/publish interface for the Venue Kit.
 * Data and appearance are edited in /venue/edit.
 * This page handles drag-to-reorder sections, publish/unpublish, and download.
 */
import React, { useCallback, useState } from "react"
import Link from "next/link"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Pencil, Eye } from "lucide-react"
import { useVKSync } from "@/hooks/use-vk-sync"
import VkCommandHeader from "@/components/venue-kit/vk-command-header"
import VkDocument from "@/components/venue-kit/vk-document"
import dynamic from "next/dynamic"
import { epkSurface } from "@/components/epk/epk-ui-styles"
import { VK_DEFAULT_SECTION_ORDER, type VKData } from "@/lib/services/venue-kit.service"
import { cn } from "@/lib/utils"

const VkPdfExport = dynamic(() => import("@/components/venue-kit/vk-pdf-export"), { ssr: false })

// Section labels for the reorder panel
const VK_SECTION_LABELS: Record<string, string> = {
  hero:      "Hero",
  bio:       "About",
  specs:     "Technical Specs",
  amenities: "Amenities",
  shows:     "Upcoming Shows",
  gallery:   "Gallery",
  press:     "Press",
  contact:   "Contact & Booking",
  social:    "Social",
}

export default function VenueKitPage() {
  const { toast } = useToast()
  const {
    vkData,
    savedVkData,
    publicUrl,
    lastSavedAt,
    hasSavedVk,
    isLoading,
    isSaving,
    isDirty,
    isPublished,
    saveError,
    updateVKData,
    saveVK,
    publishVK,
    unpublishVK,
  } = useVKSync()

  const handleSaveDraft = useCallback(async () => {
    await saveVK()
  }, [saveVK])

  const handlePublish = useCallback(async () => {
    await publishVK()
  }, [publishVK])

  const handleUnpublish = useCallback(async () => {
    await unpublishVK()
  }, [unpublishVK])

  const handleCopyUrl = useCallback(() => {
    if (!publicUrl) return
    const full = `${window.location.origin}${publicUrl}`
    void navigator.clipboard.writeText(full)
    toast({ title: "Link copied", description: full })
  }, [publicUrl, toast])

  const handleViewLive = useCallback(() => {
    if (!publicUrl) return
    window.open(publicUrl, "_blank", "noopener")
  }, [publicUrl])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-400 border-t-transparent" />
      </div>
    )
  }

  if (!vkData) return null

  return (
    <div className="min-h-screen bg-[#060711] px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-5xl space-y-5">
        {/* Command Header */}
        <VkCommandHeader
          venueName={vkData.venueName}
          publicUrl={publicUrl}
          lastSavedAt={lastSavedAt}
          isDirty={isDirty}
          isPublished={isPublished}
          isSaving={isSaving}
          hasSavedVk={hasSavedVk}
          saveError={saveError}
          onSaveDraft={handleSaveDraft}
          onPublish={handlePublish}
          onUnpublish={handleUnpublish}
          onViewLive={handleViewLive}
          onCopyUrl={handleCopyUrl}
          secondaryLinkHref="/venue/edit?tab=kit"
          secondaryLinkLabel="Edit Content & Appearance"
        />

        <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
          {/* Section Reorder Panel */}
          <aside className="space-y-4">
            <Card className={epkSurface}>
              <CardContent className="p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Sections
                </p>
                <SectionOrderPanel vkData={vkData} updateVKData={updateVKData} />
              </CardContent>
            </Card>

            {/* PDF Download */}
            {hasSavedVk && (
              <VkPdfExport vkData={savedVkData ?? vkData} className="w-full justify-center" />
            )}

            {/* Link to edit */}
            <Button variant="outline" className="w-full border-white/10 text-sm" asChild>
              <Link href="/venue/edit?tab=kit">
                <Pencil className="mr-2 h-4 w-4" />
                Edit Content & Appearance
              </Link>
            </Button>
          </aside>

          {/* Document Preview */}
          <div className="overflow-hidden rounded-2xl border border-white/10 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 bg-white/5 px-4 py-2">
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
                <div className="h-2.5 w-2.5 rounded-full bg-amber-500/70" />
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-500/70" />
              </div>
              <p className="text-xs text-muted-foreground">
                {isPublished && publicUrl
                  ? `tourify.com${publicUrl}`
                  : "Preview — not yet published"}
              </p>
              {isPublished && publicUrl && (
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleViewLive}>
                  <Eye className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
            <div className="overflow-auto" style={{ maxHeight: "80vh" }}>
              <VkDocument vkData={vkData} showPlaceholder={true} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Section reorder / visibility panel (simple list without DnD for now)
// ─────────────────────────────────────────────────────────────────────────────
function SectionOrderPanel({
  vkData,
  updateVKData,
}: {
  vkData: VKData
  updateVKData: (u: Partial<VKData>) => void
}) {
  const order = vkData.layout.sectionOrder
  const visibility = vkData.layout.sectionVisibility

  const toggleVisibility = (key: string) => {
    updateVKData({
      layout: {
        ...vkData.layout,
        sectionVisibility: { ...visibility, [key]: !visibility[key] },
      },
    })
  }

  return (
    <div className="space-y-1">
      {order.map((key) => {
        const visible = visibility[key] !== false
        return (
          <div
            key={key}
            className={cn(
              "flex items-center justify-between rounded-lg px-3 py-2 text-sm",
              visible ? "bg-white/5 text-white" : "bg-transparent text-muted-foreground opacity-50"
            )}
          >
            <span>{VK_SECTION_LABELS[key] ?? key}</span>
            <button
              type="button"
              onClick={() => toggleVisibility(key)}
              className="rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide transition-colors hover:bg-white/10"
            >
              {visible ? "Hide" : "Show"}
            </button>
          </div>
        )
      })}
    </div>
  )
}
