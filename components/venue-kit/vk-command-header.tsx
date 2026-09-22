"use client"
/**
 * VkCommandHeader
 * Status bar + action buttons for the Venue Kit editor.
 * Mirrors EpkCommandHeader from app/artist/epk/page.tsx
 */
import React from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  Globe, LockKeyhole, Clock3, Save, Loader2, Eye,
  Rocket, Link as LinkIcon, Download, EyeOff, Pencil,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { epkSurface } from "@/components/epk/epk-ui-styles"

interface VkCommandHeaderProps {
  venueName: string
  publicUrl: string | null
  lastSavedAt: string | null
  isDirty: boolean
  isPublished: boolean
  isSaving: boolean
  hasSavedVk: boolean
  saveError: string | null
  onSaveDraft: () => void
  onPublish: () => void
  onUnpublish: () => void
  onViewLive?: () => void
  onCopyUrl?: () => void
  onDownloadPdf?: () => void
  /** When shown on /venue/kit, link back to edit; on /venue/edit, link to /venue/kit */
  secondaryLinkHref?: string
  secondaryLinkLabel?: string
}

function formatSavedAt(value: string | null) {
  if (!value) return "Not saved yet"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Saved recently"
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

export default function VkCommandHeader({
  venueName,
  publicUrl,
  lastSavedAt,
  isDirty,
  isPublished,
  isSaving,
  hasSavedVk,
  saveError,
  onSaveDraft,
  onPublish,
  onUnpublish,
  onViewLive,
  onCopyUrl,
  onDownloadPdf,
  secondaryLinkHref,
  secondaryLinkLabel,
}: VkCommandHeaderProps) {
  const statusLabel = isPublished ? "Live" : hasSavedVk ? "Draft saved" : "Unsaved"
  const statusIcon = isPublished ? (
    <Globe className="h-3.5 w-3.5" />
  ) : hasSavedVk ? (
    <LockKeyhole className="h-3.5 w-3.5" />
  ) : (
    <Clock3 className="h-3.5 w-3.5" />
  )

  return (
    <Card className={cn(epkSurface, "mb-5 overflow-hidden rounded-[1.75rem] border-white/10 shadow-2xl shadow-black/30")}>
      <CardContent className="p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* Status column */}
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="truncate text-sm font-semibold text-white">
                {venueName || "Venue Kit"}
              </span>
              <Badge
                variant="outline"
                className={cn(
                  "flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                  isPublished
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                    : hasSavedVk
                    ? "border-amber-500/40 bg-amber-500/10 text-amber-400"
                    : "border-white/10 bg-white/5 text-slate-400"
                )}
              >
                {statusIcon}
                {statusLabel}
              </Badge>
              {isDirty && !isSaving && (
                <span className="text-[11px] text-amber-400/80">Unsaved changes</span>
              )}
              {isSaving && (
                <span className="flex items-center gap-1 text-[11px] text-slate-400">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Saving…
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500">
              {isPublished && publicUrl
                ? `tourify.com${publicUrl}`
                : `Last saved: ${formatSavedAt(lastSavedAt)}`}
            </p>
            {saveError && (
              <p className="text-[11px] text-red-400">{saveError}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Secondary link (Edit ↔ Kit) */}
            {secondaryLinkHref && (
              <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white" asChild>
                <Link href={secondaryLinkHref}>
                  <Pencil className="mr-1.5 h-3.5 w-3.5" />
                  {secondaryLinkLabel ?? "Edit"}
                </Link>
              </Button>
            )}

            {/* Save Draft */}
            <Button
              variant="outline"
              size="sm"
              className="border-white/10 bg-white/5 text-slate-200 hover:bg-white/10 hover:text-white"
              disabled={isSaving || (!isDirty && hasSavedVk)}
              onClick={onSaveDraft}
            >
              {isSaving ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="mr-1.5 h-3.5 w-3.5" />
              )}
              Save Draft
            </Button>

            {/* Publish / Unpublish */}
            {isPublished ? (
              <Button
                variant="outline"
                size="sm"
                className="border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                onClick={onUnpublish}
                disabled={isSaving}
              >
                <EyeOff className="mr-1.5 h-3.5 w-3.5" />
                Unpublish
              </Button>
            ) : (
              <Button
                size="sm"
                className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg hover:from-purple-500 hover:to-indigo-500"
                onClick={onPublish}
                disabled={isSaving}
              >
                <Rocket className="mr-1.5 h-3.5 w-3.5" />
                Publish Kit
              </Button>
            )}

            {/* View Live */}
            {isPublished && publicUrl && (
              <Button
                variant="ghost"
                size="sm"
                className="text-slate-300 hover:text-white"
                onClick={onViewLive}
              >
                <Eye className="mr-1.5 h-3.5 w-3.5" />
                View Live
              </Button>
            )}

            {/* Copy URL */}
            {hasSavedVk && publicUrl && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-slate-400 hover:text-white"
                title="Copy kit link"
                onClick={onCopyUrl}
              >
                <LinkIcon className="h-4 w-4" />
              </Button>
            )}

            {/* Download PDF */}
            {hasSavedVk && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-slate-400 hover:text-white"
                title="Download PDF"
                onClick={onDownloadPdf}
              >
                <Download className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
