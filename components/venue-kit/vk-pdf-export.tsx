"use client"
/**
 * VkPdfExport
 * PDF download button for the Venue Kit document.
 * Opens the browser print dialog so users can save the rendered kit as PDF.
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
      const fileName = `${vkData.vkSlug || vkData.venueName.toLowerCase().replace(/\s+/g, "-") || "venue"}-kit.pdf`
      const printWindow = window.open("", "_blank", "width=900,height=700")
      if (!printWindow) {
        throw new Error("Allow pop-ups to export the Venue Kit as a PDF.")
      }

      printWindow.opener = null
      const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
        .map((node) => node.outerHTML)
        .join("\n")
      printWindow.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Venue Kit</title>${styles}<style>
        @page { size: A4; margin: 0; }
        html, body { margin: 0; padding: 0; background: white; }
        body { width: 794px; }
      </style></head><body>${containerRef.current.innerHTML}</body></html>`)
      printWindow.document.close()
      printWindow.document.title = fileName
      printWindow.focus()
      printWindow.onafterprint = () => printWindow.close()
      window.setTimeout(() => printWindow.print(), 250)
      toast({ title: "PDF export ready", description: `Choose “Save as PDF” in the print dialog for ${fileName}.` })
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
