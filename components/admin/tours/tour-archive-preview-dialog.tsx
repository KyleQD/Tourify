"use client"

/**
 * TOUR-207 — Archive impact preview + confirm via lifecycle transition.
 */

import { useCallback, useEffect, useState } from "react"
import { Archive, AlertTriangle, Ban, Briefcase, Link2, Shield } from "lucide-react"
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
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useActingContext } from "@/hooks/use-acting-context"
import type { TourArchiveImpactItem, TourArchivePreview } from "@/lib/admin/tour-archive-preview"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  tourId: string
  mode: "archive" | "restore"
  onCompleted?: (result: { toState: string }) => void
}

function ImpactList({
  title,
  icon,
  items,
  empty,
}: {
  title: string
  icon: React.ReactNode
  items: TourArchiveImpactItem[]
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
        <ul className="max-h-32 space-y-1 overflow-y-auto rounded-lg border border-slate-700 bg-slate-900/40 p-2">
          {items.map((row) => (
            <li key={row.id} className="text-xs text-slate-300">
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

export function TourArchivePreviewDialog({
  open,
  onOpenChange,
  tourId,
  mode,
  onCompleted,
}: Props) {
  const { actingHeaders, isActingReady } = useActingContext()
  const [preview, setPreview] = useState<TourArchivePreview | null>(null)
  const [reason, setReason] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const loadPreview = useCallback(async () => {
    if (!isActingReady || !tourId || mode !== "archive") return
    setIsLoading(true)
    try {
      const response = await fetch(`/api/admin/tours/${tourId}/archive-preview`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", ...actingHeaders },
        body: JSON.stringify({}),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || "Failed to load archive preview")
      setPreview(payload.preview as TourArchivePreview)
    } catch (error) {
      setPreview(null)
      toast.error(error instanceof Error ? error.message : "Failed to load archive preview")
    } finally {
      setIsLoading(false)
    }
  }, [actingHeaders, isActingReady, mode, tourId])

  useEffect(() => {
    if (!open) return
    setReason("")
    setPreview(null)
    if (mode === "archive") void loadPreview()
  }, [loadPreview, mode, open])

  async function confirm() {
    if (!isActingReady) return
    if (mode === "restore" && !reason.trim()) {
      toast.error("A reason is required to restore an archived tour")
      return
    }
    if (mode === "archive" && preview && !preview.canArchive) {
      toast.error("Archive is blocked for this tour")
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/admin/tours/${tourId}/transitions/${mode}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", ...actingHeaders },
        body: JSON.stringify({
          reason: reason.trim() || undefined,
        }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || `Failed to ${mode} tour`)
      toast.success(mode === "archive" ? "Tour archived (read-only)" : "Tour restored")
      onOpenChange(false)
      onCompleted?.({ toState: String(payload.toState || (mode === "archive" ? "archived" : "completed")) })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Failed to ${mode} tour`)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto border-slate-700 bg-slate-800">
        <DialogHeader>
          <DialogTitle className="text-white">
            {mode === "archive" ? "Archive tour — impact preview" : "Restore archived tour"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {mode === "archive" ? (
            isLoading ? (
              <p className="text-sm text-slate-400">Building impact preview…</p>
            ) : preview ? (
              <>
                {!preview.canArchive ? (
                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
                    Archive is blocked. Resolve blockers before confirming.
                  </div>
                ) : (
                  <p className="text-sm text-slate-300">
                    Archive makes the tour read-only, revokes eligible shares, and preserves
                    legal/financial records.
                  </p>
                )}
                <div className="grid gap-4 md:grid-cols-2">
                  <ImpactList
                    title="Blockers"
                    icon={<Ban className="h-4 w-4 text-red-400" />}
                    items={preview.blockers}
                    empty="No blockers."
                  />
                  <ImpactList
                    title="Shares (revoke)"
                    icon={<Link2 className="h-4 w-4 text-amber-400" />}
                    items={preview.shares}
                    empty="No active shares to revoke."
                  />
                  <ImpactList
                    title="Jobs"
                    icon={<Briefcase className="h-4 w-4 text-sky-400" />}
                    items={preview.jobs}
                    empty="No open jobs."
                  />
                  <ImpactList
                    title="Upcoming work"
                    icon={<AlertTriangle className="h-4 w-4 text-orange-400" />}
                    items={preview.upcomingWork}
                    empty="No upcoming work flagged."
                  />
                  <ImpactList
                    title="Preserved"
                    icon={<Shield className="h-4 w-4 text-emerald-400" />}
                    items={preview.preserved}
                    empty="No finance/legal rows counted."
                  />
                </div>
              </>
            ) : (
              <p className="text-sm text-slate-500">Preview unavailable.</p>
            )
          ) : (
            <p className="text-sm text-slate-300">
              Restore returns the tour to its pre-archive lifecycle state when available. Revoked
              shares are not re-created.
            </p>
          )}

          <div className="space-y-2">
            <Label className="text-slate-300">
              {mode === "restore" ? "Reason (required)" : "Reason (optional)"}
            </Label>
            <Textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="border-slate-600 bg-slate-900 text-white"
              placeholder={
                mode === "restore"
                  ? "Why is this tour being restored?"
                  : "Optional archive note"
              }
            />
          </div>
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
            className={
              mode === "archive"
                ? "bg-amber-600 hover:bg-amber-700"
                : "bg-indigo-600 hover:bg-indigo-700"
            }
            disabled={
              isSubmitting
              || (mode === "archive" && (!preview || !preview.canArchive || isLoading))
              || (mode === "restore" && !reason.trim())
            }
            onClick={() => void confirm()}
          >
            <Archive className="mr-2 h-4 w-4" />
            {isSubmitting
              ? "Working…"
              : mode === "archive"
                ? "Confirm archive"
                : "Confirm restore"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
