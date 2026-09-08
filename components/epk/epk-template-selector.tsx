"use client"

import React, { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Layout, Eye, X, Check } from "lucide-react"
import type { EPKData } from "@/lib/services/epk.service"
import EPKPreview from "@/components/epk/epk-preview"
import { epkSurface } from "@/components/epk/epk-ui-styles"
import { EPK_REFERENCE_TEMPLATE_OPTIONS } from "@/lib/epk/epk-reference-template-options"
import { cn } from "@/lib/utils"

interface EpkTemplateSelectorProps {
  selectedTemplate: string
  onTemplateChange: (template: string) => void
  epkData: EPKData
}

interface TemplateOption {
  id: string
  name: string
  description: string
}

const SIGNATURE_TEMPLATES: TemplateOption[] = [
  { id: "modern", name: "Modern", description: "Sleek indigo gradients, premium glass surfaces" },
  { id: "classic", name: "Classic", description: "Warm editorial serif for press and bookers" },
  { id: "minimal", name: "Minimal", description: "Monochrome, uppercase micro-type, sharp edges" },
  { id: "bold", name: "Bold", description: "Electric yellow blocks and heavy contrast" },
  { id: "cinema", name: "Cinema", description: "Letterbox charcoal with silver mono type" },
  { id: "gallery", name: "Gallery", description: "Museum white with airy editorial space" },
  { id: "luxe", name: "Luxe", description: "Deep wine with champagne gold accents" },
  { id: "poster", name: "Poster", description: "Concert ink with coral stamp energy" },
  { id: "coastal", name: "Coastal", description: "Soft sage sand with calm teal accents" },
]

const EDITORIAL_TEMPLATES: TemplateOption[] = EPK_REFERENCE_TEMPLATE_OPTIONS.map((t) => ({
  id: t.id,
  name: t.name,
  description: t.description,
}))

const ALL_TEMPLATES: TemplateOption[] = [...SIGNATURE_TEMPLATES, ...EDITORIAL_TEMPLATES]

/**
 * Real, scaled-down render of the actual EPK for a given template so the
 * picker shows exactly what the user will get instead of a fake mockup.
 */
function MiniEpkPreview({
  epkData,
  templateId,
}: {
  epkData: EPKData
  templateId: string
}) {
  const data = useMemo(
    () => ({ ...epkData, template: templateId }),
    [epkData, templateId]
  )
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      {/* Render at full design width, then scale to fit the card thumbnail */}
      <div
        className="absolute left-0 top-0 origin-top-left"
        style={{ width: "400%", transform: "scale(0.25)" }}
      >
        <EPKPreview data={data} template={templateId} />
      </div>
    </div>
  )
}

export function EpkTemplateSelector({
  selectedTemplate,
  onTemplateChange,
  epkData,
}: EpkTemplateSelectorProps) {
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [previewTemplate, setPreviewTemplate] = useState("")

  function handlePreviewClick(templateId: string) {
    setPreviewTemplate(templateId)
    setShowPreviewModal(true)
  }

  function renderTemplateCard(template: TemplateOption) {
    const isSelected = selectedTemplate === template.id
    return (
      <div
        key={template.id}
        role="button"
        tabIndex={0}
        aria-pressed={isSelected}
        className={cn(
          "group relative cursor-pointer overflow-hidden rounded-2xl border text-left transition-all duration-200",
          isSelected
            ? "border-purple-500 ring-2 ring-purple-500/40"
            : "border-white/10 hover:border-white/25"
        )}
        onClick={() => onTemplateChange(template.id)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            onTemplateChange(template.id)
          }
        }}
      >
        {/* Thumbnail */}
        <div className="relative h-32 w-full overflow-hidden bg-black/40">
          <MiniEpkPreview epkData={epkData} templateId={template.id} />
          {/* readability + hover scrim */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
          <div className="pointer-events-none absolute inset-0 bg-black/0 transition-colors duration-200 group-hover:bg-black/10" />

          {isSelected && (
            <div className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-purple-500 shadow-lg shadow-purple-500/40">
              <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
            </div>
          )}

          <Button
            size="sm"
            variant="secondary"
            onClick={(e) => {
              e.stopPropagation()
              handlePreviewClick(template.id)
            }}
            className="absolute bottom-2 right-2 h-7 gap-1.5 rounded-lg border border-white/15 bg-black/55 px-2 text-[11px] text-white opacity-0 backdrop-blur-md transition-opacity duration-200 hover:bg-black/75 group-hover:opacity-100 focus-visible:opacity-100"
          >
            <Eye className="h-3 w-3" />
            Preview
          </Button>
        </div>

        {/* Meta */}
        <div className="bg-[#0d0f18] px-3 py-2.5">
          <h4
            className={cn(
              "text-sm font-semibold tracking-tight",
              isSelected ? "text-purple-200" : "text-white"
            )}
          >
            {template.name}
          </h4>
          <p className="mt-0.5 line-clamp-2 text-[11px] leading-4 text-gray-400">
            {template.description}
          </p>
        </div>
      </div>
    )
  }

  return (
    <>
      <Card className={`${epkSurface} border-white/10`}>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold tracking-tight text-white">
            <Layout className="h-4 w-4 shrink-0 text-purple-400" />
            EPK Template
          </CardTitle>
          <CardDescription className="text-xs text-gray-400">
            Live previews of your EPK in every style
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 p-4 pt-1">
          <div className="space-y-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
              Signature
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {SIGNATURE_TEMPLATES.map(renderTemplateCard)}
            </div>
          </div>

          <div className="space-y-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
              Editorial
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {EDITORIAL_TEMPLATES.map(renderTemplateCard)}
            </div>
          </div>

          <div className="border-t border-white/10 pt-3">
            <Button
              size="sm"
              variant="outline"
              className="w-full rounded-xl border-white/15 bg-transparent text-xs text-white hover:bg-white/5"
              onClick={() => handlePreviewClick(selectedTemplate)}
            >
              <Eye className="mr-2 h-3 w-3" />
              Preview current template full-size
            </Button>
          </div>
        </CardContent>
      </Card>

      {showPreviewModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          onClick={() => setShowPreviewModal(false)}
        >
          <Card
            className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-2xl border border-white/10 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader className="bg-gradient-to-br from-[#191c24] to-[#23263a] text-white">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <CardTitle className="truncate">
                    {ALL_TEMPLATES.find((t) => t.id === previewTemplate)?.name ?? "Template"} preview
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    See how your EPK looks in this style
                  </CardDescription>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      onTemplateChange(previewTemplate)
                      setShowPreviewModal(false)
                    }}
                    className="bg-purple-600 text-white hover:bg-purple-700"
                  >
                    Use this template
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowPreviewModal(false)}
                    className="rounded-xl border-white/15 text-white hover:bg-white/5"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="max-h-[calc(90vh-88px)] overflow-y-auto p-0">
              <EPKPreview
                data={{ ...epkData, template: previewTemplate }}
                template={previewTemplate}
              />
            </CardContent>
          </Card>
        </div>
      )}
    </>
  )
}
