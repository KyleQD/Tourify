"use client"
/**
 * VkPdfExport
 * PDF download button for the Venue Kit document.
 * Mirrors EPKDocument.tsx — uses html2pdf dynamically imported.
 */
import React, { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Download, Loader2 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import type { VKData } from "@/lib/services/venue-kit.service"
import VkDocument from "./vk-document"

interface VkPdfExportProps {
  vkData: VKData
  className?: string
}

export default function VkPdfExport({ vkData, className }: VkPdfExportProps) {
  const { toast } = useToast()
  const [isGenerating, setIsGenerating] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleDownload = async () => {
    if (!containerRef.current) return
    setIsGenerating(true)

    try {
      // Dynamic import so html2pdf only loads when needed
      const html2pdf = (await import("html2pdf.js")).default

      const fileName = `${vkData.vkSlug || vkData.venueName.toLowerCase().replace(/\s+/g, "-") || "venue"}-kit.pdf`

      const options = {
        margin:      [0, 0, 0, 0],
        filename:    fileName,
        image:       { type: "jpeg", quality: 0.96 },
        html2canvas: { scale: 2, useCORS: true, allowTaint: true, logging: false },
        jsPDF:       { unit: "mm", format: "a4", orientation: "portrait" as const },
        pagebreak:   { mode: ["avoid-all", "css", "legacy"] },
      }

      await html2pdf().set(options).from(containerRef.current).save()
      toast({ title: "PDF downloaded", description: fileName })
    } catch (err) {
      console.error("PDF export failed", err)
      toast({ title: "PDF export failed", description: String(err), variant: "destructive" })
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className={className}
        disabled={isGenerating}
        onClick={handleDownload}
      >
        {isGenerating ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Download className="mr-2 h-4 w-4" />
        )}
        {isGenerating ? "Generating…" : "Download PDF"}
      </Button>

      {/* Hidden render target — renders off-screen for PDF generation */}
      <div
        className="pointer-events-none fixed left-[-9999px] top-0 z-[-1] w-[794px]"
        aria-hidden
      >
        <VkDocument
          vkData={vkData}
          showPlaceholder={false}
          containerRef={containerRef}
        />
      </div>
    </>
  )
}
