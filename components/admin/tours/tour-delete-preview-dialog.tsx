"use client"

/**
 * TOUR-208 — Safe draft deletion eligibility preview + confirm.
 */

import { useCallback, useEffect, useState } from "react"
import { Trash2, Ban, Unlink } from "lucide-react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useActingContext } from "@/hooks/use-acting-context"
import type { TourDeletePreview } from "@/lib/admin/tour-delete-eligibility"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  tourId: string
  tourName?: string
  onDeleted?: () => void
}

export function TourDeletePreviewDialog({
  open,
  onOpenChange,
  tourId,
  tourName,
  onDeleted,
}: Props) {
  const { actingHeaders, isActingReady } = useActingContext()
  const [preview, setPreview] = useState<TourDeletePreview | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const loadPreview = useCallback(async () => {
    if (!isActingReady || !tourId) return
    setIsLoading(true)
    try {
      const response = await fetch(`/api/admin/tours/${tourId}/delete-preview`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", ...actingHeaders },
        body: JSON.stringify({}),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || "Failed to load delete preview")
      setPreview(payload.preview as TourDeletePreview)
    } catch (error) {
      setPreview(null)
      toast.error(error instanceof Error ? error.message : "Failed to load delete preview")
    } finally {
      setIsLoading(false)
    }
  }, [actingHeaders, isActingReady, tourId])

  useEffect(() => {
    if (!open) return
    setPreview(null)
    void loadPreview()
  }, [loadPreview, open])

  async function confirmDelete() {
    if (!preview?.canDelete) return
    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/admin/tours/${tourId}`, {
        method: "DELETE",
        credentials: "include",
        headers: { ...actingHeaders },
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        const detail = Array.isArray(payload.blockers)
          ? payload.blockers.map((row: { label?: string }) => row.label).filter(Boolean).join(" · ")
          : payload.error
        throw new Error(detail || "Failed to delete tour")
      }
      toast.success(
        payload.detachedEventLinks
          ? `Tour deleted (${payload.detachedEventLinks} event link(s) detached)`
          : "Tour deleted",
      )
      onOpenChange(false)
      onDeleted?.()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete tour")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg border-slate-700 bg-slate-800">
        <DialogHeader>
          <DialogTitle className="text-white">Delete tour — eligibility</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-slate-300">
            Permanently delete {tourName ? <span className="font-medium text-white">{tourName}</span> : "this tour"}?
            Linked events are detached, never cascade-deleted.
          </p>

          {isLoading ? (
            <p className="text-sm text-slate-400">Checking eligibility…</p>
          ) : preview ? (
            <>
              {!preview.canDelete ? (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-100">
                  Hard delete is blocked. Archive or clear references instead.
                </div>
              ) : (
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
                  Draft is eligible for hard delete.
                </div>
              )}

              {preview.willDetachEventLinks > 0 ? (
                <div className="flex items-start gap-2 text-sm text-slate-300">
                  <Unlink className="mt-0.5 h-4 w-4 text-sky-400" />
                  <span>
                    Will detach {preview.willDetachEventLinks} tour↔event link(s). Event records stay.
                  </span>
                </div>
              ) : null}

              {preview.blockers.length > 0 ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-200">
                    <Ban className="h-4 w-4 text-red-400" />
                    Blockers
                    <Badge variant="secondary" className="bg-slate-700 text-slate-200">
                      {preview.blockers.length}
                    </Badge>
                  </div>
                  <ul className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-slate-700 bg-slate-900/40 p-2">
                    {preview.blockers.map((row) => (
                      <li key={row.id} className="text-xs text-slate-300">
                        <span className="font-medium text-slate-100">{row.label}</span>
                        {typeof row.count === "number" ? (
                          <span className="text-slate-500"> · {row.count}</span>
                        ) : null}
                        <p className="text-slate-500">{row.detail}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </>
          ) : (
            <p className="text-sm text-slate-500">Eligibility preview unavailable.</p>
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
            variant="destructive"
            disabled={!preview?.canDelete || isLoading || isSubmitting}
            onClick={() => void confirmDelete()}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {isSubmitting ? "Deleting…" : "Confirm delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
