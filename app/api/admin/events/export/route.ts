import { NextRequest, NextResponse } from "next/server"

import {
  AdminTourEventOperationsService,
  getAdminTourEventErrorStatus,
} from "@/lib/admin/tour-event-operations.service"
import { withAdminCapability } from "@/lib/auth/api-auth"

function csvCell(value: unknown) {
  if (value === null || value === undefined) return ""
  const text = String(value)
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

function safeFilename(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 80) || "events"
}

export const GET = withAdminCapability("event.view", async (request: NextRequest, { supabase, user, admin }) => {
  try {
    const url = new URL(request.url)
    const params = new URLSearchParams(url.searchParams)
    params.set("limit", "100")
    params.delete("cursor")

    const rows: any[] = []
    let cursor: string | null = null
    let pageCount = 0
    do {
      if (cursor) params.set("cursor", cursor)
      const result = await AdminTourEventOperationsService.listEventPortfolio({
        supabase,
        userId: user.id,
        orgId: admin.orgId,
        query: params,
        allowedTourIds: admin.scope === "tour_collaborator" ? admin.allowedTourIds : undefined,
      })
      rows.push(...result.events)
      cursor = result.page.nextCursor
      pageCount += 1
    } while (cursor && pageCount < 50)

    const csvRows: unknown[][] = [
      [
        "Name",
        "Date",
        "Time",
        "Venue",
        "Tours",
        "Status",
        "Readiness",
        "Capacity",
        "Tickets Sold",
        "Expected Revenue",
      ],
      ...rows.map((event) => [
        event.name || event.title || "Event",
        event.event_date ? String(event.event_date).slice(0, 10) : "",
        event.event_time || "",
        event.venue_name || "",
        Array.isArray(event.tours) ? event.tours.map((tour: any) => tour.name).filter(Boolean).join("; ") : "",
        event.status || "",
        event.readiness?.score == null ? "" : `${event.readiness.score}%`,
        event.capacity ?? "",
        event.tickets_sold ?? "",
        event.expected_revenue ?? "",
      ]),
    ]

    const csv = csvRows.map((row) => row.map(csvCell).join(",")).join("\r\n")
    const filename = safeFilename(`events-export-${new Date().toISOString().slice(0, 10)}`)
    return new NextResponse(`\uFEFF${csv}`, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}.csv"`,
        "Cache-Control": "private, no-store",
      },
    })
  } catch (error: any) {
    const status = getAdminTourEventErrorStatus(error, 500)
    return NextResponse.json(
      { success: false, error: error.message || "Failed to export events" },
      { status },
    )
  }
})
