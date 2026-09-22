/**
 * PLAN-104 — Reconciliation preview (relational + downstream consequences).
 */

import type { TourStopReconcilePlan } from "@/lib/admin/tour-stop-reconciliation"

export interface TourReconcilePreviewStop {
  event_id: string
  name: string
  date?: string | null
  venue?: string | null
  ordinal?: number
}

export interface TourReconcileDownstreamImpact {
  kind: "link_detach" | "reorder" | "date_change" | "venue_change" | "protected_conflict"
  severity: "info" | "warning" | "blocking"
  event_id: string | null
  summary: string
}

export interface TourReconcilePreview {
  mode: TourStopReconcilePlan["mode"]
  additions: TourReconcilePreviewStop[]
  modifications: Array<TourReconcilePreviewStop & { fields: string[] }>
  reorders: boolean
  detachments: TourReconcilePreviewStop[]
  protectedConflicts: Array<{ event_id: string; reason: string }>
  downstream: TourReconcileDownstreamImpact[]
  requiresConfirmation: boolean
}

export interface BuildTourReconcilePreviewInput {
  reconciliation: TourStopReconcilePlan
  currentStops: TourReconcilePreviewStop[]
  desiredStops: TourReconcilePreviewStop[]
  /** Event IDs that must not be detached (published/ticketed/settled/etc.). */
  protectedEventIds?: string[]
  protectedReasons?: Record<string, string>
}

function byId(stops: TourReconcilePreviewStop[]): Map<string, TourReconcilePreviewStop> {
  return new Map(stops.map((stop) => [stop.event_id, stop]))
}

/**
 * Build a human/UI-ready preview from a planned reconciliation.
 * Does not mutate data.
 */
export function buildTourReconcilePreview(
  input: BuildTourReconcilePreviewInput,
): TourReconcilePreview {
  const current = byId(input.currentStops)
  const desired = byId(input.desiredStops)
  const protectedSet = new Set(input.protectedEventIds || [])

  const additions = input.reconciliation.addedEventIds.map((eventId) => {
    const stop = desired.get(eventId)
    return {
      event_id: eventId,
      name: stop?.name || "New stop",
      date: stop?.date ?? null,
      venue: stop?.venue ?? null,
      ordinal: stop?.ordinal,
    }
  })

  const modifications: TourReconcilePreview["modifications"] = []
  for (const eventId of input.reconciliation.updatedEventIds) {
    const before = current.get(eventId)
    const after = desired.get(eventId)
    if (!before || !after) continue
    const fields: string[] = []
    if ((before.name || "") !== (after.name || "")) fields.push("name")
    if ((before.date || "") !== (after.date || "")) fields.push("date")
    if ((before.venue || "") !== (after.venue || "")) fields.push("venue")
    if ((before.ordinal ?? 0) !== (after.ordinal ?? 0)) fields.push("ordinal")
    if (fields.length) {
      modifications.push({
        event_id: eventId,
        name: after.name || before.name,
        date: after.date ?? null,
        venue: after.venue ?? null,
        ordinal: after.ordinal,
        fields,
      })
    }
  }

  const detachments = input.reconciliation.detachEventIds.map((eventId) => {
    const stop = current.get(eventId)
    return {
      event_id: eventId,
      name: stop?.name || "Detached stop",
      date: stop?.date ?? null,
      venue: stop?.venue ?? null,
      ordinal: stop?.ordinal,
    }
  })

  const protectedConflicts = detachments
    .filter((stop) => protectedSet.has(stop.event_id))
    .map((stop) => ({
      event_id: stop.event_id,
      reason:
        input.protectedReasons?.[stop.event_id]
        || "Stop is protected (published, ticketed, contracted, or settled).",
    }))

  const downstream: TourReconcileDownstreamImpact[] = []

  for (const stop of detachments) {
    downstream.push({
      kind: "link_detach",
      severity: protectedSet.has(stop.event_id) ? "blocking" : "warning",
      event_id: stop.event_id,
      summary: `Detach “${stop.name}” from this tour. The event record stays; staffing/ticketing links on the event are unchanged.`,
    })
  }

  if (input.reconciliation.orderChanged) {
    downstream.push({
      kind: "reorder",
      severity: "info",
      event_id: null,
      summary: "Stop order will change. Route legs and day sheets that follow ordinal may recompute.",
    })
  }

  for (const mod of modifications) {
    if (mod.fields.includes("date")) {
      downstream.push({
        kind: "date_change",
        severity: "warning",
        event_id: mod.event_id,
        summary: `Date change on “${mod.name}” may invalidate holds, travel windows, and published schedules.`,
      })
    }
    if (mod.fields.includes("venue")) {
      downstream.push({
        kind: "venue_change",
        severity: "warning",
        event_id: mod.event_id,
        summary: `Venue change on “${mod.name}” may invalidate holds and site-map assignments.`,
      })
    }
  }

  for (const conflict of protectedConflicts) {
    downstream.push({
      kind: "protected_conflict",
      severity: "blocking",
      event_id: conflict.event_id,
      summary: conflict.reason,
    })
  }

  const requiresConfirmation =
    detachments.length > 0
    || modifications.some((mod) => mod.fields.includes("date") || mod.fields.includes("venue"))
    || protectedConflicts.length > 0
    || input.reconciliation.orderChanged

  return {
    mode: input.reconciliation.mode,
    additions,
    modifications,
    reorders: input.reconciliation.orderChanged,
    detachments,
    protectedConflicts,
    downstream,
    requiresConfirmation,
  }
}
