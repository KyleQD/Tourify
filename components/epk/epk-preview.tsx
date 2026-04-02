"use client"

import React from "react"
import type { EPKData } from "@/lib/services/epk.service"
import { epkFontClass } from "@/components/epk/epk-preview-fonts"
import {
  BoldEpkTemplate,
  ClassicEpkTemplate,
  MinimalEpkTemplate,
  ModernEpkTemplate,
} from "@/components/epk/epk-template-variants"
import { Music } from "lucide-react"

export interface EPKPreviewProps {
  data: EPKData
  template?: string
  /** Show labeled placeholders for empty fields (default: true so the layout is always scannable). */
  showPlaceholder?: boolean
}

/** Maps editor template ids (and legacy ids) to the four built-in preview layouts. */
export function resolveEpkPreviewTemplateId(
  template: string | undefined
): "modern" | "classic" | "minimal" | "bold" {
  const t = String(template || "modern").toLowerCase()
  switch (t) {
    case "modern":
      return "modern"
    case "classic":
      return "classic"
    case "minimal":
      return "minimal"
    case "bold":
      return "bold"
    case "black":
      return "minimal"
    case "neon":
      return "bold"
    case "sunset":
      return "classic"
    default:
      return "modern"
  }
}

export default function EPKPreview({
  data,
  template = "modern",
  showPlaceholder = true,
}: EPKPreviewProps) {
  const fontClass = epkFontClass(data.epkFont ?? "sans")
  const resolved = resolveEpkPreviewTemplateId(template)
  const props = { data, fontClass, showPlaceholder }

  if (!data.artistName?.trim() && !showPlaceholder) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="text-center text-white/60">
          <div className="relative mb-8">
            <div className="absolute inset-0 animate-pulse rounded-full bg-purple-500 opacity-20 blur-md" />
            <Music className="relative mx-auto h-24 w-24 text-white/40" />
          </div>
          <h2 className="mb-4 text-3xl font-bold text-white/80">Start Building Your EPK</h2>
          <p className="text-lg text-white/60">Add your artist information to see the preview</p>
        </div>
      </div>
    )
  }

  switch (resolved) {
    case "modern":
      return <ModernEpkTemplate {...props} />
    case "classic":
      return <ClassicEpkTemplate {...props} />
    case "minimal":
      return <MinimalEpkTemplate {...props} />
    case "bold":
      return <BoldEpkTemplate {...props} />
    default:
      return <ModernEpkTemplate {...props} />
  }
}
