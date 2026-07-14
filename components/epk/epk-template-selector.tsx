"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Layout, Eye, X, CheckCircle } from "lucide-react"
import type { EPKData } from "@/lib/services/epk.service"
import EPKPreview from "@/components/epk/epk-preview"
import { epkSurface } from "@/components/epk/epk-ui-styles"

interface EpkTemplateSelectorProps {
  selectedTemplate: string
  onTemplateChange: (template: string) => void
  epkData: EPKData
}

const TEMPLATES = [
  {
    id: 'modern',
    name: 'Modern',
    description: 'Sleek gradients with premium aesthetics',
    colors: ['from-indigo-600', 'via-purple-600', 'to-pink-600'],
    accent: 'bg-purple-400',
  },
  {
    id: 'classic',
    name: 'Classic',
    description: 'Warm editorial layout for press and bookers',
    colors: ['from-orange-500', 'via-pink-500', 'to-purple-600'],
    accent: 'bg-orange-400',
  },
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Clean monochrome with subtle depth',
    colors: ['from-gray-50', 'via-white', 'to-gray-100'],
    accent: 'bg-gray-600',
  },
  {
    id: 'bold',
    name: 'Bold',
    description: 'Electric highlights and strong contrast',
    colors: ['from-blue-900', 'via-cyan-800', 'to-teal-700'],
    accent: 'bg-cyan-400',
  },
  {
    id: 'black',
    name: 'Black',
    description: 'Pure black with neon accents (maps to Minimal)',
    colors: ['from-black', 'via-gray-900', 'to-black'],
    accent: 'bg-green-400',
  },
  {
    id: 'neon',
    name: 'Neon',
    description: 'Electric blue highlights (maps to Bold)',
    colors: ['from-blue-950', 'via-cyan-900', 'to-teal-900'],
    accent: 'bg-cyan-400',
  },
  {
    id: 'sunset',
    name: 'Sunset',
    description: 'Warm orange to pink (maps to Classic)',
    colors: ['from-orange-900', 'via-pink-900', 'to-purple-900'],
    accent: 'bg-orange-400',
  },
  {
    id: 'cinema',
    name: 'Cinema',
    description: 'Letterbox charcoal with silver platinum type',
    colors: ['from-zinc-950', 'via-zinc-900', 'to-black'],
    accent: 'bg-zinc-300',
  },
  {
    id: 'gallery',
    name: 'Gallery',
    description: 'Museum white with airy editorial space',
    colors: ['from-neutral-100', 'via-white', 'to-neutral-50'],
    accent: 'bg-neutral-800',
  },
  {
    id: 'luxe',
    name: 'Luxe',
    description: 'Deep navy with champagne gold accents',
    colors: ['from-[#0a1628]', 'via-[#0d1c32]', 'to-[#081220]'],
    accent: 'bg-[#c9a962]',
  },
  {
    id: 'poster',
    name: 'Poster',
    description: 'Concert ink with coral stamp energy',
    colors: ['from-[#140808]', 'via-[#1a0c0c]', 'to-[#5c1a1a]'],
    accent: 'bg-[#f07167]',
  },
  {
    id: 'coastal',
    name: 'Coastal',
    description: 'Soft sage sand with calm teal accents',
    colors: ['from-[#e8efe9]', 'via-[#dff0e8]', 'to-[#c5e0d6]'],
    accent: 'bg-[#2d6a5a]',
  },
] as const

export function EpkTemplateSelector({
  selectedTemplate,
  onTemplateChange,
  epkData,
}: EpkTemplateSelectorProps) {
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [previewTemplate, setPreviewTemplate] = useState('')

  function handlePreviewClick(templateId: string) {
    setPreviewTemplate(templateId)
    setShowPreviewModal(true)
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
            Choose your EPK&apos;s visual style
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 p-4 pt-0">
          {TEMPLATES.map((template) => (
            <div
              key={template.id}
              className={`relative cursor-pointer rounded-xl border-2 p-2.5 transition-all ${
                selectedTemplate === template.id
                  ? 'border-purple-500 bg-purple-500/10'
                  : 'border-gray-800 hover:border-gray-600'
              }`}
              onClick={() => onTemplateChange(template.id)}
            >
              <div
                className={`relative mb-2 h-20 overflow-hidden rounded-xl bg-gradient-to-br p-2.5 shadow-lg ${template.colors.join(' ')}`}
              >
                <div className="mb-2 flex items-center gap-2">
                  <div className="h-5 w-5 rounded-full border-2 border-white/40 bg-white/20 shadow-md" />
                  <div className="h-2 w-20 rounded-full bg-white/40 shadow-sm" />
                </div>
                <div className="space-y-1">
                  <div className="h-1.5 w-24 rounded-full bg-white/30 shadow-sm" />
                  <div className="h-1 w-16 rounded-full bg-white/25" />
                </div>
                <div className={`absolute bottom-2 right-2 h-2 w-2 rounded-full shadow-lg ${template.accent}`} />
                {selectedTemplate === template.id && (
                  <div className="absolute right-2 top-2">
                    <CheckCircle className="h-5 w-5 text-purple-400 drop-shadow-lg" />
                  </div>
                )}
              </div>
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-sm font-medium text-white">{template.name}</h4>
                  <p className="text-xs text-gray-400">{template.description}</p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation()
                    handlePreviewClick(template.id)
                  }}
                  className="h-auto p-1 text-gray-400 hover:text-white"
                >
                  <Eye className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}

          <div className="border-t border-gray-800/80 pt-3">
            <Button
              size="sm"
              variant="outline"
              className="w-full rounded-xl border-gray-700/80 bg-transparent text-xs text-white hover:bg-white/5"
              onClick={() => handlePreviewClick(selectedTemplate)}
            >
              <Eye className="mr-2 h-3 w-3" />
              Preview Current Template
            </Button>
          </div>
        </CardContent>
      </Card>

      {showPreviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <Card className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-gray-800/80 shadow-2xl">
            <CardHeader className="bg-gradient-to-br from-[#191c24] to-[#23263a] text-white">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>
                    Template Preview: {TEMPLATES.find((t) => t.id === previewTemplate)?.name}
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    See how your EPK will look with this template
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      onTemplateChange(previewTemplate)
                      setShowPreviewModal(false)
                    }}
                    className="bg-purple-600 text-white hover:bg-purple-700"
                  >
                    Select Template
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowPreviewModal(false)}
                    className="rounded-xl border-gray-700/80 text-white hover:bg-white/5"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="overflow-hidden p-0">
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
