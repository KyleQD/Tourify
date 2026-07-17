"use client"

import React from "react"
import type { EPKData } from "@/lib/services/epk.service"
import { epkFontClass } from "@/components/epk/epk-preview-fonts"
import {
  BoldEpkTemplate,
  BandCardEpkTemplate,
  CinemaEpkTemplate,
  ClassicEpkTemplate,
  CheckerboardEpkTemplate,
  CoastalEpkTemplate,
  ColorBlockEpkTemplate,
  DossierEpkTemplate,
  EditorialEpkTemplate,
  GalleryEpkTemplate,
  LuxeEpkTemplate,
  MinimalEpkTemplate,
  ModernEpkTemplate,
  PosterEpkTemplate,
  PressGridEpkTemplate,
  RedColumnEpkTemplate,
  ScrapbookEpkTemplate,
  SunburstEpkTemplate,
  WhitespaceEpkTemplate,
} from "@/components/epk/epk-template-variants"
import { resolveEpkPreviewTemplateId } from "@/lib/epk/epk-skin-tokens"
import { Music } from "lucide-react"

export { resolveEpkPreviewTemplateId } from "@/lib/epk/epk-skin-tokens"

export interface EPKPreviewProps {
  data: EPKData
  template?: string
  /** Show labeled placeholders for empty fields (default: true so the layout is always scannable). */
  showPlaceholder?: boolean
  /** Enables public click telemetry for section-level links. Builder/editor previews keep this off. */
  trackingEnabled?: boolean
}

export default function EPKPreview({
  data,
  template = "modern",
  showPlaceholder = true,
  trackingEnabled = false,
}: EPKPreviewProps) {
  const fontClass = epkFontClass(data.epkFont ?? "sans")
  const resolved = resolveEpkPreviewTemplateId(template)
  const props = { data, fontClass, showPlaceholder, trackingEnabled }

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
    case "cinema":
      return <CinemaEpkTemplate {...props} />
    case "gallery":
      return <GalleryEpkTemplate {...props} />
    case "luxe":
      return <LuxeEpkTemplate {...props} />
    case "poster":
      return <PosterEpkTemplate {...props} />
    case "coastal":
      return <CoastalEpkTemplate {...props} />
    case "scrapbook":
      return <ScrapbookEpkTemplate {...props} />
    case "bandcard":
      return <BandCardEpkTemplate {...props} />
    case "dossier":
      return <DossierEpkTemplate {...props} />
    case "pressgrid":
      return <PressGridEpkTemplate {...props} />
    case "redcolumn":
      return <RedColumnEpkTemplate {...props} />
    case "checkerboard":
      return <CheckerboardEpkTemplate {...props} />
    case "editorial":
      return <EditorialEpkTemplate {...props} />
    case "whitespace":
      return <WhitespaceEpkTemplate {...props} />
    case "colorblock":
      return <ColorBlockEpkTemplate {...props} />
    case "sunburst":
      return <SunburstEpkTemplate {...props} />
    default:
      return <ModernEpkTemplate {...props} />
  }
}
