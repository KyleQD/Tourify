"use client"

/**
 * TOUR-210 — Bulk command preview + confirm with item-level results.
 */

import { useCallback, useEffect, useState } from "react"
import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useActingContext } from "@/hooks/use-acting-context"
import type { TourBulkExecuteResult, TourBulkPreviewResult } from "@/lib/admin/tour-bulk-command"

type BulkAction = "archive" | "restore" | "cancel" | "delete_drafts"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  tourIds: string[]
  onCompleted?: () => void
}

function buildPayload(action: BulkAction, tourIds: string[], reason: string) {
  if (action === "delete_drafts") {
    return { action: "delete_drafts" as const, tour_ids: tourIds }
  }
  return {
    action: "transition" as const,
    command: action,
    tour_ids: tourIds,
    reason: reason.trim() || null,
  }
}

function actionLabel(action: BulkAction): string {
  switch (action) {
    case "archive":
      return "Archive"
    case "restore":
      return "Restore"
    case "cancel":
      return "Cancel"
    case "delete_drafts":
      return "Delete drafts"
  }
}

export function TourBulkCommandDialog({
  open,
  onOpenChange,
  tourIds,
  onCompleted,
}: Props) {
  const { actingHeaders, isActingReady } = useActingContext()
  const [action, setAction] = useState<BulkAction>("archive")
  const [reason, setReason] = useState("")
  const [preview, setPreview] = useState<TourBulkPreviewResult | null>(null)
  const [result, setResult] = useState<TourBulkExecuteResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const loadPreview = useCallback(async (reasonOverride?: string) => {
    if (!open || !isActingReady || tourIds.length === 0) return
    setIsLoading(true)
    setPreview(null)
    setResult(null)
    try {
      const response = await fetch("/api/admin/tours/bulk-preview", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...actingHeaders,
        },
        body: JSON.stringify(buildPayload(action, tourIds, reasonOverride ?? reason)),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        toast.error(data.error || "Bulk preview failed")
        return
      }
      setPreview(data.preview as TourBulkPreviewResult)
    } finally {
      setIsLoading(false)
    }
  }, [action, actingHeaders, isActingReady, open, reason, tourIds])

  useEffect(() => {
    void loadPreview()
  }, [action, actingHeaders, isActingReady, open, tourIds]) // eslint-disable-line react-hooks/exhaustive-deps -- reason refreshed via Update preview / confirm

  async function confirmExecute() {
    setIsSubmitting(true)
    setResult(null)
    try {
      // Re-preview with current reason so cancel/restore eligibility is current.
      const previewResponse = await fetch("/api/admin/tours/bulk-preview", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...actingHeaders,
        },
        body: JSON.stringify(buildPayload(action, tourIds, reason)),
      })
      const previewData = await previewResponse.json().catch(() => ({}))
      if (!previewResponse.ok || !previewData.preview?.requiresConfirmation) {
        setPreview(previewData.preview ?? null)
        toast.error(previewData.error || "No eligible tours for this command")
        return
      }
      setPreview(previewData.preview)

      const idempotencyKey =
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `bulk-${Date.now()}`
      const response = await fetch("/api/admin/tours/bulk", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
          ...actingHeaders,
        },
        body: JSON.stringify(buildPayload(action, tourIds, reason)),
      })
      const data = await response.json().catch(() => ({}))
      if (response.status === 422 && data.code === "validation_failed") {
        toast.error(data.error || "Idempotency-Key is required")
        return
      }
      if (!response.ok && !data.result) {
        toast.error(data.error || "Bulk execution failed")
        return
      }
      const executeResult = data.result as TourBulkExecuteResult
      setResult(executeResult)
      if (executeResult.partialFailure) {
        toast.warning(
          `Partial failure: ${executeResult.succeeded} succeeded, ${executeResult.failed} failed`,
        )
      } else if (executeResult.failed === 0) {
        toast.success(`${executeResult.succeeded} tour(s) updated`)
      } else {
        toast.error(`All ${executeResult.failed} item(s) failed`)
      }
      onCompleted?.()
    } finally {
      setIsSubmitting(false)
    }
  }

  const needsReason = action === "cancel" || action === "restore"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto border-slate-700 bg-slate-950 text-slate-100">
        <DialogHeader>
          <DialogTitle>Bulk command · {tourIds.length} selected</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Action</Label>
            <Select
              value={action}
              onValueChange={(value: BulkAction) => setAction(value)}
            >
              <SelectTrigger className="border-slate-700 bg-slate-900">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-slate-700 bg-slate-900 text-slate-100">
                <SelectItem value="archive">Archive</SelectItem>
                <SelectItem value="restore">Restore</SelectItem>
                <SelectItem value="cancel">Cancel</SelectItem>
                <SelectItem value="delete_drafts">Delete drafts</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {needsReason ? (
            <div className="space-y-2">
              <Label htmlFor="bulk-reason">Reason (required)</Label>
              <div className="flex gap-2">
                <Input
                  id="bulk-reason"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="Required for this command"
                  className="border-slate-700 bg-slate-900"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void loadPreview(reason)}
                  className="shrink-0"
                >
                  Update preview
                </Button>
              </div>
            </div>
          ) : null}

          {isLoading ? (
            <p className="text-sm text-slate-400">Checking eligibility…</p>
          ) : preview ? (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="border-emerald-500/40 text-emerald-300">
                  {preview.eligibleCount} eligible
                </Badge>
                <Badge variant="outline" className="border-amber-500/40 text-amber-300">
                  {preview.ineligibleCount} ineligible
                </Badge>
              </div>
              <ul className="max-h-48 space-y-2 overflow-y-auto text-sm">
                {preview.items.map((item) => (
                  <li
                    key={item.tourId}
                    className="flex items-start gap-2 rounded-md border border-slate-800 bg-slate-900/60 px-3 py-2"
                  >
                    {item.eligible ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                    ) : (
                      <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                    )}
                    <div>
                      <p className="font-medium text-slate-100">
                        {item.name || item.tourId.slice(0, 8)}
                        {item.status ? (
                          <span className="ml-2 text-xs font-normal text-slate-400">
                            {item.status}
                          </span>
                        ) : null}
                      </p>
                      {!item.eligible && item.message ? (
                        <p className="text-xs text-slate-400">{item.message}</p>
                      ) : null}
                      {item.eligible && item.nextState ? (
                        <p className="text-xs text-slate-400">→ {item.nextState}</p>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {result ? (
            <div className="space-y-2 rounded-md border border-slate-700 bg-slate-900/80 p-3">
              <div className="flex items-center gap-2 text-sm">
                {result.partialFailure ? (
                  <AlertTriangle className="h-4 w-4 text-amber-400" />
                ) : result.failed === 0 ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                ) : (
                  <XCircle className="h-4 w-4 text-rose-400" />
                )}
                <span>
                  {result.succeeded} succeeded · {result.failed} failed
                  {result.partialFailure ? " · partial failure" : ""}
                </span>
              </div>
              <ul className="max-h-32 space-y-1 overflow-y-auto text-xs text-slate-400">
                {result.results.map((row) => (
                  <li key={row.tourId}>
                    {row.ok
                      ? `${row.tourId.slice(0, 8)}… ok${row.toState ? ` → ${row.toState}` : ""}`
                      : `${row.tourId.slice(0, 8)}… ${row.error || row.code || "failed"}`}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button
            disabled={
              isLoading
              || isSubmitting
              || !preview?.requiresConfirmation
              || (needsReason && !reason.trim())
              || Boolean(result && !result.partialFailure && result.failed === 0)
            }
            onClick={() => void confirmExecute()}
          >
            {isSubmitting ? "Running…" : `Confirm ${actionLabel(action)}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
