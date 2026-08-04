import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { requireTourAccess } from "@/lib/admin/tour-access.service"
import { buildTourReconcilePreview } from "@/lib/admin/tour-reconcile-preview"
import {
  assertTourStopReconcileMode,
  planTourStopReconciliation,
} from "@/lib/admin/tour-stop-reconciliation"
import { getTourPlanErrorStatus, tourPlanStopSchema } from "@/lib/admin/tour-plan.service"
import { withAdminCapability } from "@/lib/auth/api-auth"

const bodySchema = z.object({
  reconcileMode: z.enum(["exact", "merge", "attach_only"]).optional().default("exact"),
  stops: z.array(tourPlanStopSchema).max(500),
})

function extractTourId(url: string): string | null {
  const segments = new URL(url).pathname.split("/")
  const index = segments.indexOf("tours")
  return index >= 0 ? segments[index + 1] || null : null
}

/** PLAN-104 — preview relational + downstream impact before destructive plan writes. */
export const POST = withAdminCapability("tour.manage", async (request: NextRequest, { supabase, user, admin }) => {
  try {
    const tourId = extractTourId(request.url)
    if (!tourId) return NextResponse.json({ success: false, error: "Missing tour id" }, { status: 400 })

    const parsed = bodySchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 })
    }

    await requireTourAccess({
      supabase,
      userId: user.id,
      tourId,
      orgId: admin.orgId,
    })

    const { data: links, error } = await supabase
      .from("tour_events")
      .select(
        "event_id, ordinal, market, leg_name, advance_status, events_v2(id, title, status, start_at, settings, capacity)",
      )
      .eq("tour_id", tourId)
      .order("ordinal", { ascending: true })
    if (error) throw new Error(error.message)

    const currentStops = (links ?? []).map((link: any, index: number) => {
      const event = link.events_v2 || {}
      const settings = event.settings && typeof event.settings === "object" ? event.settings : {}
      const startAt = event.start_at ? String(event.start_at) : null
      return {
        event_id: String(link.event_id),
        name: String(event.title || `Stop ${index + 1}`),
        date: startAt ? startAt.slice(0, 10) : null,
        venue:
          typeof settings.venue_label === "string"
            ? settings.venue_label
            : typeof settings.venue_name === "string"
              ? settings.venue_name
              : null,
        ordinal: typeof link.ordinal === "number" ? link.ordinal : index,
        status: String(event.status || ""),
      }
    })

    const desiredWithIds = parsed.data.stops.filter((stop: typeof parsed.data.stops[number]) => Boolean(stop.event_id))
    const mode = assertTourStopReconcileMode(parsed.data.reconcileMode)
    const reconciliation = planTourStopReconciliation({
      mode,
      current: currentStops.map((stop: typeof currentStops[number]) => ({
        event_id: stop.event_id,
        ordinal: stop.ordinal ?? 0,
      })),
      desired: desiredWithIds.map((stop: typeof desiredWithIds[number], index: number) => ({
        event_id: String(stop.event_id),
        ordinal: stop.ordinal ?? index,
      })),
    })

    const protectedEventIds = currentStops
      .filter((stop: typeof currentStops[number]) => ["published", "live", "completed", "settled"].includes(String(stop.status || "").toLowerCase()))
      .map((stop: typeof currentStops[number]) => stop.event_id)

    const preview = buildTourReconcilePreview({
      reconciliation,
      currentStops,
      desiredStops: desiredWithIds.map((stop: typeof desiredWithIds[number], index: number) => ({
        event_id: String(stop.event_id),
        name: stop.name,
        date: stop.date,
        venue: stop.venue ?? null,
        ordinal: stop.ordinal ?? index,
      })),
      protectedEventIds,
      protectedReasons: Object.fromEntries(
        protectedEventIds.map((eventId: string) => {
          const stop = currentStops.find((row: typeof currentStops[number]) => row.event_id === eventId)
          return [
            eventId,
            `"${stop?.name || "Stop"}" is ${stop?.status || "protected"} and cannot be silently detached.`,
          ]
        }),
      ),
    })

    return NextResponse.json({ success: true, preview })
  } catch (error: unknown) {
    const status = getTourPlanErrorStatus(error, 500)
    const message = error instanceof Error ? error.message : "Failed to preview reconciliation"
    return NextResponse.json({ success: false, error: message }, { status })
  }
})
