"use client"
/**
 * VkPublicPageClient
 * Client wrapper for the public /vk/[slug] page.
 * Renders the VkDocument with a floating action bar.
 */
import React, { useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Link2 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import dynamic from "next/dynamic"
import VkDocument from "@/components/venue-kit/vk-document"
import type { VKData } from "@/lib/services/venue-kit.service"

const VkPdfExport = dynamic(() => import("@/components/venue-kit/vk-pdf-export"), { ssr: false })

interface Props {
  vkData: VKData
}

export default function VkPublicPageClient({ vkData }: Props) {
  const { toast } = useToast()

  const handleCopyLink = useCallback(() => {
    void navigator.clipboard.writeText(window.location.href)
    toast({ title: "Link copied", description: window.location.href })
  }, [toast])

  return (
    <div className="min-h-screen">
      {/* Floating action bar */}
      <div className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/10 bg-black/70 px-4 py-2 shadow-2xl backdrop-blur-xl">
        <span className="max-w-[160px] truncate text-xs font-medium text-white">
          {vkData.venueName}
        </span>
        <div className="h-4 w-px bg-white/20" />
        <VkPdfExport vkData={vkData} className="rounded-full border-white/10 bg-white/5 text-xs" />
        <Button
          variant="ghost"
          size="sm"
          className="rounded-full text-xs text-slate-300 hover:text-white"
          onClick={handleCopyLink}
        >
          <Link2 className="mr-1.5 h-3.5 w-3.5" />
          Copy Link
        </Button>
      </div>

      {/* Document */}
      <VkDocument vkData={vkData} showPlaceholder={false} trackingEnabled={true} />
    </div>
  )
}
