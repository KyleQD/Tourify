"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { endOfMonth, format } from "date-fns"
import { Ban, CalendarOff, CheckCircle2, Loader2, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export interface AvailabilityBlockRow {
  id: string
  venue_id: string
  date: string
  is_available: boolean | null
  blocked_reason: string | null
  notes: string | null
}

interface VenueAvailabilityEditorProps {
  venueId: string
  /** Visible month; block list is scoped to this window. */
  month: Date
  /** Date selected on the calendar; the editor blocks/clears this date. */
  selectedDate: Date | null
  /** Called after any successful mutation so the calendar can refresh. */
  onChanged?: () => void
}

async function availabilityRequest(path: string, init?: RequestInit) {
  const response = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(payload?.error || `Availability request failed (${response.status})`)
  }
  return payload
}

/**
 * VENUE-004 — venue availability block editor.
 *
 * Venue-scoped manager surface wired into the dashboard calendar. All reads and
 * writes go through `/api/venue/availability` (server-side venue scope check);
 * the editor never writes raw `venue_availability` rows directly.
 */
export function VenueAvailabilityEditor({
  venueId,
  month,
  selectedDate,
  onChanged,
}: VenueAvailabilityEditorProps) {
  const [rows, setRows] = useState<AvailabilityBlockRow[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reason, setReason] = useState("")
  const [notes, setNotes] = useState("")
  const [notice, setNotice] = useState<string | null>(null)

  const from = format(month, "yyyy-MM-01")
  // VENUE-004: always fetch the full visible month. `month` may be mid-month
  // (initial view) or the 1st (after month navigation), so bound `to` on the
  // last day of the month instead of the day-of-month of the `month` value.
  const to = format(endOfMonth(month), "yyyy-MM-dd")

  const refresh = useCallback(async () => {
    if (!venueId) return
    setIsLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ venue_id: venueId, from, to })
      const payload = await availabilityRequest(`/api/venue/availability?${params.toString()}`)
      setRows((payload?.data ?? []) as AvailabilityBlockRow[])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load availability")
    } finally {
      setIsLoading(false)
    }
  }, [venueId, from, to])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const selectedDateKey = selectedDate ? format(selectedDate, "yyyy-MM-dd") : null
  const selectedBlock = useMemo(
    () => rows.find((row) => row.date === selectedDateKey && row.is_available === false) ?? null,
    [rows, selectedDateKey],
  )

  // Prefill the form whenever the selected block changes.
  useEffect(() => {
    setReason(selectedBlock?.blocked_reason ?? "")
    setNotes(selectedBlock?.notes ?? "")
  }, [selectedDateKey, selectedBlock?.id])

  const blocks = useMemo(
    () =>
      rows
        .filter((row) => row.is_available === false)
        .sort((a, b) => (a.date < b.date ? -1 : 1)),
    [rows],
  )

  const runMutation = async (action: () => Promise<unknown>) => {
    if (!venueId || !selectedDateKey) return
    setIsSubmitting(true)
    setError(null)
    setNotice(null)
    try {
      await action()
      setNotice("Availability updated.")
      await refresh()
      onChanged?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Availability update failed")
    } finally {
      setIsSubmitting(false)
    }
  }

  const blockSelectedDate = () => {
    if (!selectedDateKey) return
    void runMutation(() =>
      availabilityRequest("/api/venue/availability", {
        method: "POST",
        body: JSON.stringify({
          venueId,
          date: selectedDateKey,
          isAvailable: false,
          blockedReason: reason,
          notes,
        }),
      }),
    )
  }

  // VENUE-004: keep an existing block editable (reason/notes) via the PATCH
  // path — the row venue is resolved server-side before the update.
  const updateSelectedBlock = () => {
    if (!selectedDateKey || !selectedBlock) return
    void runMutation(() =>
      availabilityRequest("/api/venue/availability", {
        method: "PATCH",
        body: JSON.stringify({
          id: selectedBlock.id,
          isAvailable: false,
          blockedReason: reason,
          notes,
        }),
      }),
    )
  }

  const clearBlock = (date: string) => {
    const params = new URLSearchParams({ venue_id: venueId, date })
    void runMutation(() =>
      availabilityRequest(`/api/venue/availability?${params.toString()}`, { method: "DELETE" }),
    )
  }

  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarOff className="h-4 w-4 text-red-400" /> Availability
        </CardTitle>
        <CardDescription>Block dates or open them for booking requests.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? (
          <div className="rounded-md border border-red-500/30 bg-red-500/10 p-3">
            <p className="text-sm text-red-300">{error}</p>
          </div>
        ) : null}
        {notice ? (
          <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3">
            <p className="flex items-center gap-2 text-sm text-emerald-300">
              <CheckCircle2 className="h-4 w-4" /> {notice}
            </p>
          </div>
        ) : null}

        {selectedDateKey ? (
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium">{format(selectedDate as Date, "EEE, MMM d, yyyy")}</p>
              {selectedBlock ? (
                <Badge className="mt-1 bg-red-900/40 text-red-300 border-red-500/40">Blocked</Badge>
              ) : (
                <Badge className="mt-1 bg-gray-800 text-gray-300 border-gray-700">Open</Badge>
              )}
            </div>

            {selectedBlock ? (
              <div className="space-y-2 text-sm">
                {selectedBlock.blocked_reason ? (
                  <p className="text-gray-300">
                    <span className="text-gray-500">Reason:</span> {selectedBlock.blocked_reason}
                  </p>
                ) : null}
                {selectedBlock.notes ? (
                  <p className="text-gray-300">
                    <span className="text-gray-500">Notes:</span> {selectedBlock.notes}
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="block-reason">Block reason (optional)</Label>
                <Input
                  id="block-reason"
                  value={reason}
                  maxLength={500}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="e.g. Maintenance, private event"
                  className="border-gray-700 bg-gray-950"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="block-notes">Notes (optional)</Label>
                <Textarea
                  id="block-notes"
                  value={notes}
                  maxLength={2000}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Internal notes for your team"
                  className="border-gray-700 bg-gray-950"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedBlock ? (
                  <Button
                    size="sm"
                    className="bg-red-600 text-white hover:bg-red-700"
                    disabled={isSubmitting}
                    onClick={updateSelectedBlock}
                  >
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Update block
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    className="bg-red-600 text-white hover:bg-red-700"
                    disabled={isSubmitting}
                    onClick={blockSelectedDate}
                  >
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
                    Block date
                  </Button>
                )}
                {selectedBlock ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-gray-700"
                    disabled={isSubmitting}
                    onClick={() => clearBlock(selectedDateKey)}
                  >
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    <span className="flex items-center gap-1.5">
                      <Trash2 className="h-4 w-4" /> Clear block
                    </span>
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-400">Select a date on the calendar to block or open it.</p>
        )}

        <div className="border-t border-gray-800 pt-3">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
            Blocked this month ({blocks.length})
          </p>
          {isLoading ? (
            <p className="flex items-center gap-2 text-sm text-gray-400">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </p>
          ) : blocks.length === 0 ? (
            <p className="text-sm text-gray-500">No blocked dates this month.</p>
          ) : (
            <ul className="space-y-2">
              {blocks.slice(0, 8).map((block) => (
                <li key={block.id} className="flex items-start justify-between gap-2 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium">{format(new Date(`${block.date}T12:00:00`), "EEE, MMM d")}</p>
                    {block.blocked_reason ? (
                      <p className="truncate text-gray-400">{block.blocked_reason}</p>
                    ) : null}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-gray-400 hover:text-red-300"
                    disabled={isSubmitting}
                    onClick={() => clearBlock(block.date)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span className="sr-only">Clear {block.date}</span>
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  )
}