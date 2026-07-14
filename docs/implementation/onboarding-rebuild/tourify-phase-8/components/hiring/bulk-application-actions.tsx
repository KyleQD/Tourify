"use client"

import { CheckCircle, Clock, Loader2, Star, XCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface BulkApplicationActionsProps {
  selectedCount: number
  isSubmitting?: boolean
  onApproveSelected: () => void
  onRejectSelected: () => void
  onShortlistSelected: () => void
  onWaitlistSelected: () => void
  onClearSelection: () => void
  className?: string
}

export function BulkApplicationActions({
  selectedCount,
  isSubmitting = false,
  onApproveSelected,
  onRejectSelected,
  onShortlistSelected,
  onWaitlistSelected,
  onClearSelection,
  className,
}: BulkApplicationActionsProps) {
  if (selectedCount === 0) return null

  return (
    <div className={cn("flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-950 p-3 sm:flex-row sm:items-center sm:justify-between", className)}>
      <p className="text-sm text-slate-300">
        <span className="font-semibold text-white">{selectedCount}</span> application{selectedCount === 1 ? "" : "s"} selected
      </p>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={onApproveSelected} disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700">
          {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
          Approve
        </Button>
        <Button size="sm" variant="outline" onClick={onShortlistSelected} disabled={isSubmitting}>
          <Star className="mr-2 h-4 w-4" />
          Shortlist
        </Button>
        <Button size="sm" variant="outline" onClick={onWaitlistSelected} disabled={isSubmitting}>
          <Clock className="mr-2 h-4 w-4" />
          Waitlist
        </Button>
        <Button size="sm" variant="destructive" onClick={onRejectSelected} disabled={isSubmitting}>
          <XCircle className="mr-2 h-4 w-4" />
          Reject
        </Button>
        <Button size="sm" variant="ghost" onClick={onClearSelection} disabled={isSubmitting}>
          Clear
        </Button>
      </div>
    </div>
  )
}
