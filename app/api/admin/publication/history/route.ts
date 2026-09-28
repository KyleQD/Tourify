import { NextRequest, NextResponse } from "next/server"

import { listPublicationHistory } from "@/lib/admin/publication-lifecycle.service"
import { withAdminCapability } from "@/lib/auth/api-auth"

/** PUB-207 — Authorized publication history (committed / superseded / retracted retained). */
export const GET = withAdminCapability("tour.view", async (request: NextRequest, { supabase, admin }) => {
  if (!admin.orgId) {
    return NextResponse.json({ success: false, error: "Organization required" }, { status: 403 })
  }

  const url = new URL(request.url)
  const tourId = url.searchParams.get("tourId") || undefined
  const eventId = url.searchParams.get("eventId") || undefined
  if (!tourId && !eventId) {
    return NextResponse.json(
      { success: false, error: "tourId or eventId is required" },
      { status: 400 },
    )
  }

  try {
    const rows = await listPublicationHistory({
      supabase,
      orgId: admin.orgId,
      tourId,
      eventId,
      publicationType: url.searchParams.get("publicationType") || undefined,
      limit: Math.min(Number(url.searchParams.get("limit") ?? "50") || 50, 200),
    })
    return NextResponse.json({
      success: true,
      rows,
      correlationId: admin.correlationId,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load history"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
})
