"use client"

/**
 * TOUR-205 — Selectable deep-duplicate preview dialog.
 */

import { useCallback, useEffect, useState } from "react"
import { Copy, AlertTriangle, Link2, Ban } from "lucide-react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useActingContext } from "@/hooks/use-acting-context"
import {
  DEFAULT_TOUR_DUPLICATE_SELECTION,
  TOUR_DUPLICATE_DOMAINS,
  type TourDuplicateDomain,
  type TourDuplicateDomainSelection,
  type TourDuplicatePreview,
  type TourDuplicatePreviewItem,
} from "@/lib/admin/tour-duplicate-preview"

const DOMAIN_LABELS: Record<TourDuplicateDomain, string> = {
  metadata: "Metadata",
  events: "Stops / events",
  team_roles: "Team roles",
  vendors: "Vendors",
  templates: "Templates",
  budgets: "Budgets",
  documents: "Documents",
  logistics_skeletons: "Logistics skeletons",
  permissions: "Permissions",
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  tourId: string
  sourceName: string
  onConfirmPlan?: (preview: TourDuplicatePreview) => void
}

function PreviewList({
  title,
  icon,
  items,
  empty,
}: {
  title: string
  icon: React.ReactNode
  items: TourDuplicatePreviewItem[]
  empty: string
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium text-slate-200">
        {icon}
        {title}
        <Badge variant="secondary" className="bg-slate-700 text-slate-200">
          {items.length}
        </Badge>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-slate-500">{empty}</p>
      ) : (
        <ul className="max-h-36 space-y-1 overflow-y-auto rounded-lg border border-slate-700 bg-slate-900/40 p-2">
          {items.map((row, index) => (
            <li key={`${row.domain}-${row.label}-${index}`} className="text-xs text-slate-300">
              <span className="font-medium text-slate-100">{row.label}</span>
              {typeof row.count === "number" ? (
                <span className="text-slate-500"> · {row.count}</span>
              ) : null}
              <p className="text-slate-500">{row.detail}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function TourDuplicatePreviewDialog({
  open,
  onOpenChange,
  tourId,
  sourceName,
  onConfirmPlan,
}: Props) {
  const { actingHeaders, isActingReady } = useActingContext()
  const [selection, setSelection] = useState<TourDuplicateDomainSelection>({
    ...DEFAULT_TOUR_DUPLICATE_SELECTION,
  })
  const [proposedName, setProposedName] = useState(`${sourceName} (Copy)`)
  const [preview, setPreview] = useState<TourDuplicatePreview | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const loadPreview = useCallback(async () => {
    if (!isActingReady || !tourId) return
    setIsLoading(true)
    try {
      const response = await fetch(`/api/admin/tours/${tourId}/duplicate-preview`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...actingHeaders,
        },
        body: JSON.stringify({ selection, proposedName }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || "Failed to load duplicate preview")
      setPreview(payload.preview as TourDuplicatePreview)
    } catch (error) {
      setPreview(null)
      toast.error(error instanceof Error ? error.message : "Failed to load duplicate preview")
    } finally {
      setIsLoading(false)
    }
  }, [actingHeaders, isActingReady, proposedName, selection, tourId])

  useEffect(() => {
    if (!open) return
    setProposedName(`${sourceName} (Copy)`)
    setSelection({ ...DEFAULT_TOUR_DUPLICATE_SELECTION })
  }, [open, sourceName])

  useEffect(() => {
    if (!open) return
    const handle = window.setTimeout(() => {
      void loadPreview()
    }, 250)
    return () => window.clearTimeout(handle)
  }, [loadPreview, open])

  function toggleDomain(domain: TourDuplicateDomain, checked: boolean) {
    if (domain === "metadata") return
    setSelection((prev) => ({ ...prev, [domain]: checked }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto border-slate-700 bg-slate-800">
        <DialogHeader>
          <DialogTitle className="text-white">Duplicate tour — preview plan</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-slate-300">Proposed name</Label>
            <Input
              value={proposedName}
              onChange={(event) => setProposedName(event.target.value)}
              className="border-slate-600 bg-slate-900 text-white"
            />
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            {TOUR_DUPLICATE_DOMAINS.map((domain) => (
              <label
                key={domain}
                className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/40 px-3 py-2 text-sm text-slate-200"
              >
                <Checkbox
                  checked={selection[domain]}
                  disabled={domain === "metadata"}
                  onCheckedChange={(value) => toggleDomain(domain, value === true)}
                />
                {DOMAIN_LABELS[domain]}
              </label>
            ))}
          </div>

          {isLoading ? (
            <p className="text-sm text-slate-400">Building preview…</p>
          ) : preview ? (
            <div className="grid gap-4 md:grid-cols-2">
              <PreviewList
                title="Copies"
                icon={<Copy className="h-4 w-4 text-emerald-400" />}
                items={preview.copies}
                empty="Nothing selected to copy."
              />
              <PreviewList
                title="Links"
                icon={<Link2 className="h-4 w-4 text-sky-400" />}
                items={preview.links}
                empty="No shared links."
              />
              <PreviewList
                title="Exclusions"
                icon={<Ban className="h-4 w-4 text-slate-400" />}
                items={preview.exclusions}
                empty="No exclusions."
              />
              <PreviewList
                title="Conflicts"
                icon={<AlertTriangle className="h-4 w-4 text-amber-400" />}
                items={preview.conflicts}
                empty="No conflicts."
              />
            </div>
          ) : (
            <p className="text-sm text-slate-500">Preview unavailable.</p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            className="border-slate-600 text-slate-300"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            className="bg-indigo-600 hover:bg-indigo-700"
            disabled={!preview || isLoading}
            onClick={() => {
              if (!preview) return
              onConfirmPlan?.(preview)
            }}
          >
            {preview?.requiresConfirmation ? "Confirm plan" : "Use this plan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
